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
// hasEventAccess not used here — TUS v2.x passes Web API Request, so we replicate the logic inline
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
 * Parse cookies from a raw Cookie header string.
 */
function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc: Record<string, string>, c) => {
    const [k, ...v] = c.trim().split('=');
    if (k) acc[k] = v.join('=');
    return acc;
  }, {});
}

/**
 * Validate TUS upload request: check eventId, event existence, and access.
 * Runs on POST (upload creation) via onIncomingRequest hook.
 *
 * NOTE: @tus/server v2.x passes a Web API `Request` object (not Node.js IncomingMessage).
 * Headers must be accessed via req.headers.get(), not req.headers['...'].
 */
async function validateTusRequest(req: Request): Promise<void> {
  // Only validate on POST (upload creation), not PATCH/HEAD (resume/status)
  if (req.method !== 'POST') return;

  // @tus/server v2.x uses Web API Request — headers via .get()
  const headers = req.headers as any;
  const getHeader = (name: string): string | null => {
    if (typeof headers.get === 'function') return headers.get(name);
    // Fallback for Node.js IncomingMessage style
    return headers[name.toLowerCase()] || null;
  };

  // Extract eventId from Upload-Metadata header
  // Format: "eventId base64val,filename base64val,..."
  const metadataHeader = getHeader('upload-metadata');
  if (!metadataHeader) {
    logger.warn('[TUS] Upload-Metadata header missing', { method: req.method, url: req.url });
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
  const cookieHeader = getHeader('cookie');
  const cookies = parseCookieHeader(cookieHeader);
  const authorizationHeader = getHeader('authorization');
  const authToken = cookies['auth_token'] || (authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null);

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

  // Guest: check event access cookie (replicate hasEventAccess logic for Web API Request)
  const eventAccessCookieName = `event_access_${eventId}`;
  const eventAccessToken = cookies[eventAccessCookieName];
  if (eventAccessToken && jwtSecret) {
    try {
      const decoded = jwt.verify(eventAccessToken, jwtSecret) as any;
      if (decoded?.type === 'event_access' && decoded?.eventId === eventId) {
        return;
      }
    } catch {
      // Invalid token
    }
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
  respectForwardedHeaders: true,
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
        // Determine photo status based on event moderation settings
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { featuresConfig: true },
        });
        const featuresConfig = (event?.featuresConfig || {}) as any;
        const moderationRequired = featuresConfig?.moderationRequired === true;
        const photoStatus = moderationRequired ? 'PENDING' : 'APPROVED';

        // Check upload limit per guest (if configured)
        const maxUploadsPerGuest = featuresConfig?.maxUploadsPerGuest;
        if (maxUploadsPerGuest && typeof maxUploadsPerGuest === 'number' && maxUploadsPerGuest > 0 && uploadedBy) {
          const existingCount = await prisma.photo.count({
            where: { eventId, uploadedBy, deletedAt: null },
          });
          if (existingCount >= maxUploadsPerGuest) {
            throw { status_code: 429, body: `Upload-Limit erreicht (max. ${maxUploadsPerGuest} Fotos pro Gast)` };
          }
        }

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
            status: photoStatus,
            sizeBytes: uploadBytes,
            uploadedBy: uploadedBy || null,
          },
        });
        photoId = photo.id;

        // Update URL
        const updatedPhoto = await prisma.photo.update({
          where: { id: photo.id },
          data: { url: `/cdn/${photo.id}` },
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

        // Trigger workflow (non-blocking)
        import('../services/workflowExecutor').then(m => m.onPhotoUploaded(eventId, photo.id)).catch(() => {});

        // Quality Gate: blur + resolution + duplicate detection (non-blocking)
        import('../services/photoQualityGate').then(m =>
          m.runPhotoQualityGate(eventId, photo.id, buffer).then(async (qr) => {
            if (!qr.passed) {
              logger.info('[QualityGate] Photo flagged', { eventId, photoId: photo.id, reason: qr.rejectionReason });
            }
            // Write quality tags so CONDITION-step evaluator can use them
            const tagsToAdd: string[] = [];
            if (qr.checks.blur.isBlurry) tagsToAdd.push('blur');
            if (qr.checks.blur.isWarning) tagsToAdd.push('blur-warning');
            if (!qr.checks.resolution.passed) tagsToAdd.push('low-resolution');
            if (qr.checks.duplicate.isDuplicate) tagsToAdd.push('duplicate');
            if (tagsToAdd.length > 0) {
              await prisma.photo.update({
                where: { id: photo.id },
                data: { tags: { push: tagsToAdd } },
              }).catch(() => {});
            }
          })
        ).catch(() => {});

        // Face Detection (non-blocking)
        import('../services/faceRecognition').then(m =>
          m.getFaceDetectionMetadata(buffer).then(async (faceResult) => {
            if (faceResult.faceCount > 0) {
              await prisma.photo.update({
                where: { id: photo.id },
                data: { faceCount: faceResult.faceCount, faceData: { faces: faceResult.faces, descriptors: faceResult.descriptors || [] } },
              });
              const { storeFaceEmbedding } = await import('../services/faceSearchPgvector');
              const descriptors = faceResult.descriptors || [];
              for (let i = 0; i < descriptors.length; i++) {
                storeFaceEmbedding({ photoId: photo.id, eventId, descriptor: descriptors[i], faceIndex: i, box: faceResult.faces[i] }).catch(() => {});
              }
            }
          })
        ).catch(() => {});

        // Push Notifications (non-blocking)
        import('../services/pushNotification').then(async (m) => {
          const eventForPush = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
          if (eventForPush) {
            const name = uploadedBy || 'Ein Gast';
            m.sendPushToEvent(eventId, m.pushTemplates.newPhoto(eventForPush.title, name, eventForPush.slug)).catch(() => {});
            m.notifyEventHost(eventId, m.pushTemplates.hostNewUpload(eventForPush.title, 1)).catch(() => {});
          }
        }).catch(() => {});

        // Mosaic auto-hook (non-blocking)
        if (photoStatus === 'APPROVED') {
          prisma.mosaicWall.findUnique({ where: { eventId }, select: { id: true, status: true } }).then(async (wall) => {
            if (wall?.status === 'ACTIVE') {
              try {
                const { mosaicEngine } = await import('../services/mosaicEngine');
                const photoBuffer = await storageService.getFile(storagePath);
                const result = await mosaicEngine.placePhoto(wall.id, photo.id, photoBuffer, 'SMARTPHONE');
                if (result) {
                  io.to(`event:${eventId}`).emit('mosaic_tile_placed', {
                    tileId: result.tileId, position: result.position, printNumber: result.printNumber,
                    photoId: photo.id, croppedImageUrl: `/api/events/${eventId}/mosaic/tile-image/${result.tileId}`,
                    uploadedBy: uploadedBy || null,
                  });
                }
              } catch (err: any) {
                logger.warn('TUS mosaic auto-place failed', { error: err.message, eventId, photoId: photo.id });
              }
            }
          }).catch(() => {});
        }

        // Upload notification email to host (non-blocking)
        if (uploadedBy) {
          prisma.event.findUnique({
            where: { id: eventId },
            include: { host: { select: { email: true, name: true } } },
          }).then(async (eventWithHost) => {
            if (eventWithHost?.host?.email) {
              const { emailService } = await import('../services/email');
              emailService.sendUploadNotification({
                to: eventWithHost.host.email,
                hostName: eventWithHost.host.name || 'Host',
                eventTitle: eventWithHost.title,
                eventId,
                uploaderName: uploadedBy,
                photoCount: 1,
              }).catch(() => {});
            }
          }).catch(() => {});
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
