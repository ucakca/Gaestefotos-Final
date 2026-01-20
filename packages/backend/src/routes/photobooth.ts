import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import prisma from '../config/database';
import { storageService } from '../services/storage';
import logger from '../config/logger';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/**
 * Photo-Booth API
 * Vorbereitet für Hardware-Integration
 */

// Photo-Booth Session erstellen
router.post('/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, boothId, boothName } = req.body;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || (event.hostId !== req.userId && req.user?.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const session = {
      id: `session_${Date.now()}`,
      eventId,
      boothId: boothId || `booth_${Date.now()}`,
      boothName: boothName || 'Photo Booth',
      createdAt: new Date().toISOString(),
      active: true
    };

    logger.info('Photo booth session created', { sessionId: session.id, eventId });

    return res.json({ session });
  } catch (error) {
    logger.error('Photo booth session error', { error });
    return res.status(500).json({ error: 'Failed to create session' });
  }
});

// Photo-Booth Upload (von Hardware)
router.post('/upload', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, sessionId, boothId, metadata } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }

    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Upload photo to storage
    const filename = `photobooth_${Date.now()}_${req.file.originalname}`;
    const photoUrl = await storageService.uploadFile(
      eventId,
      filename,
      req.file.buffer,
      req.file.mimetype
    );

    // Create photo entry
    const photo = await prisma.photo.create({
      data: {
        eventId,
        url: photoUrl,
        uploaderName: 'Photo Booth',
        status: 'APPROVED', // Auto-approve booth photos
        metadata: {
          source: 'photobooth',
          sessionId,
          boothId,
          ...(metadata ? JSON.parse(metadata) : {})
        }
      }
    });

    logger.info('Photo booth upload successful', { photoId: photo.id, eventId, sessionId });

    return res.json({ photo });
  } catch (error) {
    logger.error('Photo booth upload error', { error });
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// Get Photo-Booth Stats
router.get('/events/:eventId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify event ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event || (event.hostId !== req.userId && req.user?.role !== 'ADMIN')) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Count photobooth photos
    const count = await prisma.photo.count({
      where: {
        eventId,
        uploaderName: 'Photo Booth'
      }
    });

    const stats = {
      totalPhotos: count,
      eventId,
      lastUpload: await prisma.photo.findFirst({
        where: { eventId, uploaderName: 'Photo Booth' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    };

    return res.json({ stats });
  } catch (error) {
    logger.error('Photo booth stats error', { error });
    return res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
