import { Server, Upload } from '@tus/server';
import { FileStore } from '@tus/file-store';
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { auditLog, AuditType } from '../services/auditLogger';
import { extractCapturedAtFromImage } from '../services/uploadDatePolicy';
import { selectSmartCategoryId } from '../services/smartAlbum';
import { resolveSmartCategoryId } from '../services/photoCategories';
import { io } from '../index';
import rateLimit from 'express-rate-limit';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

const TUS_UPLOAD_DIR = process.env.TUS_UPLOAD_DIR || '/tmp/tus-uploads';
const TUS_MAX_SIZE = parseInt(process.env.TUS_MAX_SIZE || '104857600', 10); // 100MB default

// Ensure upload directory exists
fs.mkdir(TUS_UPLOAD_DIR, { recursive: true }).catch((error: any) => {
  logger.error('Failed to create TUS upload directory', { error: error.message, directory: TUS_UPLOAD_DIR });
});

// Rate limiter for TUS upload creation (POST)
const tusCreateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // max 30 upload creations per minute per IP
  keyGenerator: (req) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown',
  message: { error: 'Zu viele Uploads. Bitte warte einen Moment.' },
});

/**
 * Validate TUS upload request: check eventId, event existence, and access.
 * Runs on POST (upload creation) via onIncomingRequest hook.
 */
async function validateTusRequest(req: Request): Promise<void> {
  // Only validate on POST (upload creation), not PATCH/HEAD (resume/status)
  if (req.method !== 'POST') return;

  // Extract eventId from Upload-Metadata header
  // Format: "eventId base64val,filename base64val,..."
  const metadataHeader = req.headers['upload-metadata'] as string;
  if (!metadataHeader) {
    throw { status_code: 400, body: 'Upload-Metadata header mit eventId erforderlich' };
  }

  const metaPairs = metadataHeader.split(',').map(p => p.trim());
  let eventId: string | null = null;
  for (const pair of metaPairs) {
    const [key, b64val] = pair.split(/\s+/);
    if (key === 'eventId' && b64val) {
      eventId = Buffer.from(b64val, 'base64').toString('utf-8');
      break;
    }
  }

  if (!eventId) {
    throw { status_code: 400, body: 'eventId in Upload-Metadata erforderlich' };
  }

  // Check event exists and is active
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, hostId: true, deletedAt: true, isActive: true },
  });

  if (!event || event.deletedAt || event.isActive === false) {
    throw { status_code: 404, body: 'Event nicht gefunden oder inaktiv' };
  }

  // Check access: JWT user (host/admin) OR event access cookie (guest)
  const jwtSecret = process.env.JWT_SECRET;
  let userId: string | null = null;
  let userRole: string | null = null;

  // Try auth token from cookie or Authorization header
  const cookies = (req.headers.cookie || '').split(';').reduce((acc: Record<string, string>, c) => {
    const [k, ...v] = c.trim().split('=');
    if (k) acc[k] = v.join('=');
    return acc;
  }, {});
  const authToken = cookies['auth_token'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (authToken && jwtSecret) {
    try {
      const decoded = jwt.verify(authToken, jwtSecret) as any;
      userId = decoded.userId;
      userRole = decoded.role;
    } catch {
      // Token invalid — fall through to event access check
    }
  }

  // Admin/host always allowed
  if (userId && (userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userId === event.hostId)) {
    return;
  }

  // Guest: must have event access cookie
  if (hasEventAccess(req, eventId)) {
    return;
  }

  // Logged-in user who is event member
  if (userId) {
    const member = await prisma.eventMember.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (member) return;
  }

  throw { status_code: 403, body: 'Kein Zugriff auf dieses Event' };
}

// Create Tus server instance
const tusServer = new Server({
  path: '/api/uploads',
  datastore: new FileStore({
    directory: TUS_UPLOAD_DIR,
  }),
  maxSize: TUS_MAX_SIZE,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onIncomingRequest: async (req: any) => {
    await validateTusRequest(req);
  },
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
  const uploadedBy = sanitizeText(metadata.uploadedBy || '');
  const categoryId = metadata.categoryId || null;
  const progressivePhotoId = metadata.photoId || null; // Progressive upload: update existing record

  logger.info('TUS upload parsed values', { eventId, filename, uploadedBy, categoryId, progressivePhotoId });

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
        processed.thumbnail.length +
        processed.webp.length
      );
      await assertUploadWithinLimit(eventId, uploadBytes);
      
      // Extract EXIF capturedAt for smart categorization
      const uploadTime = new Date();
      const capturedAtResult = await extractCapturedAtFromImage(buffer, uploadTime);

      // Smart Album Chain: 1) manual categoryId from metadata, 2) time-window, 3) EXIF fallback
      let resolvedCategoryId = categoryId || null;
      if (!resolvedCategoryId) {
        resolvedCategoryId = await selectSmartCategoryId({
          eventId,
          capturedAt: capturedAtResult.capturedAt,
          isGuest: true, // TUS uploads are typically from guests
        });
      }
      if (!resolvedCategoryId && !categoryId) {
        resolvedCategoryId = await resolveSmartCategoryId(eventId, {
          dateTime: capturedAtResult.capturedAt,
        });
      }

      const baseFilename = filename.replace(/\.[^/.]+$/, '');
      const ext = filename.match(/\.[^/.]+$/)?.[0] || '.jpg';
      
      const [storagePath, storagePathOriginal, storagePathThumb, storagePathWebp] = await Promise.all([
        storageService.uploadFile(eventId, `${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_orig${ext}`, processed.original, filetype),
        storageService.uploadFile(eventId, `${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_webp.webp`, processed.webp, 'image/webp'),
      ]);

      let photoId: string;

      // Check progressive upload record existence before updating
      const progressiveExists = progressivePhotoId
        ? await prisma.photo.findUnique({ where: { id: progressivePhotoId } })
        : null;
      if (progressivePhotoId && !progressiveExists) {
        logger.warn('[ProgressiveUpload] Phase 1 record not found, falling back to standard upload', { progressivePhotoId, eventId });
      }

      if (progressivePhotoId && progressiveExists) {
        // Progressive Upload Phase 2: Update existing photo record (created by quick-preview)
        const updatedPhoto = await prisma.photo.update({
          where: { id: progressivePhotoId },
          data: {
            storagePath,
            storagePathOriginal,
            storagePathThumb,
            storagePathWebp,
            categoryId: resolvedCategoryId,
            sizeBytes: uploadBytes,
            tags: [], // Remove progressive-upload tag
          },
        });
        photoId = updatedPhoto.id;

        // Emit photo_updated so gallery swaps thumbnail with full-quality
        try {
          io.to(`event:${eventId}`).emit('photo_updated', {
            photo: {
              ...updatedPhoto,
              sizeBytes: updatedPhoto.sizeBytes?.toString(),
            },
          });
          logger.info('[ProgressiveUpload] Full quality uploaded, photo updated', { eventId, photoId });
        } catch (wsError: any) {
          logger.warn('Failed to emit WebSocket event', { error: wsError.message });
        }
      } else {
        // Standard TUS upload: create new photo record
        const photo = await prisma.photo.create({
          data: {
            eventId,
            storagePath,
            storagePathOriginal,
            storagePathThumb,
            storagePathWebp,
            categoryId: resolvedCategoryId,
            url: '',
            status: 'PENDING',
            sizeBytes: uploadBytes,
            uploadedBy: uploadedBy || null,
          },
        });
        photoId = photo.id;

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

      auditLog({ type: AuditType.TUS_UPLOAD_FINISHED, message: `TUS Upload abgeschlossen: ${filename}`, eventId, data: { uploadId: upload.id, filename, isVideo: false, progressive: !!progressivePhotoId }, level: 'DEBUG' });
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
    // Differentiated error handling (matching multipart upload error granularity)
    const errorCode = error?.code || 'UNKNOWN';
    const isStorageLimit = errorCode === 'STORAGE_LIMIT_EXCEEDED' || errorCode === 'STORAGE_LIMIT_ENTITLEMENT_MISSING';
    const isValidation = errorCode === 'VALIDATION_ERROR' || error?.httpStatus === 400;

    if (isStorageLimit) {
      logger.warn('[TUS] Upload rejected: storage limit', { eventId, uploadId: upload.id, details: error.details });
    } else if (isValidation) {
      logger.warn('[TUS] Upload rejected: validation', { eventId, uploadId: upload.id, message: error.message });
    } else {
      logger.error('[TUS] Upload processing failed', { error: error.message, stack: error.stack, uploadId: upload.id, eventId, code: errorCode });
    }

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

// Periodic cleanup of stale TUS temp files (abandoned uploads)
const STALE_FILE_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
setInterval(async () => {
  try {
    const files = await fs.readdir(TUS_UPLOAD_DIR);
    const now = Date.now();
    let cleaned = 0;
    for (const file of files) {
      const fp = path.join(TUS_UPLOAD_DIR, file);
      try {
        const stat = await fs.stat(fp);
        if (now - stat.mtimeMs > STALE_FILE_MAX_AGE_MS) {
          await fs.unlink(fp);
          cleaned++;
        }
      } catch { /* file may have been cleaned by another process */ }
    }
    if (cleaned > 0) {
      logger.info(`[TUS Cleanup] Removed ${cleaned} stale temp files`);
    }
  } catch (error: any) {
    logger.warn('[TUS Cleanup] Failed', { error: error.message });
  }
}, 30 * 60 * 1000); // Run every 30 minutes

// Periodic cleanup of orphaned progressive-upload photo records
// (quick-preview created but full TUS upload never completed)
const PROGRESSIVE_ZOMBIE_AGE_MS = 60 * 60 * 1000; // 1 hour
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - PROGRESSIVE_ZOMBIE_AGE_MS);
    const zombies = await prisma.photo.findMany({
      where: {
        tags: { has: 'progressive-upload' },
        createdAt: { lt: cutoff },
      },
      select: { id: true, eventId: true },
    });
    if (zombies.length > 0) {
      await prisma.photo.deleteMany({
        where: { id: { in: zombies.map(z => z.id) } },
      });
      logger.info(`[Progressive Cleanup] Removed ${zombies.length} orphaned quick-preview records`);
    }
  } catch (error: any) {
    logger.warn('[Progressive Cleanup] Failed', { error: error.message });
  }
}, 15 * 60 * 1000); // Run every 15 minutes

// Status endpoint to check if Tus is enabled (must be before Tus handlers)
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    enabled: true,
    maxSize: TUS_MAX_SIZE,
  });
});

// Tus protocol handlers (must be after specific routes)
// Rate limit only POST (upload creation), PATCH/HEAD pass through
router.all('/', (req: Request, res: Response, next) => {
  if (req.method === 'POST') return tusCreateLimiter(req, res, () => tusServer.handle(req, res));
  tusServer.handle(req, res);
});

router.all('/:id', (req: Request, res: Response) => {
  tusServer.handle(req, res);
});

export default router;
