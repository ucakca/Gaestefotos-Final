import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const getClientFingerprint = (req: AuthRequest) => {
  if (req.userId) return `user:${req.userId}`;

  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
  const userAgent = (req.headers['user-agent'] as string) || 'unknown';
  const secret = process.env.IP_HASH_SECRET || process.env.JWT_SECRET || 'default';

  return crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent}|${secret}`)
    .digest('hex');
};

// Validation schema
const voteSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

// Vote for a photo
router.post(
  '/:photoId/vote',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const data = voteSchema.parse(req.body);
    const ipAddress = getClientFingerprint(req);

    // Check if photo exists
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = req.userId && req.userId === photo.event.hostId;
    if (!isHost && !hasEventAccess(req, photo.eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Check if already voted
    const existingVote = await prisma.photoVote.findUnique({
      where: {
        photoId_ipAddress: {
          photoId,
          ipAddress: ipAddress as string,
        },
      },
    });

    if (existingVote) {
      // Update existing vote
      const updatedVote = await prisma.photoVote.update({
        where: { id: existingVote.id },
        data: {
          rating: data.rating,
        },
      });

      // Calculate average rating
      const votes = await prisma.photoVote.findMany({
        where: { photoId },
      });
      const averageRating = votes.reduce((sum, v) => sum + v.rating, 0) / votes.length;

      return res.json({
        vote: updatedVote,
        averageRating: Math.round(averageRating * 10) / 10,
        voteCount: votes.length,
      });
    } else {
      // Create new vote
      const vote = await prisma.photoVote.create({
        data: {
          photoId,
          guestId: req.userId || null,
          ipAddress: ipAddress as string,
          rating: data.rating,
        },
      });

      // Calculate average rating
      const votes = await prisma.photoVote.findMany({
        where: { photoId },
      });
      const averageRating = votes.reduce((sum, v) => sum + v.rating, 0) / votes.length;

      return res.json({
        vote,
        averageRating: Math.round(averageRating * 10) / 10,
        voteCount: votes.length,
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Bereits abgestimmt' });
    }
    logger.error('Fehler beim Voting:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Get votes for a photo
router.get(
  '/:photoId/votes',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const ipAddress = getClientFingerprint(req);

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = req.userId && req.userId === photo.event.hostId;
    if (!isHost && !hasEventAccess(req, photo.eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const votes = await prisma.photoVote.findMany({
      where: { photoId },
    });

    const averageRating = votes.length > 0
      ? votes.reduce((sum, v) => sum + v.rating, 0) / votes.length
      : 0;

    // Check if current user/IP has voted
    const userVote = await prisma.photoVote.findUnique({
      where: {
        photoId_ipAddress: {
          photoId,
          ipAddress: ipAddress as string,
        },
      },
    });

    res.json({
      averageRating: Math.round(averageRating * 10) / 10,
      voteCount: votes.length,
      userVote: userVote?.rating || null,
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Votes:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



