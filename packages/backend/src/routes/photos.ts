import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, requireEventAccess, hasEventAccess, hasEventManageAccess, hasEventPermission, isPrivilegedRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { denyByVisibility, isWithinEventDateWindow } from '../services/eventPolicy';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { extractCapturedAtFromImage } from '../services/uploadDatePolicy';
import { emailService } from '../services/email';
import { serializeBigInt } from '../utils/serializers';
import { selectSmartCategoryId } from '../services/smartAlbum';
import { mosaicEngine } from '../services/mosaicEngine';
import archiver from 'archiver';
import { logger } from '../utils/logger';

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

    if (!event.dateTime) {
      return denyByVisibility(res, denyVisibility, {
        code: 'EVENT_DATE_MISSING',
        error: 'Event-Datum fehlt',
      });
    }

    if (!isWithinEventDateWindow(new Date(), event.dateTime, 1)) {
      return denyByVisibility(res, denyVisibility, {
        code: 'UPLOAD_WINDOW_CLOSED',
        error: 'Uploads sind nur rund um das Event-Datum möglich (±1 Tag)',
      });
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
    const { status, limit, skip } = req.query;

    const where: any = { eventId, isStoryOnly: false };

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
        url: photo.url?.startsWith('http') ? photo.url : (photo.id ? `/api/photos/${photo.id}/file` : photo.url),
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

      const resolvedCategoryId = categoryId
        ? categoryId
        : await selectSmartCategoryId({
            eventId,
            capturedAt: capturedAtResult.capturedAt,
            isGuest: !isManager,
          });

      // Calculate total upload size (all variants)
      const uploadBytes = BigInt(processed.original.length + processed.optimized.length + processed.thumbnail.length);
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
      
      const [storagePath, storagePathOriginal, storagePathThumb] = await Promise.all([
        storageService.uploadFile(eventId, `${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
        storageService.uploadFile(eventId, `${baseFilename}_orig${ext}`, processed.original, file.mimetype),
        storageService.uploadFile(eventId, `${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
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
        url: `/api/photos/${photo.id}/file`,
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

      // Emit WebSocket event
      io.to(`event:${eventId}`).emit('photo_uploaded', {
        photo: serializeBigInt(photoWithProxyUrl),
      });

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
                });
              }
            } catch (err: any) {
              logger.warn('Mosaic auto-place failed', { error: err.message, eventId, photoId: photo.id });
            }
          }
        }).catch(() => {});
      }

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
    
    const fileBuffer = await storageService.getFile(downloadPath);
    const extension = downloadPath.split('.').pop() || 'jpg';
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

      // Emit WebSocket event
      io.to(`event:${photo.eventId}`).emit('photo_approved', {
        photo: updatedPhoto,
      });

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

      res.json({ photo: updatedPhoto });
    } catch (error: any) {
      logger.error('Reject photo error', { error: error.message, stack: error.stack, photoId: req.params.photoId });
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

