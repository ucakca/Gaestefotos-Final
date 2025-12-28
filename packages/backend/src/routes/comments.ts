import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, authMiddleware, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schema
const createCommentSchema = z.object({
  comment: z.string().min(1, 'Kommentar ist erforderlich').max(1000, 'Kommentar zu lang'),
  authorName: z.string().min(1, 'Name ist erforderlich').max(100),
});

// Get comments for a photo
router.get(
  '/:photoId/comments',
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

    const comments = await prisma.photoComment.findMany({
      where: {
        photoId,
        status: 'APPROVED', // Only show approved comments
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({ comments });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Kommentare:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create comment
router.post(
  '/:photoId/comments',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const data = createCommentSchema.parse(req.body);

    // Check if photo exists
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: {
          select: {
            featuresConfig: true,
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

    // Check if comments are enabled (could be in featuresConfig)
    const featuresConfig = photo.event.featuresConfig as any;
    const commentsEnabled = featuresConfig?.allowComments !== false; // Default true

    if (!commentsEnabled) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Determine comment status (moderation required?)
    const moderationRequired = featuresConfig?.moderateComments === true;
    const initialStatus = moderationRequired ? 'PENDING' : 'APPROVED';

    const comment = await prisma.photoComment.create({
      data: {
        photoId,
        guestId: req.userId || null,
        authorName: data.authorName,
        comment: data.comment,
        status: initialStatus,
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Fehler beim Erstellen des Kommentars:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Approve/Reject comment (Admin only)
router.post('/comments/:commentId/:action', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Ungültige Aktion' });
    }

    const comment = await prisma.photoComment.findUnique({
      where: { id: commentId },
      include: {
        photo: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    if (comment.photo.deletedAt || comment.photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    if (comment.photo.event.deletedAt || comment.photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check permissions (host or admin)
    if (req.userId !== comment.photo.event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    const updatedComment = await prisma.photoComment.update({
      where: { id: commentId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      },
    });

    res.json({ comment: updatedComment });
  } catch (error) {
    logger.error('Fehler beim Aktualisieren des Kommentars:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Delete comment
router.delete('/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.photoComment.findUnique({
      where: { id: commentId },
      include: {
        photo: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    if (comment.photo.deletedAt || comment.photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    if (comment.photo.event.deletedAt || comment.photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check permissions
    if (req.userId !== comment.photo.event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Kommentar nicht gefunden' });
    }

    await prisma.photoComment.delete({
      where: { id: commentId },
    });

    res.json({ message: 'Kommentar gelöscht' });
  } catch (error) {
    logger.error('Fehler beim Löschen des Kommentars:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



