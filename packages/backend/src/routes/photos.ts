import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, requireEventAccess, hasEventAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { denyByVisibility, isWithinEventDateWindow } from '../services/eventPolicy';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import archiver from 'archiver';

const router = Router();

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Get all photos for an event
router.get('/:eventId/photos', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const where: any = { eventId };

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

    res.json({ photos });
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
  attachEventUploadRateLimits,
  photoUploadIpLimiter,
  photoUploadEventLimiter,
  upload.single('file'),
  validateUploadedFile('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Check if event exists
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

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      const denyVisibility = isHost || isAdmin ? 'hostOrAdmin' : 'guest';

      const featuresConfig = (event.featuresConfig || {}) as any;
      const allowUploads = featuresConfig?.allowUploads !== false;
      if (!allowUploads && !isHost && !isAdmin) {
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

      // Process image
      const processed = await imageProcessor.processImage(file.buffer);

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

      // Get presigned URL from SeaweedFS
      // Note: SeaweedFS S3 API supports presigned URLs
      const url = await storageService.getFileUrl(storagePath, 7 * 24 * 3600); // 7 days

      const moderationRequired = featuresConfig?.moderationRequired === true;
      const status = moderationRequired && !isHost && !isAdmin ? 'PENDING' : 'APPROVED';

      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,
          url,
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

      // Emit WebSocket event
      io.to(`event:${eventId}`).emit('photo_uploaded', {
        photo,
      });

      res.status(201).json({ photo });
    } catch (error) {
      console.error('Upload photo error:', error);
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

    const isHost = !!req.userId && photo.event.hostId === req.userId;
    const isAdmin = req.userRole === 'ADMIN';
    const denyVisibility = isHost || isAdmin ? 'hostOrAdmin' : 'guest';

    // Access control: host/admin via JWT OR event access cookie for guests
    if (!isHost && !isAdmin && !hasEventAccess(req, photo.eventId)) {
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
    if (!isHost && !isAdmin && featuresConfig?.allowDownloads === false) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Guests can download only approved photos
    if (!isHost && !isAdmin && photo.status !== 'APPROVED') {
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

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
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
      if (
        photo.event.hostId !== req.userId &&
        req.userRole !== 'SUPERADMIN'
      ) {
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
      if (
        photo.event.hostId !== req.userId &&
        req.userRole !== 'SUPERADMIN'
      ) {
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
      if (
        photo.event.hostId !== req.userId &&
        req.userRole !== 'SUPERADMIN'
      ) {
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

