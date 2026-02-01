import { Server, Upload } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { logger } from '../utils/logger';
import { io } from '../index';

const router = Router();

const TUS_UPLOAD_DIR = process.env.TUS_UPLOAD_DIR || '/tmp/tus-uploads';
const TUS_MAX_SIZE = parseInt(process.env.TUS_MAX_SIZE || '524288000', 10); // 500MB default

// Ensure upload directory exists
fs.mkdir(TUS_UPLOAD_DIR, { recursive: true }).catch((error: any) => {
  logger.error('Failed to create TUS upload directory', { error: error.message, directory: TUS_UPLOAD_DIR });
});

// Create Tus server instance
const tusServer = new Server({
  path: '/api/uploads',
  datastore: new FileStore({
    directory: TUS_UPLOAD_DIR,
  }),
  maxSize: TUS_MAX_SIZE,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateUrl: (_req: any, { proto, host, path: urlPath, id }: any) => {
    return `${proto}://${host}${urlPath}/${id}`;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  namingFunction: (_req: any) => {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUploadFinish: async (_req: any, upload: any) => {
    try {
      await processCompletedUpload(upload);
    } catch (error: any) {
      logger.error('Error processing completed upload', { error: error.message, uploadId: upload.id });
    }
    return {};
  },
});

/**
 * Process a completed Tus upload:
 * 1. Read the uploaded file
 * 2. Process image (original + optimized + thumbnail)
 * 3. Upload all variants to SeaweedFS
 * 4. Create photo record in database
 * 5. Clean up temp file
 */
async function processCompletedUpload(upload: Upload): Promise<void> {
  const metadata = upload.metadata || {};
  logger.info('TUS upload metadata received', { uploadId: upload.id, metadata: JSON.stringify(metadata) });
  
  const eventId = metadata.eventId;
  const filename = metadata.filename || 'upload.jpg';
  const filetype = metadata.filetype || 'image/jpeg';
  const uploadedBy = metadata.uploadedBy || '';
  const categoryId = metadata.categoryId || null;

  logger.info('TUS upload parsed values', { eventId, filename, uploadedBy, categoryId });

  if (!eventId) {
    logger.error('No eventId in upload metadata', { uploadId: upload.id, metadata });
    return;
  }

  const filePath = path.join(TUS_UPLOAD_DIR, upload.id);
  
  try {
    // Read the uploaded file
    const buffer = await fs.readFile(filePath);
    
    // Determine if it's a photo or video
    const isVideo = filetype.startsWith('video/');
    
    if (isVideo) {
      // Video: Upload directly to SeaweedFS (no processing)
      const uploadBytes = BigInt(buffer.length);
      await assertUploadWithinLimit(eventId, uploadBytes);
      
      const storagePath = await storageService.uploadFile(
        eventId,
        filename,
        buffer,
        filetype
      );
      
      await prisma.video.create({
        data: {
          eventId,
          storagePath,
          status: 'PENDING',
          sizeBytes: uploadBytes,
          uploadedBy: uploadedBy || null,
        },
      });
    } else {
      // Photo: Process and create variants
      const processed = await imageProcessor.processImage(buffer);
      
      const uploadBytes = BigInt(
        processed.original.length + 
        processed.optimized.length + 
        processed.thumbnail.length
      );
      await assertUploadWithinLimit(eventId, uploadBytes);
      
      const baseFilename = filename.replace(/\.[^/.]+$/, '');
      const ext = filename.match(/\.[^/.]+$/)?.[0] || '.jpg';
      
      const [storagePath, storagePathOriginal, storagePathThumb] = await Promise.all([
        storageService.uploadFile(eventId, `${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_orig${ext}`, processed.original, filetype),
        storageService.uploadFile(eventId, `${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
      ]);
      
      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,
          storagePathOriginal,
          storagePathThumb,
          categoryId: categoryId || null,
          url: '',
          status: 'PENDING',
          sizeBytes: uploadBytes,
          uploadedBy: uploadedBy || null,
        },
      });
      
      // Update URL
      const updatedPhoto = await prisma.photo.update({
        where: { id: photo.id },
        data: { url: `/api/photos/${photo.id}/file` },
      });
      
      // Emit WebSocket event for real-time updates
      try {
        io.to(`event:${eventId}`).emit('photo_uploaded', {
          photo: {
            ...updatedPhoto,
            sizeBytes: updatedPhoto.sizeBytes?.toString(),
          },
        });
        logger.info('TUS upload WebSocket event emitted', { eventId, photoId: photo.id });
      } catch (wsError: any) {
        logger.warn('Failed to emit WebSocket event for TUS upload', { error: wsError.message });
      }
    }
    
    // Clean up temp file
    await fs.unlink(filePath).catch((error: any) => {
      logger.warn('Failed to cleanup temp file', { error: error.message, filePath });
    });
    // Also clean up .json metadata file if exists
    await fs.unlink(`${filePath}.json`).catch((error: any) => {
      logger.warn('Failed to cleanup temp metadata file', { error: error.message, filePath: `${filePath}.json` });
    });
    
  } catch (error: any) {
    logger.error('Error processing upload', { error: error.message, stack: error.stack, uploadId: upload.id, eventId });
    // Clean up on error
    await fs.unlink(filePath).catch((cleanupError: any) => {
      logger.warn('Failed to cleanup temp file after error', { error: cleanupError.message, filePath });
    });
    await fs.unlink(`${filePath}.json`).catch((cleanupError: any) => {
      logger.warn('Failed to cleanup temp metadata file after error', { error: cleanupError.message, filePath: `${filePath}.json` });
    });
    throw error;
  }
}

// Status endpoint to check if Tus is enabled (must be before Tus handlers)
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    enabled: true,
    maxSize: TUS_MAX_SIZE,
    uploadDir: TUS_UPLOAD_DIR,
  });
});

// Tus protocol handlers (must be after specific routes)
router.all('/', (req: Request, res: Response) => {
  tusServer.handle(req, res);
});

router.all('/:id', (req: Request, res: Response) => {
  tusServer.handle(req, res);
});

export default router;
