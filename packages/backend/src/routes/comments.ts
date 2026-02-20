import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest, authMiddleware, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

// Validation schema
const createCommentSchema = z.object({
  comment: z.string().min(1, 'Kommentar ist erforderlich').max(1000, 'Kommentar zu lang'),
  authorName: z.string().min(1, 'Name ist erforderlich').max(100),
});

// Get comments for a photo
// GET /events/:eventId/comments — All comments for an event (host moderation)
router.get('/events/:eventId/comments', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, limit, skip } = req.query;

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { hostId: true } });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });
    if (req.userId !== event.hostId && req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Kein Zugriff' });

    const limitNum = Math.min(100, parseInt(limit as string, 10) || 50);
    const skipNum = parseInt(skip as string, 10) || 0;

    const [comments, total] = await Promise.all([
      prisma.photoComment.findMany({
        where: {
          photo: { eventId },
          ...(status ? { status: status as any } : {}),
        },
        include: { photo: { select: { id: true, url: true } } },
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: skipNum,
      }),
      prisma.photoComment.count({ where: { photo: { eventId }, ...(status ? { status: status as any } : {}) } }),
    ]);

    res.json({ comments, total });
  } catch (error) {
    logger.error('Event comments error:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

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
        authorName: sanitizeText(data.authorName),
        comment: sanitizeText(data.comment),
        status: initialStatus,
      },
    });

    res.status(201).json({ comment });

    // Non-blocking: notify host via email (fire-and-forget)
    const notificationsEnabled = !((featuresConfig as any)?.disableEmailNotifications === true);
    if (notificationsEnabled && initialStatus === 'APPROVED' && !isHost) {
      (async () => {
        try {
          const host = await prisma.user.findUnique({ where: { id: photo.event.hostId }, select: { email: true, name: true } });
          if (!host?.email) return;

          const { emailService } = await import('../services/email');
          const connected = await emailService.testConnection();
          if (!connected) return;

          const frontendUrl = process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com';
          const photoLink = `${frontendUrl}/events/${photo.eventId}/photos`;
          const safeAuthor = sanitizeText(data.authorName);
          const safeComment = sanitizeText(data.comment).slice(0, 200);

          await emailService.sendCustomEmail({
            to: host.email,
            subject: `💬 Neuer Kommentar von ${safeAuthor}`,
            text: `${safeAuthor} hat ein Foto in deinem Event kommentiert:\n\n"${safeComment}"\n\nFotos ansehen:\n${photoLink}`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px 32px;text-align:center">
  <h2 style="margin:0;color:#fff;font-size:18px">💬 Neuer Kommentar</h2>
</td></tr>
<tr><td style="padding:24px 32px">
  <p style="color:#374151"><strong>${safeAuthor}</strong> hat ein Foto kommentiert:</p>
  <blockquote style="margin:16px 0;padding:12px 16px;background:#f3f4f6;border-left:4px solid #6366f1;border-radius:4px;color:#374151;font-style:italic">${safeComment}</blockquote>
  <a href="${photoLink}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-weight:600">Fotos ansehen</a>
</td></tr></table></td></tr></table></body></html>`,
          });
        } catch (err: any) {
          logger.debug('Comment notification failed (non-critical)', { err: err.message });
        }
      })();
    }
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



