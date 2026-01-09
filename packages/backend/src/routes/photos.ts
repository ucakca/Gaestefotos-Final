import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, requireEventAccess, hasEventAccess, hasEventManageAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { denyByVisibility, isWithinEventDateWindow } from '../services/eventPolicy';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { extractCapturedAtFromImage } from '../services/uploadDatePolicy';
import archiver from 'archiver';

// Sharp is optional; if missing we fall back to a tiny placeholder for blurred previews.
let sharp: any;
try {
  sharp = require('sharp');
} catch {
  sharp = null;
}

const router = Router();

async function selectSmartCategoryId(opts: {
  eventId: string;
  capturedAt: Date;
  isGuest: boolean;
}): Promise<string | null> {
  const { eventId, capturedAt, isGuest } = opts;

  const cat = await prisma.category.findFirst({
    where: {
      eventId,
      startAt: { not: null, lte: capturedAt },
      endAt: { not: null, gte: capturedAt },
    },
    select: { id: true, uploadLocked: true },
    orderBy: { startAt: 'desc' },
  });

  if (!cat) return null;
  if (isGuest && cat.uploadLocked) return null;
  return cat.id;
}

function serializeBigInt(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as unknown;
}

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
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
      return res.status(400).json({ error: 'Datei zu groß. Maximum: 10MB' });
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
    const { status } = req.query;

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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Always serve via backend proxy URL to avoid mixed content (presigned SeaweedFS URLs may be http://)
    const photosWithProxyUrls = photos.map((photo: any) => ({
      ...photo,
      url: photo.id ? `/api/photos/${photo.id}/file` : photo.url,
    }));

    res.json({ photos: serializeBigInt(photosWithProxyUrls) });
  } catch (error) {
    console.error('Get photos error:', error);
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

      const uploadBytes = BigInt(processed.optimized.length);
      try {
        await assertUploadWithinLimit(eventId, uploadBytes);
      } catch (e: any) {
        if (e?.httpStatus) {
          return res.status(e.httpStatus).json({ error: 'Speicherlimit erreicht' });
        }
        throw e;
      }
      
      // Upload optimized image to SeaweedFS
      const storagePath = await storageService.uploadFile(
        eventId,
        file.originalname,
        processed.optimized,
        file.mimetype
      );

      const moderationRequired = featuresConfig?.moderationRequired === true;
      const status = moderationRequired && !isManager ? 'PENDING' : 'APPROVED';

      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,
          categoryId: resolvedCategoryId,
          // Persist a stable proxy URL (no mixed-content issues)
          url: '',
          status,
          sizeBytes: uploadBytes,
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
      };

      await prisma.photo.update({
        where: { id: photo.id },
        data: { url: photoWithProxyUrl.url },
      });

      // Emit WebSocket event
      io.to(`event:${eventId}`).emit('photo_uploaded', {
        photo: serializeBigInt(photoWithProxyUrl),
      });

      res.status(201).json({ photo: serializeBigInt(photoWithProxyUrl) });
    } catch (error) {
      console.error('Upload photo error:', error);
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

      if (!photo || photo.deletedAt || photo.status === 'DELETED') {
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
      console.error('Serve photo file error:', error);
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
    const storageEndsAt = await getEventStorageEndsAt(photo.eventId);
    if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
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

    if (!photo.storagePath) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const fileBuffer = await storageService.getFile(photo.storagePath);
    const extension = photo.storagePath.split('.').pop() || 'jpg';
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
    res.send(fileBuffer);
  } catch (error: any) {
    console.error('Download photo error:', error);
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

      const storageEndsAt = await getEventStorageEndsAt(event.id);
      if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
        return res.status(403).json({ code: 'STORAGE_LOCKED', error: 'Speicherperiode beendet' });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-photos-${Date.now()}.zip"`);

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.on('error', (err) => {
        console.error('ZIP-Erstellungsfehler:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Erstellen der ZIP-Datei' });
        }
      });

      archive.pipe(res);

      for (const photo of photos) {
        if (!photo.storagePath) continue;
        try {
          const fileBuffer = await storageService.getFile(photo.storagePath);
          const extension = photo.storagePath.split('.').pop() || 'jpg';
          archive.append(fileBuffer, { name: `${photo.id}.${extension}` });
        } catch (err) {
          console.warn(`Fehler beim Hinzufügen von Foto ${photo.id}:`, err);
        }
      }

      archive.finalize();
    } catch (error) {
      console.error('Fehler beim Bulk-Download:', error);
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

      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'APPROVED' },
      });

      // Emit WebSocket event
      io.to(`event:${photo.eventId}`).emit('photo_approved', {
        photo: updatedPhoto,
      });

      res.json({ photo: updatedPhoto });
    } catch (error) {
      console.error('Approve photo error:', error);
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

      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'REJECTED' },
      });

      res.json({ photo: updatedPhoto });
    } catch (error) {
      console.error('Reject photo error:', error);
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

      await prisma.photo.update({
        where: { id: photoId },
        data: { status: 'DELETED' },
      });

      res.json({ message: 'Photo deleted' });
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

