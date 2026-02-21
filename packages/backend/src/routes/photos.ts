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
    const { status, limit, skip, categoryId, sort, isFavorite, minQuality, cursor } = req.query;

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
    // Safety net: never return DELETED or HIDDEN photos unless explicitly requested (or manager)
    if (!where.status) {
      where.status = { notIn: ['DELETED', 'HIDDEN'] as any };
    }

    const limitNum = limit ? Math.min(parseInt(limit as string, 10) || 100, 200) : undefined;
    const skipNum = skip ? parseInt(skip as string, 10) || 0 : 0;

    // Cursor-based pagination support (overrides skip if provided)
    const cursorId = typeof cursor === 'string' && cursor.trim() ? cursor.trim() : null;

    // Tag filter
    const tagFilter = typeof req.query.tag === 'string' && req.query.tag.trim() ? req.query.tag.trim() : null;
    if (tagFilter) { where.tags = { has: tagFilter }; }

    // isFavorite filter
    if (isFavorite === 'true') where.isFavorite = true;
    else if (isFavorite === 'false') where.isFavorite = false;

    // Quality filter
    const minQualityNum = minQuality ? parseFloat(minQuality as string) : null;
    if (minQualityNum !== null && Number.isFinite(minQualityNum)) {
      where.qualityScore = { gte: minQualityNum };
    }

    const sortValue = typeof sort === 'string' ? sort : 'date_desc';
    const orderBy: any =
      sortValue === 'likes_desc' ? [{ likeCount: 'desc' }, { createdAt: 'desc' }] :
      sortValue === 'faces_desc' ? [{ faceCount: 'desc' }, { createdAt: 'desc' }] :
      sortValue === 'views_desc' ? [{ views: 'desc' }, { createdAt: 'desc' }] :
      sortValue === 'quality_desc' ? [{ qualityScore: 'desc' }, { createdAt: 'desc' }] :
      sortValue === 'rating_desc' ? [{ qualityScore: 'desc' }, { createdAt: 'desc' }] :
      sortValue === 'date_asc' ? { createdAt: 'asc' } :
      { createdAt: 'desc' }; // default: date_desc

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
        _count: {
          select: { comments: true },
        },
      },
      orderBy,
      ...(limitNum ? { take: limitNum + 1 } : {}),
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : { skip: skipNum }),
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
        commentCount: photo._count?.comments || 0,
        _count: undefined,
      };
    });

    const nextCursor = hasMore && resultPhotos.length > 0 ? resultPhotos[resultPhotos.length - 1].id : null;

    res.json({
      photos: serializeBigInt(photosWithProxyUrls),
      pagination: { hasMore, skip: skipNum, limit: limitNum || resultPhotos.length, nextCursor },
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

      // Webhook: fire-and-forget POST to external URL if configured
      if ((featuresConfig as any)?.webhookUrl) {
        const webhookUrl = String((featuresConfig as any).webhookUrl);
        (async () => {
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-GF-Event': 'photo.uploaded' },
              body: JSON.stringify({
                event: 'photo.uploaded',
                eventId,
                photoId: photo.id,
                uploadedBy: photo.uploadedBy || null,
                status: photo.status,
                timestamp: new Date().toISOString(),
              }),
              signal: AbortSignal.timeout(5000),
            });
          } catch (err: any) {
            logger.warn('Webhook delivery failed', { webhookUrl, error: err.message });
          }
        })();
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

    // Non-blocking: increment download/view counter
    prisma.photo.update({
      where: { id: photoId },
      data: { views: { increment: 1 } },
    }).catch(() => {});
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

      // Non-blocking: track approval in audit log (already done above)
      // Also notify host of newly approved photo via push (non-blocking)
      if (photo.status === 'PENDING') {
        const uploaderName = (photo as any).uploadedBy || 'Gast';
        import('../services/pushNotification').then(async (m) => {
          m.notifyEventHost(photo.eventId, {
            title: '✅ Foto freigegeben',
            body: `Foto von ${uploaderName} wurde freigegeben`,
            data: { type: 'photo_approved', eventId: photo.eventId },
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (error: any) {
      logger.error('Approve photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /:photoId/report — Guest reports a photo to host
router.post(
  '/:photoId/report',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const { reason } = req.body;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { event: { select: { id: true, hostId: true, title: true, slug: true } } },
      });
      if (!photo || photo.deletedAt) return res.status(404).json({ error: 'Foto nicht gefunden' });

      // Non-blocking: notify host
      (async () => {
        try {
          const host = await prisma.user.findUnique({ where: { id: photo.event.hostId }, select: { email: true } });
          if (!host?.email) return;
          const { emailService } = await import('../services/email');
          if (!(await emailService.testConnection())) return;
          const frontendUrl = process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com';
          await emailService.sendCustomEmail({
            to: host.email,
            subject: `⚠️ Foto gemeldet: "${photo.event.title}"`,
            text: `Ein Gast hat ein Foto in deinem Event "${photo.event.title}" gemeldet.\n\nGrund: ${reason || 'Kein Grund angegeben'}\nFoto-ID: ${photoId}\n\nEvent: ${frontendUrl}/events/${photo.event.id}/photos`,
            html: `<p>Ein Gast hat ein Foto in <strong>${photo.event.title}</strong> gemeldet.</p><p><strong>Grund:</strong> ${reason || 'Kein Grund angegeben'}</p><p><a href="${frontendUrl}/events/${photo.event.id}/photos">Fotos moderieren</a></p>`,
          });
        } catch (err: any) {
          logger.warn('Report notification failed', { error: err.message });
        }
      })();

      logger.info('Photo reported', { photoId, eventId: photo.eventId, reason });
      res.json({ reported: true });
    } catch (error: any) {
      logger.error('Report error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Melden' });
    }
  }
);

// POST /:photoId/ai-caption — Generate AI caption for a photo (fire & write)
router.post(
  '/:photoId/ai-caption',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        select: { id: true, eventId: true, storagePath: true, uploadedBy: true, faceCount: true, tags: true },
      });
      if (!photo) return res.status(404).json({ error: 'Foto nicht gefunden' });
      if (!(await hasEventManageAccess(req, photo.eventId))) return res.status(403).json({ error: 'Forbidden' });

      // Build a simple context-based caption (no AI required for basic version)
      const parts: string[] = [];
      if (photo.uploadedBy) parts.push(`Hochgeladen von ${photo.uploadedBy}`);
      if (photo.faceCount && photo.faceCount > 0) parts.push(`${photo.faceCount} Person${photo.faceCount !== 1 ? 'en' : ''} erkannt`);
      if (photo.tags && photo.tags.length > 0) parts.push(`Tags: ${photo.tags.join(', ')}`);
      const caption = parts.length > 0 ? parts.join(' · ') : 'Foto vom Event';

      const updated = await prisma.photo.update({
        where: { id: photoId },
        data: { description: caption },
        select: { id: true, description: true },
      });

      res.json({ photoId, caption: updated.description });
    } catch (error: any) {
      logger.error('AI caption error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Generieren' });
    }
  }
);

// POST /:photoId/pin — Toggle pin status (host only)
router.post(
  '/:photoId/pin',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true, eventId: true, isFavorite: true } });
      if (!photo) return res.status(404).json({ error: 'Foto nicht gefunden' });
      if (!(await hasEventManageAccess(req, photo.eventId))) return res.status(403).json({ error: 'Forbidden' });

      // Use isFavorite as pin indicator (no isPinned field in schema)
      const pinned = !photo.isFavorite;
      await prisma.photo.update({ where: { id: photoId }, data: { isFavorite: pinned } });
      res.json({ pinned, photoId });
    } catch (error: any) {
      logger.error('Pin photo error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Pinnen' });
    }
  }
);

// POST /:photoId/hide — Hide/unhide own photo from gallery (if allowHide is enabled)
router.post(
  '/:photoId/hide',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const { uploaderName } = req.body;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { event: { select: { featuresConfig: true } } },
      });
      if (!photo || photo.deletedAt) return res.status(404).json({ error: 'Foto nicht gefunden' });

      const fc = (photo.event?.featuresConfig || {}) as any;
      if (!fc.allowHide && !req.userId) return res.status(403).json({ error: 'Verbergen nicht erlaubt' });

      // If authenticated manager, allow directly
      const canHide = req.userId
        ? await hasEventManageAccess(req, photo.eventId)
        : (uploaderName && photo.uploadedBy?.toLowerCase() === uploaderName.trim().toLowerCase() && fc.allowHide);

      if (!canHide) return res.status(403).json({ error: 'Kein Zugriff' });

      const newStatus = (photo.status as any) === 'HIDDEN' ? 'APPROVED' : 'HIDDEN';
      await prisma.photo.update({
        where: { id: photoId },
        data: { status: newStatus as any },
      });

      res.json({ hidden: newStatus === 'HIDDEN', status: newStatus });
    } catch (error: any) {
      logger.error('Hide photo error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Verbergen' });
    }
  }
);

// POST /:photoId/delete-own — Guest deletes their own photo (if allowDeleteOwn is enabled)
router.post(
  '/:photoId/delete-own',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const { uploaderName } = req.body;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: { event: { select: { featuresConfig: true, isActive: true, deletedAt: true } } },
      });
      if (!photo || photo.deletedAt) return res.status(404).json({ error: 'Foto nicht gefunden' });
      if (!photo.event.isActive || photo.event.deletedAt) return res.status(404).json({ error: 'Event nicht gefunden' });

      const fc = (photo.event.featuresConfig || {}) as any;
      if (!fc.allowDeleteOwn) return res.status(403).json({ error: 'Löschen nicht erlaubt' });

      // Verify ownership by uploader name
      if (!uploaderName || photo.uploadedBy?.toLowerCase() !== uploaderName.trim().toLowerCase()) {
        return res.status(403).json({ error: 'Kein Zugriff — falscher Uploader-Name' });
      }

      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'DELETED', deletedAt: new Date() },
      });

      res.json({ deleted: true });
    } catch (error: any) {
      logger.error('Delete-own error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }
);

// PATCH /:photoId — Update photo metadata (title, description, tags)
router.patch(
  '/:photoId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const { title, description, tags } = req.body;

      const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true, eventId: true } });
      if (!photo) return res.status(404).json({ error: 'Foto nicht gefunden' });
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updates: any = {};
      if (typeof title === 'string') updates.title = title.trim() || null;
      if (typeof description === 'string') updates.description = description.trim() || null;
      if (Array.isArray(tags)) updates.tags = tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());

      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Keine Daten zum Aktualisieren' });

      const updated = await prisma.photo.update({ where: { id: photoId }, data: updates });
      res.json({ photo: updated });
    } catch (error: any) {
      logger.error('Photo patch error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Toggle favorite
router.post(
  '/:photoId/favorite',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const photo = await prisma.photo.findUnique({ where: { id: photoId }, select: { id: true, eventId: true, isFavorite: true } });
      if (!photo) return res.status(404).json({ error: 'Foto nicht gefunden' });
      if (!(await hasEventManageAccess(req, photo.eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const updated = await prisma.photo.update({
        where: { id: photoId },
        data: { isFavorite: !photo.isFavorite },
        select: { id: true, isFavorite: true },
      });
      res.json({ isFavorite: updated.isFavorite });
    } catch (error: any) {
      logger.error('Favorite toggle error', { error: error.message });
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

// POST /bulk/move-category — Move multiple photos to a different category
router.post(
  '/bulk/move-category',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, categoryId, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { categoryId: categoryId || null },
      });

      res.json({ updated: result.count, categoryId: categoryId || null });
    } catch (error: any) {
      logger.error('Bulk move-category error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /bulk/favorite — Set isFavorite on multiple photos at once
router.post(
  '/bulk/favorite',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, isFavorite, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { isFavorite: isFavorite !== false },
      });

      res.json({ updated: result.count, isFavorite: isFavorite !== false });
    } catch (error: any) {
      logger.error('Bulk favorite error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /bulk/tag — assign tags to multiple photos at once
router.post(
  '/bulk/tag',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, tags, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags Array erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const cleanTags = tags.filter((t: any) => typeof t === 'string' && t.trim()).map((t: string) => t.trim());

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { tags: cleanTags },
      });

      res.json({ updated: result.count, tags: cleanTags });
    } catch (error: any) {
      logger.error('Bulk tag error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /bulk/reject — Reject pending photos (all or by ID list)
router.post(
  '/bulk/reject',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, photoIds } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const where: any = { eventId, deletedAt: null };
      if (Array.isArray(photoIds) && photoIds.length > 0) where.id = { in: photoIds };
      else where.status = 'PENDING';

      const result = await prisma.photo.updateMany({
        where,
        data: { status: 'REJECTED' as any },
      });

      res.json({ rejected: result.count });
    } catch (error: any) {
      logger.error('Bulk reject error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Ablehnen' });
    }
  }
);

// POST /bulk/approve — Approve all pending photos for an event
router.post(
  '/bulk/approve',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const result = await prisma.photo.updateMany({
        where: { eventId, status: 'PENDING', deletedAt: null },
        data: { status: 'APPROVED' as any },
      });

      logger.info('Bulk approve photos', { eventId, count: result.count, userId: req.userId });
      res.json({ approved: result.count });
    } catch (error: any) {
      logger.error('Bulk approve error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Freigeben' });
    }
  }
);

// POST /bulk/restore — Restore bulk-deleted photos back to APPROVED
router.post(
  '/bulk/restore',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) return res.status(400).json({ error: 'photoIds erforderlich' });
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { status: 'APPROVED' as any, deletedAt: null },
      });

      res.json({ restored: result.count });
    } catch (error: any) {
      logger.error('Bulk restore error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Wiederherstellen' });
    }
  }
);

// POST /bulk/delete — Bulk soft-delete photos
router.post(
  '/bulk/delete',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoIds, eventId } = req.body;
      if (!Array.isArray(photoIds) || photoIds.length === 0) {
        return res.status(400).json({ error: 'photoIds erforderlich' });
      }
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const result = await prisma.photo.updateMany({
        where: { id: { in: photoIds }, eventId },
        data: { status: 'DELETED' as any, deletedAt: new Date() },
      });

      logger.info('Bulk delete photos', { eventId, count: result.count, userId: req.userId });
      res.json({ deleted: result.count });
    } catch (error: any) {
      logger.error('Bulk delete error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }
);

// POST /bulk/ai-caption — Generate context captions for multiple photos
router.post(
  '/bulk/ai-caption',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, overwrite = false } = req.body;
      if (!eventId) return res.status(400).json({ error: 'eventId erforderlich' });
      if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

      const where: any = { eventId, deletedAt: null };
      if (!overwrite) where.description = null;

      const photos = await prisma.photo.findMany({
        where,
        select: { id: true, uploadedBy: true, faceCount: true, tags: true },
        take: 100,
      });

      let updated = 0;
      for (const photo of photos) {
        const parts: string[] = [];
        if (photo.uploadedBy) parts.push(`Hochgeladen von ${photo.uploadedBy}`);
        if (photo.faceCount && photo.faceCount > 0) parts.push(`${photo.faceCount} Person${photo.faceCount !== 1 ? 'en' : ''}`);
        if (photo.tags && photo.tags.length > 0) parts.push(photo.tags.join(', '));
        const caption = parts.length > 0 ? parts.join(' · ') : 'Foto vom Event';
        await prisma.photo.update({ where: { id: photo.id }, data: { description: caption } });
        updated++;
      }

      res.json({ updated, total: photos.length });
    } catch (error: any) {
      logger.error('Bulk AI caption error', { error: error.message });
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

// GET /api/events/:eventId/photos/ratings — Aggregate photo ratings/votes
router.get('/:eventId/photos/ratings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const votes = await (prisma as any).photoVote.groupBy({
      by: ['photoId'],
      where: { eventId },
      _avg: { rating: true },
      _count: { rating: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 50,
    });

    res.json({ ratings: votes.map((v: any) => ({ photoId: v.photoId, avgRating: v._avg.rating || 0, voteCount: v._count.rating })) });
  } catch (error: any) {
    logger.error('Ratings aggregate error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/leaderboard — Top uploaders leaderboard
router.get('/:eventId/photos/leaderboard', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, status: 'APPROVED', deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    res.json({
      leaderboard: grouped.map((g: any, i: number) => ({
        rank: i + 1,
        name: g.uploadedBy || 'Anonym',
        count: g._count.id,
      })),
    });
  } catch (error: any) {
    logger.error('Leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/tag-stats — Tag usage statistics
router.get('/:eventId/photos/tag-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { tags: true },
    });

    const tagMap = new Map<string, number>();
    for (const p of photos) {
      for (const tag of (p.tags || [])) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
    }

    const tagStats = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ tagStats });
  } catch (error: any) {
    logger.error('Tag stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/status-count — Count by status
router.get('/:eventId/photos/status-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['status'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const g of grouped) result[g.status] = g._count.id;
    res.json({ statusCount: result });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/by-guest — Photo count grouped by uploadedBy
router.get('/:eventId/photos/by-guest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({
      byGuest: grouped.map((g: any) => ({
        uploadedBy: g.uploadedBy || 'Anonym',
        count: g._count.id,
      })),
    });
  } catch (error: any) {
    logger.error('Photos by guest error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/recent — Most recent uploads
router.get('/:eventId/photos/recent', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 12);
    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, status: isManager ? undefined : 'APPROVED' },
      select: { id: true, url: true, uploadedBy: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ photos });
  } catch (error: any) {
    logger.error('Recent photos error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/top-liked — Top liked photos
router.get('/:eventId/photos/top-liked', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);

    const photos = await prisma.photo.findMany({
      where: { eventId, status: 'APPROVED', deletedAt: null },
      select: { id: true, url: true, uploadedBy: true, isFavorite: true, createdAt: true, _count: { select: { likes: true } } },
      orderBy: { likes: { _count: 'desc' } } as any,
      take: limit,
    });

    res.json({ photos });
  } catch (error: any) {
    logger.error('Top liked error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/download-stats — Top downloaded photos
router.get('/:eventId/photos/download-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, uploadedBy: true, views: true, likes: true, createdAt: true },
      orderBy: { views: 'desc' },
      take: 20,
    });

    const totalViews = photos.reduce((s, p) => s + (p.views || 0), 0);
    res.json({ topPhotos: photos, totalViews });
  } catch (error: any) {
    logger.error('Download stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/export-csv — Export photo list as CSV
router.get('/:eventId/photos/export-csv', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, uploadedBy: true, status: true, createdAt: true, views: true, tags: true },
      orderBy: { createdAt: 'desc' },
    });

    const lines = ['ID,Uploader,Status,Datum,Views,Tags'];
    for (const p of photos) {
      const date = new Date(p.createdAt).toISOString().split('T')[0];
      lines.push(`${p.id},"${(p.uploadedBy || '').replace(/"/g, '')}",${p.status},${date},${p.views || 0},"${(p.tags || []).join(';')}"`);
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="photos-${eventId}.csv"`);
    res.send(lines.join('\n'));
  } catch (error: any) {
    logger.error('Photos CSV export error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Export' });
  }
});

// GET /api/events/:eventId/photos/top — Top N photos by likes
router.get('/:eventId/photos/top', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);
    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;

    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        status: isManager ? { not: 'DELETED' as any } : 'APPROVED' as any,
        deletedAt: null,
      },
      select: { id: true, url: true, views: true, uploadedBy: true, createdAt: true },
      orderBy: [{ views: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.json({ photos: photos.map((p: any) => ({ ...p, url: `/cdn/${p.id}` })) });
  } catch (error: any) {
    logger.error('Top photos error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/tags — All unique tags used in event photos
router.get('/:eventId/photos/tags', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;

    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        deletedAt: null,
        status: isManager ? { not: 'DELETED' as any } : 'APPROVED' as any,
      },
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const photo of photos) {
      for (const tag of (photo.tags || [])) {
        if (tag) tagSet.add(tag);
      }
    }

    const tags = Array.from(tagSet).sort();
    res.json({ tags, count: tags.length });
  } catch (error: any) {
    logger.error('Tags list error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/stats — Photo counts breakdown
router.get('/:eventId/photos/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [total, approved, pending, rejected, deleted, favorites, today, totalViews] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, status: 'APPROVED', deletedAt: null } }),
      prisma.photo.count({ where: { eventId, status: 'PENDING', deletedAt: null } }),
      prisma.photo.count({ where: { eventId, status: 'REJECTED', deletedAt: null } }),
      prisma.photo.count({ where: { eventId, status: 'DELETED' } }),
      prisma.photo.count({ where: { eventId, isFavorite: true, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, createdAt: { gte: todayStart }, deletedAt: null } }),
      prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
    ]);

    res.json({ total, approved, pending, rejected, deleted, favorites, today, totalViews: totalViews._sum.views || 0 });
  } catch (error: any) {
    logger.error('Photo stats error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/events/:eventId/photos/by-uploader — Photo counts grouped by uploader name
router.get('/:eventId/photos/by-uploader', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const groups = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null, status: { not: 'DELETED' as any } },
      _count: true,
      orderBy: { _count: { uploadedBy: 'desc' } },
      take: 100,
    });

    res.json({
      uploaders: groups.map(g => ({
        name: g.uploadedBy || 'Anonym',
        count: g._count,
      })),
    });
  } catch (error: any) {
    logger.error('By-uploader error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/live-stats — Fotos heute, top Uploader
router.get('/:eventId/photos/live-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayCount, topUploaders, recentActivity] = await Promise.all([
      prisma.photo.count({
        where: { eventId, createdAt: { gte: todayStart }, deletedAt: null },
      }),
      prisma.photo.groupBy({
        by: ['uploadedBy'],
        where: { eventId, deletedAt: null, uploadedBy: { not: null } },
        _count: true,
        orderBy: { _count: { uploadedBy: 'desc' } },
        take: 5,
      }),
      prisma.photo.findMany({
        where: { eventId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      }),
    ]);

    res.json({
      todayCount,
      topUploaders: topUploaders.map(u => ({ name: u.uploadedBy || 'Anonym', count: u._count })),
      lastPhotoAt: recentActivity[0]?.createdAt || null,
    });
  } catch (error: any) {
    logger.error('Live stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Live-Stats' });
  }
});

// GET /api/events/:eventId/photos/download-zip — Download all event photos as ZIP
router.get(
  '/:eventId/photos/download-zip',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, slug: true } });
      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const photos = await prisma.photo.findMany({
        where: { eventId, deletedAt: null, status: { not: 'DELETED' as any } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, storagePath: true, url: true, createdAt: true },
      });

      if (photos.length === 0) {
        return res.status(404).json({ error: 'Keine Fotos zum Herunterladen' });
      }

      const archiver = require('archiver');
      const safeName = (event.slug || event.id).replace(/[^a-zA-Z0-9-_]/g, '_');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}-fotos.zip"`);

      const archive = archiver('zip', { zlib: { level: 1 } }); // level 1 = fast (photos already compressed)
      archive.on('error', (err: Error) => {
        logger.error('ZIP archive error', { err: err.message, eventId });
        if (!res.headersSent) res.status(500).json({ error: 'ZIP-Fehler' });
      });

      archive.pipe(res);

      let added = 0;
      for (const photo of photos) {
        try {
          if (photo.storagePath) {
            const buffer = await storageService.getFile(photo.storagePath);
            const ext = photo.storagePath.split('.').pop() || 'jpg';
            archive.append(buffer, { name: `foto-${String(added + 1).padStart(4, '0')}.${ext}` });
            added++;
          } else if (photo.url) {
            const { default: axios } = await import('axios');
            const res2 = await axios.get(photo.url, { responseType: 'arraybuffer', timeout: 10000 });
            const ext = photo.url.split('.').pop()?.split('?')[0] || 'jpg';
            archive.append(Buffer.from(res2.data), { name: `foto-${String(added + 1).padStart(4, '0')}.${ext}` });
            added++;
          }
        } catch (err: any) {
          logger.warn('Skip photo in ZIP', { photoId: photo.id, err: err.message });
        }
      }

      await archive.finalize();
      logger.info('ZIP download complete', { eventId, photoCount: added });
    } catch (error: any) {
      logger.error('ZIP download error', { error: error.message, eventId: req.params.eventId });
      if (!res.headersSent) res.status(500).json({ error: 'Fehler beim ZIP-Download' });
    }
  }
);

export default router;

