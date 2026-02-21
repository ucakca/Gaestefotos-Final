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

// GET /api/events/:eventId/photos/face-stats — Face detection statistics
router.get('/:eventId/photos/face-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withFaces, noFaces] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: 0 } }),
    ]);

    const faceResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _sum: { faceCount: true },
    });

    const faceCountGroups = await prisma.photo.groupBy({
      by: ['faceCount'],
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _count: { id: true },
      orderBy: { faceCount: 'asc' },
    });

    res.json({
      total, withFaces,
      faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
      avgFaces: faceResult._avg.faceCount ? Math.round(faceResult._avg.faceCount * 10) / 10 : 0,
      maxFaces: faceResult._max.faceCount || 0,
      totalFaces: faceResult._sum.faceCount || 0,
      distribution: (faceCountGroups as any[]).map((g) => ({ faceCount: g.faceCount, count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Face stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/category-leader — Top photo per category by quality
router.get('/:eventId/photos/category-leader', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const categories = await prisma.category.findMany({
      where: { eventId },
      select: { id: true, name: true },
    });

    const leaders = await Promise.all(categories.map(async (cat) => {
      const best = await prisma.photo.findFirst({
        where: { eventId, categoryId: cat.id, deletedAt: null },
        select: { id: true, url: true, title: true, qualityScore: true, views: true },
        orderBy: [{ qualityScore: 'desc' }, { views: 'desc' }],
      });
      const count = await prisma.photo.count({ where: { eventId, categoryId: cat.id, deletedAt: null } });
      return { categoryId: cat.id, categoryName: cat.name, count, leader: best };
    }));

    res.json({ categories: leaders.filter((c) => c.count > 0) });
  } catch (error: any) {
    logger.error('Category leader error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/guest-leaderboard — Top20 guests by total engagement
router.get('/:eventId/photos/guest-leaderboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['guestId'],
      where: { eventId, deletedAt: null, guestId: { not: null } },
      _count: { id: true },
      _sum: { views: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const guestIds = (grouped as any[]).map((g) => g.guestId!).filter(Boolean);
    const guests = guestIds.length > 0 ? await prisma.guest.findMany({
      where: { id: { in: guestIds } },
      select: { id: true, firstName: true, lastName: true },
    }) : [];

    const leaderboard = (grouped as any[]).map((g) => {
      const guest = guests.find((gu) => gu.id === g.guestId);
      return {
        guestId: g.guestId,
        firstName: guest?.firstName || null,
        lastName: guest?.lastName || null,
        photoCount: g._count.id,
        totalViews: g._sum.views || 0,
      };
    });

    res.json({ leaderboard });
  } catch (error: any) {
    logger.error('Guest leaderboard error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/purge-upcoming — Photos scheduled for purge in next 7 days
router.get('/:eventId/photos/purge-upcoming', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const days = parseInt((req.query.days as string) || '7', 10);
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const [upcoming, overdue] = await Promise.all([
      prisma.photo.findMany({
        where: { eventId, deletedAt: null, purgeAfter: { lte: cutoff, gt: new Date() } },
        select: { id: true, url: true, title: true, purgeAfter: true },
        orderBy: { purgeAfter: 'asc' },
        take: 50,
      }),
      prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { lte: new Date() } } }),
    ]);

    res.json({ upcoming, overdue, daysWindow: days });
  } catch (error: any) {
    logger.error('Purge upcoming error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/trending — Most active photos last 24h (views+likes)
router.get('/:eventId/photos/trending', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentLikes = await prisma.photoLike.groupBy({
      by: ['photoId'],
      where: { photo: { eventId }, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const photoIds = (recentLikes as any[]).map((l) => l.photoId);
    const photos = photoIds.length > 0 ? await prisma.photo.findMany({
      where: { id: { in: photoIds }, deletedAt: null },
      select: { id: true, url: true, title: true, views: true },
    }) : [];

    const result = (recentLikes as any[]).map((l) => ({
      ...photos.find((p) => p.id === l.photoId),
      recentLikes: l._count.id,
    }));

    res.json({ trending: result, since });
  } catch (error: any) {
    logger.error('Trending error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/quality-grade-board — Top photo per quality grade A-F
router.get('/:eventId/photos/quality-grade-board', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grades = [
      { grade: 'A', min: 80, max: 100 },
      { grade: 'B', min: 60, max: 80 },
      { grade: 'C', min: 40, max: 60 },
      { grade: 'D', min: 20, max: 40 },
      { grade: 'F', min: 0, max: 20 },
    ];

    const board = await Promise.all(grades.map(async ({ grade, min, max }) => {
      const best = await prisma.photo.findFirst({
        where: { eventId, deletedAt: null, qualityScore: { gte: min, lt: max } },
        select: { id: true, url: true, title: true, qualityScore: true },
        orderBy: { qualityScore: 'desc' },
      });
      const count = await prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: min, lt: max } } });
      return { grade, min, max, count, best };
    }));

    res.json({ board });
  } catch (error: any) {
    logger.error('Quality grade board error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/size-bucket — Photos grouped by file size buckets
router.get('/:eventId/photos/size-bucket', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      select: { sizeBytes: true },
    });

    const buckets = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };
    for (const p of photos) {
      const mb = Number(p.sizeBytes!) / 1024 / 1024;
      if (mb < 0.5) buckets.tiny++;
      else if (mb < 2) buckets.small++;
      else if (mb < 5) buckets.medium++;
      else if (mb < 10) buckets.large++;
      else buckets.huge++;
    }

    res.json({ total: photos.length, buckets });
  } catch (error: any) {
    logger.error('Size bucket error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/view-leader — Top20 photos by view count
router.get('/:eventId/photos/view-leader', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, views: { gt: 0 } },
      select: { id: true, url: true, title: true, views: true, uploadedBy: true },
      orderBy: { views: 'desc' },
      take: 20,
    });

    res.json({ photos });
  } catch (error: any) {
    logger.error('View leader error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/recent-deleted — Recently soft-deleted photos (last 50)
router.get('/:eventId/photos/recent-deleted', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: { not: null } },
      select: { id: true, url: true, title: true, deletedAt: true, uploadedBy: true, createdAt: true },
      orderBy: { deletedAt: 'desc' },
      take: limit,
    });

    res.json({ photos, total: photos.length });
  } catch (error: any) {
    logger.error('Recent deleted error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/geo-cluster — GPS photos grouped by rough lat/lng grid
router.get('/:eventId/photos/geo-cluster', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true },
    });

    const precision = parseFloat((req.query.precision as string) || '2');
    const factor = Math.pow(10, precision);

    const clusterMap: Record<string, { lat: number; lng: number; count: number; ids: string[] }> = {};
    for (const p of photos) {
      const lat = Math.round(p.latitude! * factor) / factor;
      const lng = Math.round(p.longitude! * factor) / factor;
      const key = `${lat},${lng}`;
      if (!clusterMap[key]) clusterMap[key] = { lat, lng, count: 0, ids: [] };
      clusterMap[key].count++;
      if (clusterMap[key].ids.length < 5) clusterMap[key].ids.push(p.id);
    }

    const clusters = Object.values(clusterMap).sort((a, b) => b.count - a.count);
    res.json({ total: photos.length, clusters: clusters.slice(0, 50) });
  } catch (error: any) {
    logger.error('Geo cluster error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/like-leader — Top20 photos by like count
router.get('/:eventId/photos/like-leader', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, title: true, uploadedBy: true, _count: { select: { likes: true } } },
      orderBy: { likes: { _count: 'desc' } },
      take: 20,
    });

    res.json({ photos: photos.map((p: any) => ({ ...p, likeCount: p._count.likes, _count: undefined })) });
  } catch (error: any) {
    logger.error('Like leader error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/status-timeline — Status changes per day (createdAt)
router.get('/:eventId/photos/status-timeline', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId },
      select: { createdAt: true, status: true },
    });

    const dayMap: Record<string, Record<string, number>> = {};
    for (const p of photos) {
      const day = p.createdAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = {};
      dayMap[day][p.status] = (dayMap[day][p.status] || 0) + 1;
    }

    const timeline = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    res.json({ timeline });
  } catch (error: any) {
    logger.error('Status timeline error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/comment-stats — Comment statistics
router.get('/:eventId/photos/comment-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, totalComments, approvedComments, pendingComments] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photoComment.count({ where: { photo: { eventId } } }),
      prisma.photoComment.count({ where: { photo: { eventId }, status: 'APPROVED' as any } }),
      prisma.photoComment.count({ where: { photo: { eventId }, status: 'PENDING' as any } }),
    ]);

    const photosWithComments = await prisma.photoComment.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
    });

    const topCommented = photosWithComments.sort((a: any, b: any) => b._count.id - a._count.id)[0];

    res.json({
      total,
      totalComments, approvedComments, pendingComments,
      photosWithComments: photosWithComments.length,
      commentRate: total > 0 ? Math.round((photosWithComments.length / total) * 100) : 0,
      avgCommentsPerPhoto: photosWithComments.length > 0 ? Math.round((totalComments / photosWithComments.length) * 10) / 10 : 0,
      topCommentedPhotoId: topCommented?.photoId || null,
      topCommentedCount: (topCommented as any)?._count?.id || 0,
    });
  } catch (error: any) {
    logger.error('Comment stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/vote-distribution — Vote rating distribution 1-5
router.get('/:eventId/photos/vote-distribution', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const votes = await prisma.photoVote.findMany({
      where: { photo: { eventId } },
      select: { rating: true },
    });

    const ratingMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const v of votes) ratingMap[v.rating] = (ratingMap[v.rating] || 0) + 1;

    const total = votes.length;
    const avg = total > 0 ? Math.round(votes.reduce((s, v) => s + v.rating, 0) / total * 10) / 10 : null;

    res.json({
      total,
      avg,
      distribution: Object.entries(ratingMap).map(([r, count]) => ({
        rating: parseInt(r),
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      })),
    });
  } catch (error: any) {
    logger.error('Vote distribution error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/engagement-score — Per-photo engagement score top20
router.get('/:eventId/photos/engagement-score', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, title: true, views: true, _count: { select: { likes: true, comments: true } } },
      take: 200,
    });

    const scored = photos.map((p: any) => ({
      id: p.id, url: p.url, title: p.title,
      views: p.views, likes: p._count.likes, comments: p._count.comments,
      engagementScore: Math.round((p.views * 0.1 + p._count.likes * 2 + p._count.comments * 3) * 10) / 10,
    })).sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 20);

    res.json({ photos: scored });
  } catch (error: any) {
    logger.error('Engagement score error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/month-stats — Upload distribution by month (1-12)
router.get('/:eventId/photos/month-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthMap[m] = 0;
    for (const p of photos) monthMap[p.createdAt.getMonth() + 1]++;

    const months = Object.entries(monthMap).map(([m, count]) => ({ month: parseInt(m), name: monthNames[parseInt(m) - 1], count }));
    const peakMonth = months.reduce((a, b) => b.count > a.count ? b : a, months[0]);

    res.json({ months, peakMonth: peakMonth.month, peakMonthName: peakMonth.name, peakMonthCount: peakMonth.count });
  } catch (error: any) {
    logger.error('Month stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/hash-stats — Perceptual hash / MD5 deduplication stats
router.get('/:eventId/photos/hash-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withMd5, withPerceptual, uniqueMd5, uniquePerceptual] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
      prisma.photo.groupBy({ by: ['md5Hash'], where: { eventId, deletedAt: null, md5Hash: { not: null } }, _count: { id: true } }),
      prisma.photo.groupBy({ by: ['perceptualHash'], where: { eventId, deletedAt: null, perceptualHash: { not: null } }, _count: { id: true } }),
    ]);

    const uniqueMd5Count = (uniqueMd5 as any[]).length;
    const uniquePerceptualCount = (uniquePerceptual as any[]).length;

    res.json({
      total,
      withMd5Hash: withMd5, uniqueMd5Hashes: uniqueMd5Count,
      md5DupeRate: withMd5 > uniqueMd5Count ? Math.round(((withMd5 - uniqueMd5Count) / withMd5) * 100) : 0,
      withPerceptualHash: withPerceptual, uniquePerceptualHashes: uniquePerceptualCount,
      perceptualDupeRate: withPerceptual > uniquePerceptualCount ? Math.round(((withPerceptual - uniquePerceptualCount) / withPerceptual) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Hash stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/favorite-stats — Favorite/story-only photos
router.get('/:eventId/photos/favorite-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, favorites, storyOnly, bestInGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
    ]);

    res.json({
      total, favorites, storyOnly, bestInGroup,
      favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0,
      storyOnlyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Favorite stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/duplicate-group-stats — Duplicate group statistics
router.get('/:eventId/photos/duplicate-group-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, inGroup, uniqueGroups] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
      prisma.photo.groupBy({
        by: ['duplicateGroupId'],
        where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
        _count: { id: true },
      }),
    ]);

    const groupSizes = uniqueGroups as any[];
    const avgGroupSize = groupSizes.length > 0 ? Math.round((inGroup / groupSizes.length) * 10) / 10 : 0;

    res.json({
      total, inDuplicateGroup: inGroup,
      duplicateGroupCount: groupSizes.length,
      dupeRate: total > 0 ? Math.round((inGroup / total) * 100) : 0,
      avgGroupSize,
    });
  } catch (error: any) {
    logger.error('Duplicate group stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/blur-stats — Blur detection statistics
router.get('/:eventId/photos/blur-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withQuality, lowQuality, midQuality, highQuality] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { lt: 30 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: 30, lt: 70 } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { gte: 70 } } }),
    ]);

    const qResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
    });

    res.json({
      total, withQualityScore: withQuality,
      lowQuality, midQuality, highQuality,
      lowQualityRate: total > 0 ? Math.round((lowQuality / total) * 100) : 0,
      avgQualityScore: qResult._avg.qualityScore ? Math.round(qResult._avg.qualityScore * 10) / 10 : null,
    });
  } catch (error: any) {
    logger.error('Blur stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/ai-stats — AI analysis statistics (captions/labels)
router.get('/:eventId/photos/ai-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withTitle, withDescription, withTags, withFaceData] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, title: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, description: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, tags: { isEmpty: false } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } }),
    ]);

    res.json({
      total,
      withTitle, titleRate: total > 0 ? Math.round((withTitle / total) * 100) : 0,
      withDescription, descriptionRate: total > 0 ? Math.round((withDescription / total) * 100) : 0,
      withTags, tagsRate: total > 0 ? Math.round((withTags / total) * 100) : 0,
      withFaces: withFaceData, faceRate: total > 0 ? Math.round((withFaceData / total) * 100) : 0,
      enrichedTotal: await prisma.photo.count({ where: { eventId, deletedAt: null, OR: [{ title: { not: null } }, { description: { not: null } }, { faceCount: { gt: 0 } }] } }),
    });
  } catch (error: any) {
    logger.error('AI stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/tag-stats — Top tags by frequency
router.get('/:eventId/photos/tag-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { tags: true },
    });

    const tagMap: Record<string, number> = {};
    for (const p of photos) {
      for (const tag of p.tags) {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      }
    }

    const tags = Object.entries(tagMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ tags, uniqueTags: Object.keys(tagMap).length, totalTagUsages: Object.values(tagMap).reduce((a, b) => a + b, 0) });
  } catch (error: any) {
    logger.error('Tag stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/uploader-stats — Photos by uploader name/ID top20
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json({
      uploaders: grouped.map((g: any) => ({ uploadedBy: g.uploadedBy || 'anonymous', count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/activity-feed — Recent uploads/likes/comments (last 50)
router.get('/:eventId/photos/activity-feed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 100);

    const [recentUploads, recentLikes, recentComments] = await Promise.all([
      prisma.photo.findMany({
        where: { eventId, deletedAt: null },
        select: { id: true, url: true, title: true, uploadedBy: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.photoLike.findMany({
        where: { photo: { eventId } },
        select: { id: true, photoId: true, guestId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.photoComment.findMany({
        where: { photo: { eventId } },
        select: { id: true, photoId: true, authorName: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    res.json({ recentUploads, recentLikes, recentComments });
  } catch (error: any) {
    logger.error('Activity feed error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/overview — Master summary of all photo statistics
router.get('/:eventId/photos/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, approved, pending, rejected, deleted, withGps, withQuality, totalViews, totalLikes, totalComments] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' as any } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, qualityScore: { not: null } } }),
      prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photoComment.count({ where: { photo: { eventId } } }),
    ]);

    const sizeResult = await prisma.photo.aggregate({ where: { eventId, deletedAt: null, sizeBytes: { not: null } }, _sum: { sizeBytes: true } });
    const qualityResult = await prisma.photo.aggregate({ where: { eventId, deletedAt: null, qualityScore: { not: null } }, _avg: { qualityScore: true } });
    const newestPhoto = await prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const firstPhoto = await prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } });

    res.json({
      total, approved, pending, rejected, deleted,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      withGps, gpsRate: total > 0 ? Math.round((withGps / total) * 100) : 0,
      withQuality, avgQuality: qualityResult._avg.qualityScore ? Math.round(qualityResult._avg.qualityScore * 10) / 10 : null,
      totalViews: totalViews._sum.views || 0,
      totalLikes, totalComments,
      totalSizeMB: sizeResult._sum.sizeBytes ? Math.round(Number(sizeResult._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : null,
      firstPhotoAt: firstPhoto?.createdAt || null,
      newestPhotoAt: newestPhoto?.createdAt || null,
    });
  } catch (error: any) {
    logger.error('Overview error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/daily-stats — Upload distribution by weekday (0=Sun..6=Sat)
router.get('/:eventId/photos/daily-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const dayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const p of photos) dayMap[p.createdAt.getDay()]++;

    const days = Object.entries(dayMap).map(([d, count]) => ({ day: parseInt(d), name: dayNames[parseInt(d)], count }));
    const peakDay = days.reduce((a, b) => b.count > a.count ? b : a, days[0]);

    res.json({ days, peakDay: peakDay.day, peakDayName: peakDay.name, peakDayCount: peakDay.count });
  } catch (error: any) {
    logger.error('Daily stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/best-of — Best photo by views, likes, votes, quality
router.get('/:eventId/photos/best-of', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [mostViewed, mostLiked, bestQuality, newest] = await Promise.all([
      prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { views: 'desc' }, select: { id: true, url: true, title: true, views: true } }),
      prisma.photo.findFirst({
        where: { eventId, deletedAt: null },
        orderBy: { likes: { _count: 'desc' } },
        select: { id: true, url: true, title: true, _count: { select: { likes: true } } },
      }),
      prisma.photo.findFirst({ where: { eventId, deletedAt: null, qualityScore: { not: null } }, orderBy: { qualityScore: 'desc' }, select: { id: true, url: true, title: true, qualityScore: true } }),
      prisma.photo.findFirst({ where: { eventId, deletedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true, url: true, title: true, createdAt: true } }),
    ]);

    res.json({ mostViewed, mostLiked, bestQuality, newest });
  } catch (error: any) {
    logger.error('Best-of error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/hourly-stats — Upload distribution by hour (0-23)
router.get('/:eventId/photos/hourly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const p of photos) hourMap[p.createdAt.getHours()]++;

    const hours = Object.entries(hourMap).map(([h, count]) => ({ hour: parseInt(h), count }));
    const peakHour = hours.reduce((a, b) => b.count > a.count ? b : a, { hour: 0, count: 0 });
    const quietHour = hours.filter(h => h.count > 0).reduce((a, b) => b.count < a.count ? b : a, { hour: 0, count: Infinity });

    res.json({ hours, peakHour: peakHour.hour, peakHourCount: peakHour.count, quietHour: quietHour.count === Infinity ? null : quietHour.hour });
  } catch (error: any) {
    logger.error('Hourly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/storage-stats — Storage size breakdown
router.get('/:eventId/photos/storage-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      _sum: { sizeBytes: true },
      _avg: { sizeBytes: true },
      _max: { sizeBytes: true },
      _min: { sizeBytes: true },
      _count: { id: true },
    });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      select: { sizeBytes: true, storagePath: true },
    });

    const formatMap: Record<string, number> = {};
    for (const p of photos) {
      const ext = (p.storagePath.split('.').pop() || 'unknown').toLowerCase();
      formatMap[ext] = (formatMap[ext] || 0) + 1;
    }

    const toMB = (b: bigint | number | null) => b ? Math.round(Number(b) / 1024 / 1024 * 100) / 100 : null;

    res.json({
      withSize: result._count.id,
      totalMB: toMB(result._sum.sizeBytes),
      avgMB: toMB(result._avg.sizeBytes),
      maxMB: toMB(result._max.sizeBytes),
      minMB: toMB(result._min.sizeBytes),
      formats: Object.entries(formatMap).sort(([, a], [, b]) => b - a).map(([mime, count]) => ({ mime, count })),
    });
  } catch (error: any) {
    logger.error('Storage stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/top-rated — Combined quality+votes score top20
router.get('/:eventId/photos/top-rated', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, title: true, qualityScore: true, views: true, uploadedBy: true },
      orderBy: [{ qualityScore: 'desc' }, { views: 'desc' }],
      take: 20,
    });

    const voteTotals = await prisma.photoVote.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _avg: { rating: true },
      _count: { id: true },
    });
    const voteMap = Object.fromEntries(voteTotals.map((v: any) => [v.photoId, { avg: v._avg.rating || 0, count: v._count.id }]));

    res.json({
      photos: photos.map((p) => {
        const voteInfo = voteMap[p.id] || { avg: 0, count: 0 };
        const score = Math.round(((p.qualityScore || 0) * 0.6 + voteInfo.avg * 10 * 0.4) * 10) / 10;
        return { ...p, voteAvg: Math.round(voteInfo.avg * 10) / 10, voteCount: voteInfo.count, combinedScore: score };
      }).sort((a, b) => b.combinedScore - a.combinedScore),
    });
  } catch (error: any) {
    logger.error('Top rated error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/guest-stats — Photos per guest top20
router.get('/:eventId/photos/guest-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['guestId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    const guestIds = grouped.map((g: any) => g.guestId).filter(Boolean);
    const guests = guestIds.length > 0
      ? await prisma.guest.findMany({ where: { id: { in: guestIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const guestMap = Object.fromEntries(guests.map((g) => [g.id, g]));

    res.json({
      guests: grouped.map((g: any) => {
        const guest = guestMap[g.guestId];
        return {
          guestId: g.guestId,
          name: guest ? `${guest.firstName} ${guest.lastName}`.trim() : null,
          photoCount: g._count.id,
        };
      }),
    });
  } catch (error: any) {
    logger.error('Guest stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/category-stats — Photos per category
router.get('/:eventId/photos/category-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const catIds = grouped.map((g: any) => g.categoryId).filter(Boolean);
    const categories = catIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true } })
      : [];
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

    const total = grouped.reduce((s: number, g: any) => s + g._count.id, 0);
    res.json({
      categories: grouped.map((g: any) => ({
        categoryId: g.categoryId,
        name: catMap[g.categoryId]?.name || 'Uncategorized',
        count: g._count.id,
        pct: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
      })),
      total,
    });
  } catch (error: any) {
    logger.error('Category stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/purge-stats — Deleted and purge-scheduled photos
router.get('/:eventId/photos/purge-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const now = new Date();
    const [total, deleted, withPurge, expiredPurge] = await Promise.all([
      prisma.photo.count({ where: { eventId } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photo.count({ where: { eventId, purgeAfter: { not: null } } }),
      prisma.photo.count({ where: { eventId, purgeAfter: { lte: now } } }),
    ]);

    const soonPurge = await prisma.photo.count({
      where: { eventId, purgeAfter: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
    });

    res.json({
      total, deleted, active: total - deleted,
      deleteRate: total > 0 ? Math.round((deleted / total) * 100) : 0,
      withPurgeSchedule: withPurge,
      expiredPurge, soonPurgeIn7Days: soonPurge,
    });
  } catch (error: any) {
    logger.error('Purge stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/quality-stats — Quality score distribution
router.get('/:eventId/photos/quality-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
      _count: { id: true },
    });

    const total = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      select: { qualityScore: true },
    });

    const qBuckets: Record<string, number> = { 'A (90-100)': 0, 'B (70-89)': 0, 'C (50-69)': 0, 'D (30-49)': 0, 'F (<30)': 0 };
    for (const p of photos) {
      const q = p.qualityScore || 0;
      if (q >= 90) qBuckets['A (90-100)']++;
      else if (q >= 70) qBuckets['B (70-89)']++;
      else if (q >= 50) qBuckets['C (50-69)']++;
      else if (q >= 30) qBuckets['D (30-49)']++;
      else qBuckets['F (<30)']++;
    }

    res.json({
      total, withQuality: result._count.id,
      qualityRate: total > 0 ? Math.round((result._count.id / total) * 100) : 0,
      avgQuality: result._avg.qualityScore ? Math.round(result._avg.qualityScore * 10) / 10 : null,
      minQuality: result._min.qualityScore, maxQuality: result._max.qualityScore,
      gradeBuckets: Object.entries(qBuckets).map(([label, count]) => ({ label, count })),
    });
  } catch (error: any) {
    logger.error('Quality stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/face-analysis — Face detection analysis
router.get('/:eventId/photos/face-analysis', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, faceCount: { not: null } },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _sum: { faceCount: true },
      _count: { id: true },
    });

    const total = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    const withFaces = await prisma.photo.count({ where: { eventId, deletedAt: null, faceCount: { gt: 0 } } });
    const topFacePhoto = await prisma.photo.findFirst({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
      select: { id: true, url: true, faceCount: true },
      orderBy: { faceCount: 'desc' },
    });

    res.json({
      total, withFaceData: result._count.id,
      withFaces, faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
      totalFaces: result._sum.faceCount || 0,
      avgFaces: result._avg.faceCount ? Math.round(result._avg.faceCount * 10) / 10 : 0,
      maxFaces: result._max.faceCount || 0,
      topFacePhoto,
    });
  } catch (error: any) {
    logger.error('Face analysis error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/download-stats — View/download statistics
router.get('/:eventId/photos/download-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    const topViewed = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, views: { gt: 0 } },
      select: { id: true, url: true, title: true, views: true },
      orderBy: { views: 'desc' },
      take: 10,
    });

    const zeroViews = await prisma.photo.count({ where: { eventId, deletedAt: null, views: 0 } });
    const total = result._count.id;

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: result._avg.views ? Math.round(result._avg.views * 10) / 10 : 0,
      maxViews: result._max.views || 0,
      zeroViews,
      seenRate: total > 0 ? Math.round(((total - zeroViews) / total) * 100) : 0,
      topViewed,
    });
  } catch (error: any) {
    logger.error('Download stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/exif-stats — EXIF technical statistics (GPS/focal/ISO/shutter)
router.get('/:eventId/photos/exif-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    let withGps = 0, withFocal = 0, withIso = 0, withShutter = 0;
    const isoValues: number[] = [];
    const focalValues: number[] = [];

    for (const p of photos) {
      const exif = p.exifData as any;
      if (!exif || typeof exif !== 'object') continue;
      if (exif.latitude || exif.GPSLatitude) withGps++;
      if (exif.focalLength || exif.FocalLength) { withFocal++; const v = parseFloat(exif.focalLength || exif.FocalLength); if (!isNaN(v)) focalValues.push(v); }
      if (exif.iso || exif.ISO) { withIso++; const v = parseInt(exif.iso || exif.ISO, 10); if (!isNaN(v)) isoValues.push(v); }
      if (exif.shutterSpeed || exif.ExposureTime) withShutter++;
    }

    const total = photos.length;
    res.json({
      total,
      withGps, gpsRate: total > 0 ? Math.round((withGps / total) * 100) : 0,
      withFocal, focalRate: total > 0 ? Math.round((withFocal / total) * 100) : 0,
      withIso, isoRate: total > 0 ? Math.round((withIso / total) * 100) : 0,
      withShutter, shutterRate: total > 0 ? Math.round((withShutter / total) * 100) : 0,
      avgIso: isoValues.length > 0 ? Math.round(isoValues.reduce((a, b) => a + b, 0) / isoValues.length) : null,
      avgFocal: focalValues.length > 0 ? Math.round(focalValues.reduce((a, b) => a + b, 0) / focalValues.length * 10) / 10 : null,
    });
  } catch (error: any) {
    logger.error('EXIF stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/resolution-stats — Image dimension statistics (from exifData)
router.get('/:eventId/photos/resolution-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    const buckets: Record<string, number> = { '<1MP': 0, '1-4MP': 0, '4-12MP': 0, '12-25MP': 0, '>25MP': 0 };
    let withDimensions = 0;
    const widths: number[] = [], heights: number[] = [];

    for (const p of photos) {
      const exif = p.exifData as any;
      if (!exif || typeof exif !== 'object') continue;
      const w = exif.imageWidth || exif.ExifImageWidth || exif.PixelXDimension || exif.width;
      const h = exif.imageHeight || exif.ExifImageHeight || exif.PixelYDimension || exif.height;
      if (!w || !h) continue;
      withDimensions++;
      widths.push(Number(w)); heights.push(Number(h));
      const mp = (Number(w) * Number(h)) / 1e6;
      if (mp < 1) buckets['<1MP']++;
      else if (mp < 4) buckets['1-4MP']++;
      else if (mp < 12) buckets['4-12MP']++;
      else if (mp < 25) buckets['12-25MP']++;
      else buckets['>25MP']++;
    }

    const avgWidth = widths.length > 0 ? Math.round(widths.reduce((a, b) => a + b, 0) / widths.length) : null;
    const avgHeight = heights.length > 0 ? Math.round(heights.reduce((a, b) => a + b, 0) / heights.length) : null;

    res.json({
      withDimensions, avgWidth, avgHeight,
      maxWidth: widths.length > 0 ? Math.max(...widths) : null,
      maxHeight: heights.length > 0 ? Math.max(...heights) : null,
      megapixelBuckets: Object.entries(buckets).map(([label, count]) => ({ label, count })),
    });
  } catch (error: any) {
    logger.error('Resolution stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/camera-stats — EXIF camera make/model statistics
router.get('/:eventId/photos/camera-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    const makeMap: Record<string, number> = {};
    const modelMap: Record<string, number> = {};
    let withExif = 0;

    for (const p of photos) {
      const exif = p.exifData as any;
      if (!exif || typeof exif !== 'object') continue;
      withExif++;
      const make = exif.make || exif.Make || null;
      const model = exif.model || exif.Model || null;
      if (make) makeMap[make] = (makeMap[make] || 0) + 1;
      if (model) modelMap[model] = (modelMap[model] || 0) + 1;
    }

    const makes = Object.entries(makeMap).sort(([, a], [, b]) => b - a).slice(0, 20).map(([make, count]) => ({ make, count }));
    const models = Object.entries(modelMap).sort(([, a], [, b]) => b - a).slice(0, 20).map(([model, count]) => ({ model, count }));

    res.json({ makes, models, withExif, totalPhotos: photos.length });
  } catch (error: any) {
    logger.error('Camera stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/duplicate-stats — Duplicate detection statistics
router.get('/:eventId/photos/duplicate-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withMd5, withPerceptual, inGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
    ]);

    const dupeGroups = await prisma.photo.groupBy({
      by: ['duplicateGroupId'],
      where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
    });

    res.json({
      total,
      withMd5, md5Rate: total > 0 ? Math.round((withMd5 / total) * 100) : 0,
      withPerceptual, perceptualRate: total > 0 ? Math.round((withPerceptual / total) * 100) : 0,
      inGroup, dupeGroupCount: dupeGroups.length,
      dupeRate: total > 0 ? Math.round((inGroup / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Duplicate stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/approval-stats — Moderation approval statistics
router.get('/:eventId/photos/approval-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const statuses = await prisma.photo.groupBy({
      by: ['status'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
    });

    const total = statuses.reduce((s: number, g: any) => s + g._count.id, 0);
    const statsMap = Object.fromEntries(statuses.map((s: any) => [s.status, s._count.id]));

    res.json({
      total,
      pending: statsMap['PENDING'] || 0,
      approved: statsMap['APPROVED'] || 0,
      rejected: statsMap['REJECTED'] || 0,
      approvalRate: total > 0 ? Math.round(((statsMap['APPROVED'] || 0) / total) * 100) : 0,
      rejectionRate: total > 0 ? Math.round(((statsMap['REJECTED'] || 0) / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Approval stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/weekly-stats — Photos grouped by ISO week (YYYY-Www)
router.get('/:eventId/photos/weekly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const weekMap: Record<string, number> = {};
    for (const p of photos) {
      const d = p.createdAt;
      const jan4 = new Date(d.getFullYear(), 0, 4);
      const weekNum = Math.ceil(((d.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      weekMap[key] = (weekMap[key] || 0) + 1;
    }

    const weeks = Object.entries(weekMap).map(([week, count]) => ({ week, count }));
    const peakWeek = weeks.reduce((a, b) => b.count > a.count ? b : a, { week: '', count: 0 });
    res.json({ weeks, totalWeeks: weeks.length, peakWeek: peakWeek.week, peakWeekCount: peakWeek.count });
  } catch (error: any) {
    logger.error('Weekly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/monthly-stats — Photos grouped by YYYY-MM
router.get('/:eventId/photos/monthly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthMap: Record<string, number> = {};
    for (const p of photos) {
      const key = p.createdAt.toISOString().slice(0, 7);
      monthMap[key] = (monthMap[key] || 0) + 1;
    }

    const months = Object.entries(monthMap).map(([month, count]) => ({ month, count }));
    const peakMonth = months.reduce((a, b) => b.count > a.count ? b : a, { month: '', count: 0 });
    res.json({ months, totalMonths: months.length, peakMonth: peakMonth.month, peakMonthCount: peakMonth.count });
  } catch (error: any) {
    logger.error('Monthly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/comment-stats — Comment statistics per event
router.get('/:eventId/photos/comment-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const totalComments = await prisma.photoComment.count({ where: { photo: { eventId } } });
    const topCommented = await prisma.photoComment.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const pendingComments = await prisma.photoComment.count({ where: { photo: { eventId }, status: 'PENDING' } });
    const totalPhotos = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    res.json({
      totalComments,
      pendingComments,
      avgCommentsPerPhoto: totalPhotos > 0 ? Math.round((totalComments / totalPhotos) * 100) / 100 : 0,
      topCommented: topCommented.map((c: any) => ({ photoId: c.photoId, commentCount: c._count.id })),
    });
  } catch (error: any) {
    logger.error('Comment stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/favorite-stats — Favorite photo statistics
router.get('/:eventId/photos/favorite-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, favorites] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
    ]);

    const topFavorites = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, isFavorite: true },
      select: { id: true, url: true, title: true, uploadedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      total,
      favorites,
      notFavorites: total - favorites,
      favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0,
      recentFavorites: topFavorites,
    });
  } catch (error: any) {
    logger.error('Favorite stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/like-stats — Like statistics per event
router.get('/:eventId/photos/like-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const totalLikes = await prisma.photoLike.count({ where: { photo: { eventId } } });
    const topLiked = await prisma.photoLike.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const totalPhotos = await prisma.photo.count({ where: { eventId, deletedAt: null } });
    res.json({
      totalLikes,
      avgLikesPerPhoto: totalPhotos > 0 ? Math.round((totalLikes / totalPhotos) * 100) / 100 : 0,
      topLiked: topLiked.map((l: any) => ({ photoId: l.photoId, likeCount: l._count.id })),
    });
  } catch (error: any) {
    logger.error('Like stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/tag-cloud — Top 100 tags sorted by frequency
router.get('/:eventId/photos/tag-cloud', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, tags: { isEmpty: false } },
      select: { tags: true },
    });

    const tagMap: Record<string, number> = {};
    for (const p of photos) {
      for (const tag of p.tags) {
        const t = tag.toLowerCase().trim();
        if (t) tagMap[t] = (tagMap[t] || 0) + 1;
      }
    }

    const tags = Object.entries(tagMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ tags, totalUniqueTags: Object.keys(tagMap).length });
  } catch (error: any) {
    logger.error('Tag cloud error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/story-stats — Story-only photo statistics
router.get('/:eventId/photos/story-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, storyOnly] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
    ]);

    const storyUploaders = await prisma.photo.groupBy({
      by: ['uploadedBy'],
      where: { eventId, deletedAt: null, isStoryOnly: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    res.json({
      total,
      storyOnly,
      notStoryOnly: total - storyOnly,
      storyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0,
      topStoryUploaders: storyUploaders.map((u: any) => ({ uploadedBy: u.uploadedBy || 'Anonymous', count: u._count.id })),
    });
  } catch (error: any) {
    logger.error('Story stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/comment-authors — Top commenters by comment count
router.get('/:eventId/photos/comment-authors', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photoComment.groupBy({
      by: ['authorName'],
      where: { photo: { eventId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({ authors: grouped.map((g: any) => ({ authorName: g.authorName, count: g._count.id })), total: grouped.length });
  } catch (error: any) {
    logger.error('Comment authors error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/vote-stats — Voting statistics
router.get('/:eventId/photos/vote-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photoVote.aggregate({
      where: { photo: { eventId } },
      _count: { id: true },
      _avg: { rating: true },
      _min: { rating: true },
      _max: { rating: true },
    });

    const topVoted = await prisma.photoVote.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _avg: { rating: true },
      _count: { id: true },
      orderBy: { _avg: { rating: 'desc' } },
      take: 1,
    });

    res.json({
      totalVotes: result._count.id,
      avgRating: Math.round(((result._avg.rating || 0) * 100)) / 100,
      minRating: result._min.rating || 0,
      maxRating: result._max.rating || 0,
      topPhotoId: topVoted[0]?.photoId || null,
      topPhotoAvgRating: topVoted[0] ? Math.round(((topVoted[0]._avg.rating || 0) * 100)) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Vote stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/size-distribution — sizeBytes buckets
router.get('/:eventId/photos/size-distribution', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      select: { sizeBytes: true },
    });

    const buckets = [
      { label: '<100KB', maxBytes: 100 * 1024, count: 0 },
      { label: '100-500KB', maxBytes: 500 * 1024, count: 0 },
      { label: '500KB-1MB', maxBytes: 1024 * 1024, count: 0 },
      { label: '1-3MB', maxBytes: 3 * 1024 * 1024, count: 0 },
      { label: '3-10MB', maxBytes: 10 * 1024 * 1024, count: 0 },
      { label: '>10MB', maxBytes: Infinity, count: 0 },
    ];

    for (const p of photos) {
      const bytes = Number(p.sizeBytes);
      const bucket = buckets.find(b => bytes < b.maxBytes) || buckets[buckets.length - 1];
      bucket.count++;
    }

    const agg = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, sizeBytes: { not: null } },
      _avg: { sizeBytes: true },
      _sum: { sizeBytes: true },
      _max: { sizeBytes: true },
    });

    res.json({
      buckets: buckets.map(({ label, count }) => ({ label, count })),
      totalSizeMB: agg._sum.sizeBytes ? Math.round(Number(agg._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
      avgSizeKB: agg._avg.sizeBytes ? Math.round(Number(agg._avg.sizeBytes) / 1024 * 10) / 10 : 0,
      maxSizeMB: agg._max.sizeBytes ? Math.round(Number(agg._max.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Size distribution error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/geo-cluster — Geographic bounding box + center point
router.get('/:eventId/photos/geo-cluster', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } },
      _min: { latitude: true, longitude: true },
      _max: { latitude: true, longitude: true },
      _avg: { latitude: true, longitude: true },
      _count: { id: true },
    });

    res.json({
      geoPhotos: result._count.id,
      bbox: { minLat: result._min.latitude, maxLat: result._max.latitude, minLng: result._min.longitude, maxLng: result._max.longitude },
      center: { lat: result._avg.latitude, lng: result._avg.longitude },
    });
  } catch (error: any) {
    logger.error('Geo cluster error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/uploader-stats — Top uploaders by photo count
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
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

    const total = grouped.reduce((s: number, g: any) => s + g._count.id, 0);
    res.json({
      uploaders: grouped.map((g: any) => ({
        uploadedBy: g.uploadedBy || 'Anonymous',
        count: g._count.id,
        rate: total > 0 ? Math.round((g._count.id / total) * 100) : 0,
      })),
      totalUploaders: grouped.length,
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/activity — Recent activity feed (uploads, likes, comments)
router.get('/:eventId/photos/activity', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);

    const [uploads, likes, comments] = await Promise.all([
      prisma.photo.findMany({
        where: { eventId, deletedAt: null },
        select: { id: true, url: true, uploadedBy: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.photoLike.findMany({
        where: { photo: { eventId } },
        select: { id: true, photoId: true, guestId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.photoComment.findMany({
        where: { photo: { eventId } },
        select: { id: true, photoId: true, authorName: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const feed = [
      ...uploads.map((u: any) => ({ type: 'upload', id: u.id, photoId: u.id, actor: u.uploadedBy, createdAt: u.createdAt })),
      ...likes.map((l: any) => ({ type: 'like', id: l.id, photoId: l.photoId, actor: l.guestId, createdAt: l.createdAt })),
      ...comments.map((c: any) => ({ type: 'comment', id: c.id, photoId: c.photoId, actor: c.authorName, content: c.comment, createdAt: c.createdAt })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    res.json({ feed, count: feed.length });
  } catch (error: any) {
    logger.error('Activity feed error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/retention-stats — Photo age distribution buckets
router.get('/:eventId/photos/retention-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const now = new Date();
    const buckets = [
      { label: '<1h', ms: 3600000 },
      { label: '1h-24h', ms: 86400000 },
      { label: '1-7d', ms: 7 * 86400000 },
      { label: '7-30d', ms: 30 * 86400000 },
      { label: '30-90d', ms: 90 * 86400000 },
      { label: '>90d', ms: Infinity },
    ];

    const counts = await Promise.all(
      buckets.map((b, i) => {
        const from = new Date(now.getTime() - b.ms);
        const to = i > 0 ? new Date(now.getTime() - (buckets[i - 1]?.ms ?? 0)) : now;
        if (i === 0) return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { gte: from } } });
        if (b.ms === Infinity) return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { lt: new Date(now.getTime() - buckets[i - 1].ms) } } });
        return prisma.photo.count({ where: { eventId, deletedAt: null, createdAt: { gte: from, lt: to } } });
      })
    );

    res.json({ buckets: buckets.map((b, i) => ({ label: b.label, count: counts[i] })) });
  } catch (error: any) {
    logger.error('Retention stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/category-progress — Photo counts per category with challenge completion
router.get('/:eventId/photos/category-progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const categories = await prisma.category.findMany({
      where: { eventId },
      select: { id: true, name: true, challengeEnabled: true, _count: { select: { photos: true } } },
      orderBy: { order: 'asc' },
    });

    const uncategorized = await prisma.photo.count({
      where: { eventId, deletedAt: null, categoryId: null },
    });

    res.json({
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        challengeEnabled: c.challengeEnabled,
        photoCount: c._count.photos,
      })),
      uncategorized,
      totalCategories: categories.length,
    });
  } catch (error: any) {
    logger.error('Category progress error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/best-in-group — Best photos per duplicate group
router.get('/:eventId/photos/best-in-group', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [totalGroups, bestPhotos, photosInGroups] = await Promise.all([
      prisma.photo.groupBy({
        by: ['duplicateGroupId'],
        where: { eventId, deletedAt: null, duplicateGroupId: { not: null } },
      }).then((g: any[]) => g.length),
      prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
    ]);

    res.json({ totalGroups, bestPhotos, photosInGroups, avgGroupSize: totalGroups > 0 ? Math.round((photosInGroups / totalGroups) * 10) / 10 : 0 });
  } catch (error: any) {
    logger.error('Best-in-group error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/quality-histogram — Quality score distribution (0-10 buckets)
router.get('/:eventId/photos/quality-histogram', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      select: { qualityScore: true },
    });

    const buckets = Array.from({ length: 11 }, (_, i) => ({ bucket: i, label: `${i * 10}-${i * 10 + 9}%`, count: 0 }));
    for (const p of photos) {
      const score = p.qualityScore as number;
      const bucket = Math.min(10, Math.floor((score / 100) * 10));
      buckets[bucket].count++;
    }

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _min: { qualityScore: true },
      _max: { qualityScore: true },
    });

    res.json({
      buckets,
      avgQuality: Math.round(((result._avg.qualityScore || 0) * 100)) / 100,
      minQuality: result._min.qualityScore || 0,
      maxQuality: result._max.qualityScore || 0,
      analyzedPhotos: photos.length,
    });
  } catch (error: any) {
    logger.error('Quality histogram error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/face-stats — Face detection statistics
router.get('/:eventId/photos/face-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { faceCount: true },
      _avg: { faceCount: true },
      _max: { faceCount: true },
      _count: { id: true },
    });

    const withFaces = await prisma.photo.count({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
    });

    const total = result._count.id;
    res.json({
      totalFaces: result._sum.faceCount || 0,
      avgFaces: Math.round(((result._avg.faceCount || 0) * 100)) / 100,
      maxFaces: result._max.faceCount || 0,
      photosWithFaces: withFaces,
      photosWithoutFaces: total - withFaces,
      faceRate: total > 0 ? Math.round((withFaces / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Face stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/mime-stats — Photos grouped by MIME type from EXIF
router.get('/:eventId/photos/mime-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { storagePath: true },
    });

    const mimeMap: Record<string, number> = {};
    for (const p of photos) {
      const ext = p.storagePath.split('.').pop()?.toLowerCase() || 'unknown';
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : ext === 'heic' || ext === 'heif' ? 'image/heic'
        : ext === 'avif' ? 'image/avif'
        : ext === 'tiff' || ext === 'tif' ? 'image/tiff'
        : `other/${ext}`;
      mimeMap[mime] = (mimeMap[mime] || 0) + 1;
    }

    const total = photos.length;
    const mimes = Object.entries(mimeMap)
      .sort(([, a], [, b]) => b - a)
      .map(([mime, count]) => ({ mime, count, rate: total > 0 ? Math.round((count / total) * 100) : 0 }));

    res.json({ mimes, total, totalTypes: mimes.length });
  } catch (error: any) {
    logger.error('MIME stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/by-orientation — Photos grouped by orientation (portrait/landscape/square)
router.get('/:eventId/photos/by-orientation', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { exifData: true },
    });

    let portrait = 0, landscape = 0, square = 0, unknown = 0;
    for (const p of photos) {
      const exif = p.exifData as any;
      const orientation = exif?.Orientation ?? exif?.orientation;
      if (!orientation) { unknown++; continue; }
      const o = Number(orientation);
      if (o === 1 || o === 3) landscape++;
      else if (o === 6 || o === 8) portrait++;
      else if (o === 5 || o === 7) square++;
      else unknown++;
    }

    const total = photos.length;
    res.json({
      portrait, landscape, square, unknown,
      total,
      portraitRate: total > 0 ? Math.round((portrait / total) * 100) : 0,
      landscapeRate: total > 0 ? Math.round((landscape / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('By-orientation error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/by-status — Photos grouped by status
router.get('/:eventId/photos/by-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['status'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = grouped.reduce((sum: number, g: any) => sum + g._count.id, 0);
    res.json({
      statuses: grouped.map((g: any) => ({ status: g.status, count: g._count.id, rate: total > 0 ? Math.round((g._count.id / total) * 100) : 0 })),
      total,
    });
  } catch (error: any) {
    logger.error('By-status error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/by-category — Photos grouped by categoryId
router.get('/:eventId/photos/by-category', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    res.json({
      categories: grouped.map((g: any) => ({ categoryId: g.categoryId || null, count: g._count.id })),
      totalCategories: grouped.length,
    });
  } catch (error: any) {
    logger.error('By-category error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/search — Full-text search by title, description, tags, uploadedBy
router.get('/:eventId/photos/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const q = (req.query.q as string || '').trim();
    if (!q) return res.json({ photos: [], count: 0, query: q });

    const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);

    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        deletedAt: null,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { uploadedBy: { contains: q, mode: 'insensitive' } },
          { tags: { has: q } },
        ],
      },
      select: { id: true, url: true, title: true, description: true, uploadedBy: true, tags: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ photos, count: photos.length, query: q });
  } catch (error: any) {
    logger.error('Photo search error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/random — Random selection of approved photos
router.get('/:eventId/photos/random', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const count = Math.min(50, parseInt(req.query.count as string, 10) || 12);

    const total = await prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } });
    const skip = total > count ? Math.floor(Math.random() * (total - count)) : 0;

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null, status: 'APPROVED' },
      select: { id: true, url: true, storagePathThumb: true, uploadedBy: true, createdAt: true },
      skip,
      take: count,
    });

    res.json({ photos, count: photos.length, total });
  } catch (error: any) {
    logger.error('Random photos error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/recent — Last N uploaded photos
router.get('/:eventId/photos/recent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, status: true, uploadedBy: true, createdAt: true, isFavorite: true, views: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ photos, count: photos.length });
  } catch (error: any) {
    logger.error('Recent photos error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/top — Top photos sorted by views or likes
router.get('/:eventId/photos/top', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const sortBy = (req.query.sortBy as string) || 'views';
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 10);

    const orderBy: any = sortBy === 'likes'
      ? { likes: { _count: 'desc' } }
      : { views: 'desc' };

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, url: true, views: true, status: true, uploadedBy: true, createdAt: true, _count: { select: { likes: true, comments: true } } },
      orderBy,
      take: limit,
    });

    res.json({ photos, sortBy, count: photos.length });
  } catch (error: any) {
    logger.error('Top photos error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/summary — Aggregated dashboard summary (all key stats)
router.get('/:eventId/photos/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [
      total, approved, pending, rejected,
      favorites, storyOnly, withGeo, deleted,
      totalLikes, totalViews,
    ] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photo.aggregate({ where: { eventId, deletedAt: null }, _sum: { views: true } }),
    ]);

    const sizeResult = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { sizeBytes: true },
    });

    res.json({
      total, approved, pending, rejected,
      favorites, storyOnly, withGeo, deleted,
      totalLikes,
      totalViews: (totalViews as any)._sum?.views || 0,
      totalSizeMB: sizeResult._sum.sizeBytes ? Math.round(Number(sizeResult._sum.sizeBytes) / 1024 / 1024 * 100) / 100 : 0,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Summary error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/weekday-stats — Uploads per weekday (0=Sun..6=Sat)
router.get('/:eventId/photos/weekday-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const wdMap: Record<number, number> = {};
    for (let d = 0; d < 7; d++) wdMap[d] = 0;
    for (const p of photos) {
      const wd = new Date(p.createdAt).getDay();
      wdMap[wd]++;
    }

    const weekdays = Array.from({ length: 7 }, (_, d) => ({ weekday: d, name: dayNames[d], count: wdMap[d] }));

    res.json({ weekdays, peakDay: weekdays.reduce((a, b) => b.count > a.count ? b : a).name });
  } catch (error: any) {
    logger.error('Weekday stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/hourly-stats — Uploads per hour of day (0-23)
router.get('/:eventId/photos/hourly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const hourMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = 0;
    for (const p of photos) {
      const hour = new Date(p.createdAt).getHours();
      hourMap[hour]++;
    }

    const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] }));

    res.json({ hours, peakHour: hours.reduce((a, b) => b.count > a.count ? b : a).hour });
  } catch (error: any) {
    logger.error('Hourly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/daily-stats — Uploads per day (YYYY-MM-DD)
router.get('/:eventId/photos/daily-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap: Record<string, number> = {};
    for (const p of photos) {
      const key = new Date(p.createdAt).toISOString().split('T')[0];
      dayMap[key] = (dayMap[key] || 0) + 1;
    }

    const days = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    res.json({ days, totalDays: days.length });
  } catch (error: any) {
    logger.error('Daily stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/guest-stats — Photos per guest
router.get('/:eventId/photos/guest-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['guestId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 50,
    });

    res.json({
      guestStats: grouped.map((g: any) => ({ guestId: g.guestId || null, count: g._count.id })),
      totalGuests: grouped.length,
    });
  } catch (error: any) {
    logger.error('Guest stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/hash-stats — Hash coverage statistics
router.get('/:eventId/photos/hash-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withMd5, withPerceptual] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, md5Hash: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, perceptualHash: { not: null } } }),
    ]);

    res.json({
      total,
      withMd5,
      withPerceptual,
      md5Rate: total > 0 ? Math.round((withMd5 / total) * 100) : 0,
      perceptualRate: total > 0 ? Math.round((withPerceptual / total) * 100) : 0,
    });
  } catch (error: any) {
    logger.error('Hash stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/purge-stats — Photos scheduled for purge
router.get('/:eventId/photos/purge-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const now = new Date();
    const [total, scheduledForPurge, alreadyPurgedue] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, purgeAfter: { lt: now } } }),
    ]);

    res.json({ total, scheduledForPurge, alreadyPurgedue, purgeRate: total > 0 ? Math.round((scheduledForPurge / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Purge stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/deleted-stats — Deleted photo statistics
router.get('/:eventId/photos/deleted-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, deleted, active] = await Promise.all([
      prisma.photo.count({ where: { eventId } }),
      prisma.photo.count({ where: { eventId, deletedAt: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
    ]);

    res.json({ total, deleted, active, deletedRate: total > 0 ? Math.round((deleted / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Deleted stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/tag-stats — Top tags for event photos
router.get('/:eventId/photos/tag-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { tags: true },
    });

    const tagMap: Record<string, number> = {};
    for (const p of photos) {
      for (const tag of p.tags) {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      }
    }

    const topTags = Object.entries(tagMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ topTags, totalUniqueTags: Object.keys(tagMap).length });
  } catch (error: any) {
    logger.error('Tag stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/view-stats — View count statistics
router.get('/:eventId/photos/view-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    const topPhoto = await prisma.photo.findFirst({
      where: { eventId, deletedAt: null },
      select: { id: true, views: true, url: true },
      orderBy: { views: 'desc' },
    });

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: Math.round(((result._avg.views || 0) * 100)) / 100,
      maxViews: result._max.views || 0,
      photoCount: result._count.id,
      topPhoto,
    });
  } catch (error: any) {
    logger.error('View stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/comment-stats — Comment statistics with top 5 most commented
router.get('/:eventId/photos/comment-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [totalComments, photosWithComments, totalPhotos] = await Promise.all([
      prisma.photoComment.count({ where: { photo: { eventId } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, comments: { some: {} } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
    ]);

    const top5 = await prisma.photoComment.groupBy({
      by: ['photoId'],
      where: { photo: { eventId } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    res.json({
      totalComments,
      photosWithComments,
      avgCommentsPerPhoto: totalPhotos > 0 ? Math.round((totalComments / totalPhotos) * 100) / 100 : 0,
      top5: top5.map((t: any) => ({ photoId: t.photoId, commentCount: t._count.id })),
    });
  } catch (error: any) {
    logger.error('Comment stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/like-stats — Photo like statistics
router.get('/:eventId/photos/like-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [totalLikes, photosWithLikes, totalPhotos] = await Promise.all([
      prisma.photoLike.count({ where: { photo: { eventId } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, likes: { some: {} } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
    ]);

    res.json({
      totalLikes,
      photosWithLikes,
      photosWithoutLikes: totalPhotos - photosWithLikes,
      avgLikesPerPhoto: totalPhotos > 0 ? Math.round((totalLikes / totalPhotos) * 100) / 100 : 0,
    });
  } catch (error: any) {
    logger.error('Like stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/favorite-stats — Favorite photo statistics
router.get('/:eventId/photos/favorite-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, favorites] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isFavorite: true } }),
    ]);

    res.json({ total, favorites, nonFavorites: total - favorites, favoriteRate: total > 0 ? Math.round((favorites / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Favorite stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/story-only-stats — Story-only photo statistics
router.get('/:eventId/photos/story-only-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, storyOnly, regular] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: true } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isStoryOnly: false } }),
    ]);

    res.json({ total, storyOnly, regular, storyOnlyRate: total > 0 ? Math.round((storyOnly / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Story-only stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/exif-stats — EXIF data statistics
router.get('/:eventId/photos/exif-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withExif] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, exifData: { not: 'JsonNull' as any } } }),
    ]);

    res.json({ total, withExif, withoutExif: total - withExif, exifRate: total > 0 ? Math.round((withExif / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('EXIF stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/geo-stats — Geo-tagged photo statistics
router.get('/:eventId/photos/geo-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withGeo] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, latitude: { not: null }, longitude: { not: null } } }),
    ]);

    res.json({ total, withGeo, withoutGeo: total - withGeo, geoRate: total > 0 ? Math.round((withGeo / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Geo stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/duplicate-stats — Duplicate photo statistics
router.get('/:eventId/photos/duplicate-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, withDuplicateGroup, bestInGroup] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, duplicateGroupId: { not: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, isBestInGroup: true } }),
    ]);

    res.json({ total, withDuplicateGroup, bestInGroup, duplicateRate: total > 0 ? Math.round((withDuplicateGroup / total) * 100) : 0 });
  } catch (error: any) {
    logger.error('Duplicate stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/quality-stats — Quality score statistics
router.get('/:eventId/photos/quality-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null, qualityScore: { not: null } },
      _avg: { qualityScore: true },
      _max: { qualityScore: true },
      _min: { qualityScore: true },
      _count: { id: true },
    });

    const withFaces = await prisma.photo.count({
      where: { eventId, deletedAt: null, faceCount: { gt: 0 } },
    });

    res.json({
      avgQualityScore: Math.round(((result._avg.qualityScore || 0) * 100)) / 100,
      maxQualityScore: result._max.qualityScore || 0,
      minQualityScore: result._min.qualityScore || 0,
      photosWithScore: result._count.id,
      photosWithFaces: withFaces,
    });
  } catch (error: any) {
    logger.error('Quality stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/uploader-stats — Photos grouped by uploadedBy
router.get('/:eventId/photos/uploader-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
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
      uploaderStats: grouped.map((g: any) => ({ uploadedBy: g.uploadedBy || 'Anonym', count: g._count.id })),
    });
  } catch (error: any) {
    logger.error('Uploader stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/size-stats — File size statistics for event photos
router.get('/:eventId/photos/size-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { sizeBytes: true },
      _avg: { sizeBytes: true },
      _max: { sizeBytes: true },
      _min: { sizeBytes: true },
      _count: { id: true },
    });

    const toMB = (n: bigint | number | null) => n ? Math.round(Number(n) / 1024 / 1024 * 100) / 100 : 0;

    res.json({
      totalSizeMB: toMB(result._sum.sizeBytes),
      avgSizeMB: toMB(result._avg.sizeBytes),
      maxSizeMB: toMB(result._max.sizeBytes),
      minSizeMB: toMB(result._min.sizeBytes),
      photoCount: result._count.id,
    });
  } catch (error: any) {
    logger.error('Size stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/monthly-stats — Uploads per month
router.get('/:eventId/photos/monthly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const monthMap: Record<string, number> = {};
    for (const p of photos) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + 1;
    }

    const months = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    res.json({ months, totalMonths: months.length });
  } catch (error: any) {
    logger.error('Monthly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/weekly-stats — Uploads per week (last 8 weeks)
router.get('/:eventId/photos/weekly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const weekMap: Record<string, number> = {};
    for (const p of photos) {
      const d = new Date(p.createdAt);
      const day = d.getDay(); // 0=Sun
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const key = monday.toISOString().split('T')[0];
      weekMap[key] = (weekMap[key] || 0) + 1;
    }

    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    res.json({ weeks, totalWeeks: weeks.length });
  } catch (error: any) {
    logger.error('Weekly stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/status-timeline — Recent status changes (updatedAt desc)
router.get('/:eventId/photos/status-timeline', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, status: true, uploadedBy: true, updatedAt: true, url: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    res.json({ photos, count: photos.length });
  } catch (error: any) {
    logger.error('Status timeline error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// POST /photos/bulk/restore — Restore soft-deleted photos
router.post('/bulk/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body as { photoIds: string[] };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, deletedAt: { not: null } },
      select: { id: true, eventId: true },
    });

    let restored = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { deletedAt: null } });
      restored++;
    }

    res.json({ restored, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk restore error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// DELETE /photos/bulk/delete — Bulk soft-delete photos
router.delete('/bulk/delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body as { photoIds: string[] };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, deletedAt: null },
      select: { id: true, eventId: true },
    });

    let deleted = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { deletedAt: new Date() } });
      deleted++;
    }

    res.json({ deleted, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk delete error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/set-favorite — Mark multiple photos as favorite
router.patch('/bulk/set-favorite', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, isFavorite } = req.body as { photoIds: string[]; isFavorite: boolean };
    if (!Array.isArray(photoIds) || !photoIds.length || typeof isFavorite !== 'boolean') {
      return res.status(400).json({ error: 'photoIds (Array) und isFavorite (boolean) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({ where: { id: photo.id }, data: { isFavorite } });
      updated++;
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk set-favorite error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/set-category — Set category for multiple photos
router.patch('/bulk/set-category', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, categoryId } = req.body as { photoIds: string[]; categoryId: string | null };
    if (!Array.isArray(photoIds) || !photoIds.length) {
      return res.status(400).json({ error: 'photoIds (Array) erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      await prisma.photo.update({
        where: { id: photo.id },
        data: { categoryId: categoryId || null },
      });
      updated++;
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk set-category error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/remove-tag — Remove tag from multiple photos
router.patch('/bulk/remove-tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, tag } = req.body as { photoIds: string[]; tag: string };
    if (!Array.isArray(photoIds) || !photoIds.length || !tag?.trim()) {
      return res.status(400).json({ error: 'photoIds (Array) und tag erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, tags: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      if (photo.tags.includes(tag)) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { tags: photo.tags.filter((t: string) => t !== tag) },
        });
        updated++;
      }
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk remove-tag error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// PATCH /photos/bulk/add-tag — Add tag to multiple photos
router.patch('/bulk/add-tag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, tag } = req.body as { photoIds: string[]; tag: string };
    if (!Array.isArray(photoIds) || !photoIds.length || !tag?.trim()) {
      return res.status(400).json({ error: 'photoIds (Array) und tag erforderlich' });
    }

    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, tags: true, eventId: true },
    });

    let updated = 0;
    for (const photo of photos) {
      if (!(await hasEventManageAccess(req, photo.eventId))) continue;
      if (!photo.tags.includes(tag)) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { tags: { push: tag } },
        });
        updated++;
      }
    }

    res.json({ updated, total: photoIds.length });
  } catch (error: any) {
    logger.error('Bulk add-tag error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/category-stats — Photos grouped by category
router.get('/:eventId/photos/category-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const grouped = await prisma.photo.groupBy({
      by: ['categoryId'],
      where: { eventId, deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const categories = await prisma.category.findMany({
      where: { eventId },
      select: { id: true, name: true },
    });

    const catMap = new Map(categories.map((c: any) => [c.id, c.name]));
    res.json({
      categoryStats: grouped.map((g: any) => ({
        categoryId: g.categoryId,
        categoryName: g.categoryId ? catMap.get(g.categoryId) || 'Unbekannt' : 'Keine Kategorie',
        count: g._count.id,
      })),
    });
  } catch (error: any) {
    logger.error('Category stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/votes-stats — Vote statistics for event
router.get('/:eventId/photos/votes-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [totalVotes, photosWithVotes, avgRatingResult] = await Promise.all([
      prisma.photoVote.count({ where: { photo: { eventId } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, votes: { some: {} } } }),
      prisma.photoVote.aggregate({ where: { photo: { eventId } }, _avg: { rating: true } }),
    ]);

    res.json({
      totalVotes,
      photosWithVotes,
      avgRating: Math.round(((avgRatingResult._avg.rating || 0) * 10)) / 10,
    });
  } catch (error: any) {
    logger.error('Votes stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/comments-count — Total comments on approved photos
router.get('/:eventId/photos/comments-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [totalComments, photosWithComments] = await Promise.all([
      prisma.photoComment.count({ where: { photo: { eventId, deletedAt: null } } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, comments: { some: {} } } }),
    ]);

    res.json({ totalComments, photosWithComments });
  } catch (error: any) {
    logger.error('Comments count error', { error: error.message });
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/views-total — Total view count for event
router.get('/:eventId/photos/views-total', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const result = await prisma.photo.aggregate({
      where: { eventId, deletedAt: null },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
      _count: { id: true },
    });

    res.json({
      totalViews: result._sum.views || 0,
      avgViews: Math.round((result._avg.views || 0) * 10) / 10,
      maxViews: result._max.views || 0,
      photoCount: result._count.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/favorites-count — Count of pinned/favorite photos
router.get('/:eventId/photos/favorites-count', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, favorites] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED', isFavorite: true } }),
    ]);

    res.json({ total, favorites, ratio: total > 0 ? Math.round((favorites / total) * 100) : 0 });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/approval-rate — Approval rate stats
router.get('/:eventId/photos/approval-rate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const [total, approved, pending, rejected] = await Promise.all([
      prisma.photo.count({ where: { eventId, deletedAt: null } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'APPROVED' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'PENDING' } }),
      prisma.photo.count({ where: { eventId, deletedAt: null, status: 'REJECTED' } }),
    ]);

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    res.json({ total, approved, pending, rejected, approvalRate });
  } catch (error: any) {
    res.status(500).json({ error: 'Fehler' });
  }
});

// GET /api/events/:eventId/photos/daily-stats — Uploads per day
router.get('/:eventId/photos/daily-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const p of photos) {
      const day = new Date(p.createdAt).toISOString().split('T')[0];
      dailyMap.set(day, (dailyMap.get(day) || 0) + 1);
    }

    res.json({
      dailyStats: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
      totalDays: dailyMap.size,
    });
  } catch (error: any) {
    logger.error('Daily stats error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// GET /api/events/:eventId/photos/hourly-stats — Upload distribution by hour of day
router.get('/:eventId/photos/hourly-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) return res.status(403).json({ error: 'Forbidden' });

    const photos = await prisma.photo.findMany({
      where: { eventId, deletedAt: null },
      select: { createdAt: true },
    });

    const hourlyMap: number[] = new Array(24).fill(0);
    for (const p of photos) {
      const hour = new Date(p.createdAt).getHours();
      hourlyMap[hour]++;
    }

    res.json({
      hourlyStats: hourlyMap.map((count, hour) => ({ hour, count })),
      peakHour: hourlyMap.indexOf(Math.max(...hourlyMap)),
    });
  } catch (error: any) {
    logger.error('Hourly stats error', { error: error.message });
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

