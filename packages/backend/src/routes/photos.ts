import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';

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

    if (status) {
      where.status = status;
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
  upload.single('file'),
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
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Process image
      const processed = await imageProcessor.processImage(file.buffer);
      
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

      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,
          url,
          status: 'PENDING',
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

