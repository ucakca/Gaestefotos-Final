import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, requireEventAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { denyByVisibility, isWithinEventDateWindow } from '../services/eventPolicy';

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

