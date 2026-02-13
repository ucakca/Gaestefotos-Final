import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { emailService } from '../services/email';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

function getInviteJwtSecret(): string {
  const secret = process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }
  return secret;
}

function getInviteTtlSeconds(): number {
  return Number(process.env.INVITE_TOKEN_TTL_SECONDS || 60 * 60); // 1h
}

// Test email configuration
router.post('/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isValid = await emailService.testConnection();
    
    if (!isValid) {
      return res.status(400).json({ error: 'Email-Konfiguration ungültig oder nicht konfiguriert' });
    }

    res.json({ success: true, message: 'Email-Konfiguration ist gültig' });
  } catch (error) {
    logger.error('Fehler beim Testen der Email-Konfiguration', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Send invitation email
router.post(
  '/events/:eventId/invite',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { guestId } = req.body;

      if (!guestId || typeof guestId !== 'string') {
        return res.status(400).json({ error: 'guestId erforderlich' });
      }

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Get guest
      const guest = await prisma.guest.findFirst({
        where: { id: guestId, eventId },
      });

      if (!guest) {
        return res.status(404).json({ error: 'Gast nicht gefunden' });
      }

      if (!guest.email) {
        return res.status(400).json({ error: 'Gast hat keine E-Mail-Adresse' });
      }

      const email = guest.email;

      const inviteToken = jwt.sign(
        { type: 'invite', eventId, guestId: guest.id },
        getInviteJwtSecret(),
        { expiresIn: getInviteTtlSeconds() }
      );

      await emailService.sendInvitation({
        to: email,
        eventTitle: event.title,
        eventSlug: event.slug,
        guestName: `${guest.firstName} ${guest.lastName}`,
        inviteToken,
      });

      res.json({ success: true, message: 'Einladung wurde versendet' });
    } catch (error: any) {
      if (error.message.includes('nicht konfiguriert')) {
        return res.status(400).json({ error: 'Email-Service ist nicht konfiguriert' });
      }
      logger.error('Fehler beim Versenden der Einladung', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Send bulk invitations
router.post(
  '/events/:eventId/invite-bulk',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const { guestIds } = req.body;

      if (!Array.isArray(guestIds) || guestIds.length === 0) {
        return res.status(400).json({ error: 'Keine Gäste ausgewählt' });
      }

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Get guests
      const guests = await prisma.guest.findMany({
        where: {
          id: { in: guestIds },
          eventId,
        },
      });

      const results: Array<{ guestId: string; success: boolean; error?: string }> = [];

      for (const guest of guests) {
        if (!guest.email) {
          results.push({
            guestId: guest.id,
            success: false,
            error: 'Keine E-Mail-Adresse',
          });
          continue;
        }

        try {
          const inviteToken = jwt.sign(
            { type: 'invite', eventId, guestId: guest.id },
            getInviteJwtSecret(),
            { expiresIn: getInviteTtlSeconds() }
          );

          await emailService.sendInvitation({
            to: guest.email,
            eventTitle: event.title,
            eventSlug: event.slug,
            guestName: `${guest.firstName} ${guest.lastName}`,
            inviteToken,
          });
          results.push({ guestId: guest.id, success: true });
        } catch (error: any) {
          logger.error('Fehler beim Versenden einer Bulk-Einladung', {
            message: getErrorMessage(error),
            eventId,
            guestId: guest.id,
          });
          results.push({
            guestId: guest.id,
            success: false,
            error: 'Versand fehlgeschlagen',
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      res.json({
        success: true,
        message: `${successCount} von ${results.length} Einladungen versendet`,
        results,
      });
    } catch (error) {
      logger.error('Fehler beim Bulk-Versenden der Einladungen', { message: getErrorMessage(error), eventId: req.params.eventId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// POST /api/email/share-photo — Share a photo via email
const sharePhotoSchema = z.object({
  photoId: z.string().min(1),
  recipientEmail: z.string().email(),
  senderName: z.string().min(1).max(100),
  message: z.string().max(500).optional(),
});

router.post('/share-photo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = sharePhotoSchema.parse(req.body);

    const photo = await prisma.photo.findUnique({
      where: { id: data.photoId },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    if (!photo || !photo.event) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const photoUrl = photo.storagePathThumb
      ? `${baseUrl}/api/photos/${photo.id}/thumbnail`
      : `${baseUrl}/api/photos/${photo.id}/image`;
    const downloadUrl = `${baseUrl}/api/photos/${photo.id}/download`;

    await emailService.sendPhotoShare({
      to: data.recipientEmail,
      senderName: data.senderName,
      eventTitle: photo.event.title,
      photoUrl,
      message: data.message,
      downloadUrl,
    });

    // Log the share
    try {
      await prisma.emailShareLog.create({
        data: {
          photoId: photo.id,
          eventId: photo.event.id,
          recipientEmail: data.recipientEmail,
          subject: `Foto von ${photo.event.title}`,
        },
      });
    } catch (logErr) {
      logger.warn('Failed to log email share', { err: logErr });
    }

    res.json({ success: true, message: 'Foto wurde per E-Mail geteilt' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: error.flatten() });
    }
    if (error.message?.includes('nicht konfiguriert')) {
      return res.status(400).json({ error: 'Email-Service ist nicht konfiguriert' });
    }
    logger.error('Photo share email error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Fehler beim Teilen per E-Mail' });
  }
});

export default router;















