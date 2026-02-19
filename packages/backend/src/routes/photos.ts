import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import { bufferedEmit } from '../services/wsBuffer';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, requireEventAccess, hasEventAccess, hasEventManageAccess, hasEventPermission, isPrivilegedRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { denyByVisibility, isWithinUploadWindow } from '../services/eventPolicy';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { extractCapturedAtFromImage } from '../services/uploadDatePolicy';
import { emailService } from '../services/email';
import { serializeBigInt } from '../utils/serializers';
import { selectSmartCategoryId } from '../services/smartAlbum';
import { resolveSmartCategoryId, extractExifData } from '../services/photoCategories';
import { mosaicEngine } from '../services/mosaicEngine';
import { getFaceDetectionMetadata } from '../services/faceRecognition';
import { storeFaceEmbedding } from '../services/faceSearchPgvector';
import { addBrandingOverlay } from '../services/logoOverlay';
import { processDuplicateDetection } from '../services/duplicateDetection';
import { isFeatureEnabled } from '../services/featureGate';
import { checkAchievements } from '../services/achievementTracker';
import { sendPushToEvent, notifyEventHost, pushTemplates } from '../services/pushNotification';
import archiver from 'archiver';
import { logger } from '../utils/logger';
import { auditLog, AuditType } from '../services/auditLogger';

// Sharp is optional; if missing we fall back to a tiny placeholder for blurred previews.
let sharp: any;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

const router = Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (aligned with Nginx)
  },
});

const enforceEventUploadAllowed = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        deletedAt: true,
        isActive: true,
        featuresConfig: true,
        dateTime: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
    const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';

    const featuresConfig = (event.featuresConfig || {}) as any;
    const allowUploads = featuresConfig?.allowUploads !== false;
    if (!allowUploads && !isManager) {
      return denyByVisibility(res, denyVisibility, {
        code: 'UPLOADS_DISABLED',
        error: 'Uploads sind für dieses Event deaktiviert',
      });
    }

    if (req.userId && isManager && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
      const canUpload = await hasEventPermission(req, eventId, 'canUpload');
      if (!canUpload) {
        return denyByVisibility(res, 'hostOrAdmin', {
          code: 'PERMISSION_DENIED',
          error: 'Keine Berechtigung',
        });
      }
    }

    // Host/Co-Host bypass upload window entirely
    if (!isManager) {
      const toleranceDays = typeof featuresConfig?.uploadToleranceDays === 'number'
        ? featuresConfig.uploadToleranceDays
        : 3;
      const withinWindow = await isWithinUploadWindow({
        eventId,
        eventDateTime: event.dateTime,
        toleranceDays,
      });
      if (!withinWindow) {
        return denyByVisibility(res, denyVisibility, {
          code: 'UPLOAD_WINDOW_CLOSED',
          error: `Uploads sind nur rund um das Event-Datum möglich (±${toleranceDays} Tag${toleranceDays !== 1 ? 'e' : ''})`,
        });
      }
    }

    const storageEndsAt = await getEventStorageEndsAt(eventId);
    if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
      return denyByVisibility(res, denyVisibility, {
        code: 'STORAGE_LOCKED',
        error: 'Speicherperiode beendet',
      });
    }

    (req as any).gfEventForUpload = event;
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const uploadSinglePhoto = (req: AuthRequest, res: Response, next: any) => {
  upload.single('file')(req as any, res as any, (err: any) => {
    if (!err) return next();
    const code = (err as any)?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß. Maximum: 50MB' });
    }
    const message = (err as any)?.message || String(err);
    if (message === 'Only image files are allowed') {
      return res.status(400).json({ error: 'Ungültiger Dateityp. Bitte ein Foto hochladen.' });
    }
    return res.status(400).json({ error: message });
  });
};

// Get all photos for an event
router.get('/:eventId/photos', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit, skip, categoryId } = req.query;

    const where: any = { eventId, isStoryOnly: false, deletedAt: null };

    // Filter by category if provided
    if (typeof categoryId === 'string' && categoryId.trim()) {
      where.categoryId = categoryId.trim();
    }

    const statusValue = Array.isArray(status) ? status[0] : status;
    if (typeof statusValue === 'string') {
      const normalized = statusValue.trim().toUpperCase();
      if (normalized && normalized !== 'ALL') {
        const allowed = new Set(['PENDING', 'APPROVED', 'REJECTED', 'DELETED']);
        if (allowed.has(normalized)) {
          where.status = normalized;
        }
      }
    }
    // Safety net: never return DELETED photos unless explicitly requested
    if (!where.status) {
      where.status = { not: 'DELETED' };
    }

    const limitNum = limit ? Math.min(parseInt(limit as string, 10) || 100, 200) : undefined;
    const skipNum = skip ? parseInt(skip as string, 10) || 0 : 0;

    const photos = await prisma.photo.findMany({
      where,
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        challengeCompletions: {
          select: {
            challengeId: true,
            challenge: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(limitNum ? { take: limitNum + 1, skip: skipNum } : {}),
    });

    const hasMore = limitNum ? photos.length > limitNum : false;
    const resultPhotos = hasMore ? photos.slice(0, limitNum) : photos;

    // Use direct URL if it's an external URL (e.g. Unsplash), otherwise proxy via backend
    // Also flatten challenge info for easier frontend consumption
    const photosWithProxyUrls = resultPhotos.map((photo: any) => {
      const challengeCompletion = photo.challengeCompletions;
      return {
        ...photo,
        url: `/cdn/${photo.id}`,
        challengeId: challengeCompletion?.challengeId || null,
        challengeTitle: challengeCompletion?.challenge?.title || null,
        challengeCompletions: undefined, // Remove nested object
      };
    });

    res.json({
      photos: serializeBigInt(photosWithProxyUrls),
      pagination: { hasMore, skip: skipNum, limit: limitNum || resultPhotos.length },
    });
  } catch (error: any) {
    logger.error('Get photos error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all media (photos + videos) for an event — unified for Host Gallery
router.get('/:eventId/media', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit, skip } = req.query;

    const statusFilter: any = {};
    const statusValue = Array.isArray(status) ? status[0] : status;
    if (typeof statusValue === 'string') {
      const normalized = statusValue.trim().toUpperCase();
      if (normalized && normalized !== 'ALL') {
        const allowed = new Set(['PENDING', 'APPROVED', 'REJECTED', 'DELETED']);
        if (allowed.has(normalized)) {
          statusFilter.status = normalized;
        }
      }
    }
    // Safety net: never return DELETED photos unless explicitly requested
    if (!statusFilter.status) {
      statusFilter.status = { not: 'DELETED' };
    }

    const limitNum = limit ? Math.min(parseInt(limit as string, 10) || 100, 500) : undefined;
    const skipNum = skip ? parseInt(skip as string, 10) || 0 : 0;

    // Fetch photos and videos in parallel
    const [photosRaw, videosRaw] = await Promise.all([
      prisma.photo.findMany({
        where: { eventId, isStoryOnly: false, deletedAt: null, ...statusFilter },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true } },
          category: { select: { id: true, name: true } },
          challengeCompletions: {
            select: { challengeId: true, challenge: { select: { id: true, title: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.video.findMany({
        where: { eventId, isStoryOnly: false, deletedAt: null, ...statusFilter },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Normalize photos
    const photos = photosRaw.map((p: any) => {
      const cc = p.challengeCompletions;
      return {
        id: p.id,
        type: 'PHOTO' as const,
        eventId: p.eventId,
        url: `/cdn/${p.id}`,
        thumbnailUrl: `/cdn/${p.id}?w=400&f=webp`,
        status: p.status,
        uploadedBy: p.uploadedBy,
        categoryId: p.categoryId,
        category: p.category,
        guest: p.guest,
        challengeId: cc?.challengeId || null,
        challengeTitle: cc?.challenge?.title || null,
        likes: (p as any)._count?.likes || 0,
        views: p.views || 0,
        isFavorite: p.isFavorite || false,
        sizeBytes: p.sizeBytes?.toString(),
        createdAt: p.createdAt,
        tags: p.tags || [],
      };
    });

    // Normalize videos
    const videos = videosRaw.map((v: any) => ({
      id: v.id,
      type: 'VIDEO' as const,
      eventId: v.eventId,
      url: v.url || `/api/videos/${v.id}/file`,
      thumbnailUrl: v.thumbnailPath ? `/api/videos/${v.id}/thumbnail` : undefined,
      status: v.status,
      uploadedBy: v.uploadedBy,
      categoryId: v.categoryId,
      category: v.category,
      guest: v.guest,
      challengeId: null,
      challengeTitle: null,
      likes: 0,
      views: v.views || 0,
      isFavorite: false, // Videos don't have favorites yet
      duration: v.duration,
      sizeBytes: v.sizeBytes?.toString(),
      createdAt: v.createdAt,
      tags: v.tags || [],
    }));

    // Merge and sort by createdAt desc
    const allMedia = [...photos, ...videos].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const total = allMedia.length;
    const paginatedMedia = limitNum
      ? allMedia.slice(skipNum, skipNum + limitNum)
      : allMedia;

    // Stats
    const stats = {
      total,
      photos: photos.length,
      videos: videos.length,
      approved: allMedia.filter(m => m.status === 'APPROVED').length,
      pending: allMedia.filter(m => m.status === 'PENDING').length,
      rejected: allMedia.filter(m => m.status === 'REJECTED').length,
    };

    res.json({
      media: paginatedMedia,
      stats,
      pagination: {
        total,
        hasMore: limitNum ? (skipNum + limitNum) < total : false,
        skip: skipNum,
        limit: limitNum || total,
      },
    });
  } catch (error: any) {
    logger.error('Get media error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload photo (public endpoint for guests)
router.post(
  '/:eventId/photos/upload',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  enforceEventUploadAllowed,
  attachEventUploadRateLimits,
  photoUploadIpLimiter,
  photoUploadEventLimiter,
  uploadSinglePhoto,
  validateUploadedFile('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const event = (req as any).gfEventForUpload as {
        id: string;
        hostId: string;
        featuresConfig: any;
      };

      const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
      const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';
      void denyVisibility;

      const featuresConfig = (event.featuresConfig || {}) as any;

      const rawCategoryId = typeof (req as any).body?.categoryId === 'string' ? String((req as any).body.categoryId) : '';
      const categoryId = rawCategoryId.trim() || null;
      
      const rawChallengeId = typeof (req as any).body?.challengeId === 'string' ? String((req as any).body.challengeId) : '';
      const challengeId = rawChallengeId.trim() || null;

      // Process image
      const processed = await imageProcessor.processImage(file.buffer);

      const uploadTime = new Date();
      const capturedAtResult = await extractCapturedAtFromImage(file.buffer, uploadTime);

      // Smart Album Chain: 1) manual, 2) time-window match, 3) EXIF-based fallback
      let resolvedCategoryId = categoryId
        ? categoryId
        : await selectSmartCategoryId({
            eventId,
            capturedAt: capturedAtResult.capturedAt,
            isGuest: !isManager,
          });

      if (!resolvedCategoryId && !categoryId) {
        resolvedCategoryId = await resolveSmartCategoryId(eventId, {
          dateTime: capturedAtResult.capturedAt,
        });
      }

      // Calculate total upload size (all variants)
      const uploadBytes = BigInt(processed.original.length + processed.optimized.length + processed.thumbnail.length + processed.webp.length);
      try {
        await assertUploadWithinLimit(eventId, uploadBytes);
      } catch (e: any) {
        if (e?.httpStatus) {
          return res.status(e.httpStatus).json({ error: 'Speicherlimit erreicht' });
        }
        throw e;
      }
      
      // Upload all three variants to SeaweedFS
      const baseFilename = file.originalname.replace(/\.[^/.]+$/, '');
      const ext = file.originalname.match(/\.[^/.]+$/)?.[0] || '.jpg';
      
      const [storagePath, storagePathOriginal, storagePathThumb, storagePathWebp] = await Promise.all([
        storageService.uploadFile(eventId, `${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_orig${ext}`, processed.original, file.mimetype),
        storageService.uploadFile(eventId, `${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_webp.webp`, processed.webp, 'image/webp'),
      ]);

      const moderationRequired = featuresConfig?.moderationRequired === true;
      const status = moderationRequired && !isManager ? 'PENDING' : 'APPROVED';

      const photoUploaderName = (req.body?.uploaderName || '').trim() || null;
      
      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,           // Optimized for gallery view
          storagePathOriginal,   // Original quality for Host download
          storagePathThumb,      // Thumbnail for previews
          storagePathWebp,       // WebP for modern browsers
          categoryId: resolvedCategoryId,
          url: '',
          status,
          sizeBytes: uploadBytes,
          uploadedBy: photoUploaderName,
        },
        include: {
          guest: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const photoWithProxyUrl = {
        ...photo,
        url: `/cdn/${photo.id}`,
        challengeId: null as string | null,
        challengeTitle: null as string | null,
      };

      await prisma.photo.update({
        where: { id: photo.id },
        data: { url: photoWithProxyUrl.url },
      });

      // Create ChallengeCompletion if challengeId was provided
      if (challengeId) {
        const challenge = await prisma.challenge.findFirst({
          where: { id: challengeId, eventId, isActive: true },
          select: { id: true, title: true },
        });
        
        if (challenge) {
          const uploaderName = (req.body?.uploaderName || 'Ein Gast').trim();
          await prisma.challengeCompletion.create({
            data: {
              challengeId: challenge.id,
              photoId: photo.id,
              uploaderName,
            },
          });
          photoWithProxyUrl.challengeId = challenge.id;
          photoWithProxyUrl.challengeTitle = challenge.title;
        }
      }

      // Emit WebSocket event (buffered to reduce re-renders during bulk uploads)
      bufferedEmit(io, eventId, 'photo_uploaded', {
        photo: serializeBigInt(photoWithProxyUrl),
      });

      auditLog({ type: AuditType.PHOTO_UPLOADED, message: `Foto hochgeladen: ${file.originalname}`, eventId, data: { photoId: photo.id, filename: file.originalname, status: photo.status }, req, level: 'DEBUG' });

      // Trigger workflow automations (non-blocking)
      import('../services/workflowExecutor').then(m => m.onPhotoUploaded(eventId, photo.id)).catch(() => {});

      // Gamification: auto-check achievements (async, non-blocking)
      if (photo.uploadedBy) {
        const visitorId = req.userId || photo.uploadedBy;
        checkAchievements(eventId, visitorId, photo.uploadedBy).catch(() => {});
      }

      // Push Notifications: notify event subscribers + host (async, non-blocking)
      const eventForPush = await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
      if (eventForPush) {
        const uploaderName = photo.uploadedBy || 'Ein Gast';
        sendPushToEvent(eventId, pushTemplates.newPhoto(eventForPush.title, uploaderName, eventForPush.slug), req.userId || undefined).catch(() => {});
        notifyEventHost(eventId, pushTemplates.hostNewUpload(eventForPush.title, 1)).catch(() => {});
      }

      // Mosaic Wall auto-hook: place photo as tile if event has active mosaic (async, non-blocking)
      if (photo.status === 'APPROVED') {
        prisma.mosaicWall.findUnique({
          where: { eventId },
          select: { id: true, status: true },
        }).then(async (wall) => {
          if (wall?.status === 'ACTIVE') {
            try {
              const photoBuffer = await storageService.getFile(storagePath);
              const result = await mosaicEngine.placePhoto(wall.id, photo.id, photoBuffer, 'SMARTPHONE');
              if (result) {
                io.to(`event:${eventId}`).emit('mosaic_tile_placed', {
                  tileId: result.tileId,
                  position: result.position,
                  printNumber: result.printNumber,
                  photoId: photo.id,
                  croppedImageUrl: `/api/events/${eventId}/mosaic/tile-image/${result.tileId}`,
                  uploadedBy: photo.uploadedBy || null,
                });
              }
            } catch (err: any) {
              logger.warn('Mosaic auto-place failed', { error: err.message, eventId, photoId: photo.id });
            }
          }
        }).catch(() => {});
      }

      // Face Detection: extract faces + descriptors for face search (async, non-blocking)
      (async () => {
        try {
          const faceResult = await getFaceDetectionMetadata(processed.optimized);
          if (faceResult.faceCount > 0) {
            await prisma.photo.update({
              where: { id: photo.id },
              data: {
                faceCount: faceResult.faceCount,
                faceData: {
                  faces: faceResult.faces,
                  descriptors: faceResult.descriptors || [],
                },
              },
            });

            // Store embeddings in pgvector table for fast similarity search
            const descriptors = faceResult.descriptors || [];
            for (let i = 0; i < descriptors.length; i++) {
              storeFaceEmbedding({
                photoId: photo.id,
                eventId,
                descriptor: descriptors[i],
                faceIndex: i,
                box: faceResult.faces[i],
              }).catch(() => {}); // non-critical
            }

            logger.info('Face detection completed', { photoId: photo.id, faceCount: faceResult.faceCount });
          }
        } catch (err: any) {
          logger.warn('Face detection failed (non-critical)', { error: err.message, photoId: photo.id });
        }
      })();

      // Duplicate Detection: calculate hashes and find similar photos (async, non-blocking)
      (async () => {
        try {
          const duplicateResult = await processDuplicateDetection(
            eventId,
            photo.id,
            processed.optimized
          );
          if (duplicateResult.isDuplicate) {
            logger.info('Duplicate detected', {
              photoId: photo.id,
              groupId: duplicateResult.duplicateGroupId,
              isBest: duplicateResult.isBestInGroup,
              similarCount: duplicateResult.similarPhotos?.length || 0,
            });
            // Emit WebSocket event for duplicate notification
            io.to(`event:${eventId}`).emit('duplicate_detected', {
              photoId: photo.id,
              duplicateGroupId: duplicateResult.duplicateGroupId,
              isBestInGroup: duplicateResult.isBestInGroup,
              similarPhotos: duplicateResult.similarPhotos,
            });
          }
        } catch (err: any) {
          logger.warn('Duplicate detection failed (non-critical)', { error: err.message, photoId: photo.id });
        }
      })();

      // Send upload notification to host (async, non-blocking)
      const uploaderName = (req.body?.uploaderName || 'Ein Gast').trim();
      if (!isManager && uploaderName) {
        prisma.event.findUnique({
          where: { id: eventId },
          include: { host: { select: { email: true, name: true } } },
        }).then((eventWithHost) => {
          if (eventWithHost?.host?.email) {
            emailService.sendUploadNotification({
              to: eventWithHost.host.email,
              hostName: eventWithHost.host.name || 'Host',
              eventTitle: eventWithHost.title,
              eventId,
              uploaderName,
              photoCount: 1,
            }).catch((err: any) => logger.warn('Upload notification failed', { error: err.message, eventId, uploaderName }));
          }
        }).catch(() => {});
      }

      res.status(201).json({ photo: serializeBigInt(photoWithProxyUrl) });
    } catch (error: any) {
      logger.error('Upload photo error', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Quick Preview Upload for Progressive Upload
// 1. Guest selects photo → client generates tiny thumbnail (~30KB)
// 2. This endpoint creates DB record immediately + stores thumbnail
// 3. Gallery shows photo via WebSocket within ~1 second
// 4. Full TUS upload continues in background, updates this record
router.post(
  '/:eventId/photos/quick-preview',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  enforceEventUploadAllowed,
  uploadSinglePhoto,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No preview file provided' });
      }

      // Quick preview should be small (max 200KB)
      if (file.size > 200 * 1024) {
        return res.status(400).json({ error: 'Preview too large. Max 200KB.' });
      }

      const uploaderName = (req.body?.uploaderName || '').trim() || null;
      const originalFilename = (req.body?.originalFilename || 'photo.jpg').trim();

      // Store thumbnail directly (no processing needed — already small)
      const baseFilename = originalFilename.replace(/\.[^/.]+$/, '');
      const storagePathThumb = await storageService.uploadFile(
        eventId,
        `${baseFilename}_preview.jpg`,
        file.buffer,
        'image/jpeg'
      );

      // Create photo record with thumbnail only — original + optimized come later via TUS
      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath: storagePathThumb,    // Temporary: use thumb as main until TUS completes
          storagePathThumb,
          storagePathOriginal: null,
          url: '',
          status: 'PENDING',
          sizeBytes: BigInt(file.size),
          uploadedBy: uploaderName,
          tags: ['progressive-upload'],     // Tag to identify progressive uploads
        },
      });

      const photoUrl = `/cdn/${photo.id}`;
      await prisma.photo.update({
        where: { id: photo.id },
        data: { url: photoUrl },
      });

      const photoWithUrl = {
        ...photo,
        url: photoUrl,
        sizeBytes: photo.sizeBytes?.toString(),
      };

      // Emit WebSocket (buffered) — gallery shows thumbnail within ~2 seconds
      bufferedEmit(io, eventId, 'photo_uploaded', { photo: photoWithUrl });

      logger.info('[ProgressiveUpload] Quick preview stored', {
        eventId,
        photoId: photo.id,
        previewSize: file.size,
        originalFilename,
      });

      res.status(201).json({ photoId: photo.id });
    } catch (error: any) {
      logger.error('Quick preview error', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Serve photo file (proxy) - suitable for <img src>
router.get(
  '/:photoId/file',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: {
            select: {
              id: true,
              hostId: true,
              featuresConfig: true,
              deletedAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!photo || photo.deletedAt) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      if (photo.event.deletedAt || photo.event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isManager = req.userId ? await hasEventManageAccess(req, photo.eventId) : false;
      const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';

      if (!isManager && !hasEventAccess(req, photo.eventId)) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      // Guests cannot see deleted photos, but hosts/admins can (for trash management)
      if (!isManager && photo.status === 'DELETED') {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      const storageEndsAt = await getEventStorageEndsAt(photo.eventId);
      const isStorageLocked = !!(storageEndsAt && Date.now() > storageEndsAt.getTime());

      res.setHeader('X-GF-Storage-Locked', isStorageLocked ? '1' : '0');
      res.setHeader('X-GF-Viewer', isManager ? 'host' : 'guest');

      // NOTE: For the public page UX we still want to show thumbnails even when storage is locked,
      // but downloads must remain blocked via /download.

      if (!isManager && photo.status !== 'APPROVED') {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      if (!photo.storagePath) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      const fileBuffer = await storageService.getFile(photo.storagePath);

      // If storage is locked, return a blurred preview instead of the original.
      // This prevents bypassing the storage lock by opening the photo in a modal (guest/host).
      if (isStorageLocked) {
        res.setHeader('X-GF-Photo-Preview', 'blur');
        if (sharp) {
          try {
            const blurred = await sharp(fileBuffer)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .blur(20)
              .jpeg({ quality: 50 })
              .toBuffer();
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'private, max-age=0');
            res.setHeader('Content-Disposition', `inline; filename="photo-${photoId}-blur.jpg"`);
            return res.send(blurred);
          } catch (e) {
            // fall through to placeholder
          }
        }

        // Fallback placeholder (1x1 transparent PNG)
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwMB/6n6v5QAAAAASUVORK5CYII=',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'private, max-age=0');
        res.setHeader('Content-Disposition', `inline; filename="photo-${photoId}-blur.png"`);
        return res.send(placeholder);
      }

      res.setHeader('X-GF-Photo-Preview', 'original');

      const extension = photo.storagePath.split('.').pop() || 'jpg';
      const contentType =
        extension === 'png'
          ? 'image/png'
          : extension === 'webp'
          ? 'image/webp'
          : extension === 'gif'
          ? 'image/gif'
          : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('Content-Disposition', `inline; filename="photo-${photoId}.${extension}"`);
      res.send(fileBuffer);
    } catch (error: any) {
      logger.error('Serve photo file error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Download photo
router.get(
  '/:photoId/download',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            featuresConfig: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!photo || photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isManager = req.userId ? await hasEventManageAccess(req, photo.eventId) : false;
    const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';

    // Access control: host/admin via JWT OR event access cookie for guests
    if (!isManager && !hasEventAccess(req, photo.eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Storage period enforcement (no downloads after storageEndsAt)
    // Host/Admin can still download after lock (for backup before hard delete)
    const storageEndsAt = await getEventStorageEndsAt(photo.eventId);
    if (!isManager && storageEndsAt && Date.now() > storageEndsAt.getTime()) {
      return denyByVisibility(res, denyVisibility, {
        code: 'STORAGE_LOCKED',
        error: 'Speicherperiode beendet',
      });
    }

    const featuresConfig = (photo.event.featuresConfig || {}) as any;

    // Guests can download only if host enabled allowDownloads
    if (!isManager && featuresConfig?.allowDownloads === false) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Guests can download only approved photos
    if (!isManager && photo.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (req.userId && isManager && photo.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
      const canDownload = await hasEventPermission(req, photo.eventId, 'canDownload');
      if (!canDownload) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }
    }

    if (!photo.storagePath) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Host/Admin get original quality, guests get optimized
    const downloadPath = isManager && photo.storagePathOriginal 
      ? photo.storagePathOriginal 
      : photo.storagePath;
    
    let fileBuffer = await storageService.getFile(downloadPath);
    const extension = downloadPath.split('.').pop() || 'jpg';

    // Branding overlay for guest downloads
    // non-adFree: gästefotos.com branding (free advertising)
    // adFree + customHashtag: host's custom hashtag overlay
    // adFree without customHashtag: no overlay (clean download)
    if (!isManager && (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp')) {
      try {
        const adFree = await isFeatureEnabled(photo.eventId, 'adFree');
        const fc = (photo.event.featuresConfig || {}) as any;
        if (!adFree) {
          fileBuffer = await addBrandingOverlay(fileBuffer, { hashtag: '#gästefotos' });
        } else if (fc.customHashtag) {
          const { addCustomBrandingOverlay } = await import('../services/logoOverlay');
          fileBuffer = await addCustomBrandingOverlay(fileBuffer, { hashtag: fc.customHashtag });
        }
      } catch (brandErr: any) {
        logger.warn('Branding overlay failed, serving original', { error: brandErr.message });
      }
    }

    const contentType = extension === 'png'
      ? 'image/png'
      : extension === 'webp'
      ? 'image/webp'
      : extension === 'gif'
      ? 'image/gif'
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.setHeader('Content-Disposition', `attachment; filename="photo-${photoId}.${extension}"`);
    res.setHeader('X-GF-Quality', isManager && photo.storagePathOriginal ? 'original' : 'optimized');
    res.setHeader('X-GF-Branding', isManager ? 'none' : 'gaestefotos');
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Download photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download selected photos as ZIP (host/admin only)
router.post(
  '/bulk/download',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds } = req.body;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'Keine Fotos ausgewählt' });
      }

      const photos = await prisma.photo.findMany({
        where: {
          id: { in: photoIds },
          deletedAt: null,
        },
        include: {
          event: true,
          category: {
            select: { id: true, name: true },
          },
        },
      });

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Keine Fotos gefunden' });
      }

      const event = photos[0].event;
      const eventId = event.id;

      if (photos.some((p) => p.eventId !== eventId)) {
        return res.status(400).json({ error: 'Fotos müssen aus demselben Event stammen' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (req.userId && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canDownload = await hasEventPermission(req, eventId, 'canDownload');
        if (!canDownload) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }

      // Storage period enforcement - Host/Admin can still bulk-download after lock (for backup)
      // Note: hasEventManageAccess already verified above, so we skip lock for managers

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-photos-${Date.now()}.zip"`);

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.on('error', (err: any) => {
        logger.error('ZIP creation error', { error: err.message, eventId: event.id });
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Erstellen der ZIP-Datei' });
        }
      });

      archive.pipe(res);

      // Track photo index per category for sequential naming
      const categoryCounters: Record<string, number> = {};
      
      for (const photo of photos) {
        if (!photo.storagePath) continue;
        try {
          // Use original quality for bulk download (host/admin only endpoint)
          const downloadPath = photo.storagePathOriginal || photo.storagePath;
          const fileBuffer = await storageService.getFile(downloadPath);
          const extension = downloadPath.split('.').pop() || 'jpg';
          
          // Organize files in category folders
          const categoryName = (photo as any).category?.name || 'Allgemein';
          const safeCategoryName = categoryName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').trim() || 'Allgemein';
          
          // Increment counter for this category
          categoryCounters[safeCategoryName] = (categoryCounters[safeCategoryName] || 0) + 1;
          const photoIndex = categoryCounters[safeCategoryName].toString().padStart(3, '0');
          
          archive.append(fileBuffer, { name: `${safeCategoryName}/IMG_${photoIndex}.${extension}` });
        } catch (err: any) {
          logger.warn('Failed to add photo to ZIP', { error: err.message, photoId: photo.id });
        }
      }

      archive.finalize();
    } catch (error: any) {
      logger.error('Bulk download error', { error: error.message, stack: error.stack });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Interner Serverfehler' });
      }
    }
  }
);

// Toggle favorite (host/admin only)
router.post(
  '/:photoId/favorite',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { id: true, eventId: true, isFavorite: true, event: { select: { hostId: true } } },
      });
      if (!photo) return res.status(404).json({ error: 'Photo not found' });
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const updated = await prisma.photo.update({
        where: { id: photoId },
        data: { isFavorite: !photo.isFavorite },
      });
      io.to(`event:${photo.eventId}`).emit('photo_updated', { photo: updated });
      res.json({ photo: updated });
    } catch (error: any) {
      logger.error('Toggle favorite error', { error: error.message, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Download ALL event photos as ZIP (host/admin only)
router.post(
  '/bulk/download-all',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, filter } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId required' });
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event not found' });

      const where: any = { eventId, deletedAt: null };
      if (filter === 'favorites') where.isFavorite = true;
      else if (filter !== 'all') where.status = 'APPROVED';
      else where.status = 'APPROVED';

      const photos = await prisma.photo.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (photos.length === 0) return res.status(404).json({ error: 'Keine Fotos gefunden' });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-gallery-${Date.now()}.zip"`);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (err: any) => {
        logger.error('ZIP error', { error: err.message, eventId });
        if (!res.headersSent) res.status(500).json({ error: 'ZIP error' });
      });
      archive.pipe(res);

      const categoryCounters: Record<string, number> = {};
      for (const photo of photos) {
        if (!photo.storagePath) continue;
        try {
          const downloadPath = photo.storagePathOriginal || photo.storagePath;
          const fileBuffer = await storageService.getFile(downloadPath);
          const extension = downloadPath.split('.').pop() || 'jpg';
          const categoryName = (photo as any).category?.name || 'Allgemein';
          const safeName = categoryName.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '').trim() || 'Allgemein';
          categoryCounters[safeName] = (categoryCounters[safeName] || 0) + 1;
          const idx = categoryCounters[safeName].toString().padStart(3, '0');
          archive.append(fileBuffer, { name: `${safeName}/IMG_${idx}.${extension}` });
        } catch (err: any) {
          logger.warn('Skip photo in ZIP', { error: err.message, photoId: photo.id });
        }
      }
      archive.finalize();
    } catch (error: any) {
      logger.error('Download all error', { error: error.message });
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Approve photo
router.post(
  '/:photoId/approve',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }


      if (req.userId && photo.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, photo.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'APPROVED' },
      });

      auditLog({ type: AuditType.PHOTO_MODERATED, message: `Foto freigegeben`, eventId: photo.eventId, data: { photoId, action: 'approve' }, req });

      // Emit WebSocket event
      io.to(`event:${photo.eventId}`).emit('photo_approved', {
        photo: updatedPhoto,
      });

      // Trigger workflow automations (non-blocking)
      import('../services/workflowExecutor').then(m =>
        m.onEventTrigger(photo.eventId, 'TRIGGER_PHOTO_APPROVED', { guestId: undefined })
      ).catch(() => {});

      // Mosaic auto-hook: place newly approved photo if wall is active (non-blocking)
      prisma.mosaicWall.findUnique({ where: { eventId: photo.eventId }, select: { id: true, status: true } }).then(async (wall) => {
        if (wall?.status === 'ACTIVE') {
          try {
            const photoBuffer = await storageService.getFile(photo.storagePath);
            const result = await mosaicEngine.placePhoto(wall.id, photo.id, photoBuffer, 'SMARTPHONE');
            if (result) {
              io.to(`event:${photo.eventId}`).emit('mosaic_tile_placed', {
                tileId: result.tileId, position: result.position, printNumber: result.printNumber,
                photoId: photo.id,
              });
            }
          } catch (err: any) {
            logger.warn('Approve mosaic auto-place failed', { error: err.message });
          }
        }
      }).catch(() => {});

      res.json({ photo: updatedPhoto });
    } catch (error: any) {
      logger.error('Approve photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Reject photo
router.post(
  '/:photoId/reject',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (req.userId && photo.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, photo.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }

      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'REJECTED' },
      });

      auditLog({ type: AuditType.PHOTO_MODERATED, message: `Foto abgelehnt`, eventId: photo.eventId, data: { photoId, action: 'reject' }, req });

      // Trigger workflow automations (non-blocking)
      import('../services/workflowExecutor').then(m =>
        m.onEventTrigger(photo.eventId, 'TRIGGER_PHOTO_REJECTED', { guestId: undefined })
      ).catch(() => {});

      res.json({ photo: updatedPhoto });
    } catch (error: any) {
      logger.error('Reject photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Batch Approve/Reject ───────────────────────────────────────────────────
// POST /bulk/moderate — approve or reject multiple photos at once
router.post(
  '/bulk/moderate',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, action, eventId } = req.body;

      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds array required' });
      }
      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'action must be "approve" or "reject"' });
      }
      if (!eventId) {
        return res.status(400).json({ error: 'eventId required' });
      }
      if (photoIds.length > 200) {
        return res.status(400).json({ error: 'Max 200 photos per batch' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

      const result = await prisma.photo.updateMany({
        where: {
          id: { in: photoIds },
          eventId, // Safety: only update photos belonging to this event
        },
        data: { status: newStatus },
      });

      // Emit WebSocket events for approved photos
      if (action === 'approve') {
        io.to(`event:${eventId}`).emit('photos_bulk_approved', {
          photoIds,
          count: result.count,
        });
      }

      // Trigger workflow automations for bulk moderation (non-blocking)
      const triggerType = action === 'approve' ? 'TRIGGER_PHOTO_APPROVED' : 'TRIGGER_PHOTO_REJECTED';
      import('../services/workflowExecutor').then(m =>
        m.onEventTrigger(eventId, triggerType as any, { guestId: undefined })
      ).catch(() => {});

      logger.info('Bulk moderation', { eventId, action, requested: photoIds.length, updated: result.count });

      res.json({
        action,
        requested: photoIds.length,
        updated: result.count,
      });
    } catch (error: any) {
      logger.error('Bulk moderate error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /bulk/approve-all — approve all pending photos for an event
router.post(
  '/bulk/approve-all',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.body;

      if (!eventId) {
        return res.status(400).json({ error: 'eventId required' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const result = await prisma.photo.updateMany({
        where: { eventId, status: 'PENDING' },
        data: { status: 'APPROVED' },
      });

      if (result.count > 0) {
        io.to(`event:${eventId}`).emit('photos_bulk_approved', {
          count: result.count,
          all: true,
        });
      }

      logger.info('Bulk approve all', { eventId, approved: result.count });

      res.json({ approved: result.count });
    } catch (error: any) {
      logger.error('Bulk approve-all error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete photo
router.delete(
  '/:photoId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      // Check permissions
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.userId && photo.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, photo.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'DELETED' },
      });

      auditLog({ type: AuditType.PHOTO_DELETED, message: `Foto gelöscht`, eventId: photo.eventId, data: { photoId: req.params.photoId }, req });

      res.json({ message: 'Photo deleted' });
    } catch (error: any) {
      logger.error('Delete photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Restore photo from trash
router.post(
  '/:photoId/restore',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'APPROVED' },
      });

      res.json({ message: 'Photo restored' });
    } catch (error: any) {
      logger.error('Restore photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Permanently delete photo (purge)
router.delete(
  '/:photoId/purge',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: {
          id: true,
          eventId: true,
          storagePath: true,
          storagePathOriginal: true,
          storagePathThumb: true,
          event: {
            select: {
              id: true,
              hostId: true,
            },
          },
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Delete from storage
      if (photo.storagePath) {
        await storageService.deleteFile(photo.storagePath);
      }
      if (photo.storagePathOriginal) {
        await storageService.deleteFile(photo.storagePathOriginal);
      }
      if (photo.storagePathThumb) {
        await storageService.deleteFile(photo.storagePathThumb);
      }

      // Delete from database
      await prisma.photo.delete({
        where: { id: photoId },
      });

      res.json({ message: 'Photo permanently deleted' });
    } catch (error: any) {
      logger.error('Purge photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

