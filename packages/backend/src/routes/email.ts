import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { emailService } from '../services/email';
import { logger } from '../utils/logger';

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
    logger.error('Fehler beim Testen der Email-Konfiguration', { message: (error as any)?.message || String(error) });
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
      logger.error('Fehler beim Versenden der Einladung', { message: (error as any)?.message || String(error) });
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
            message: (error as any)?.message || String(error),
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
      logger.error('Fehler beim Bulk-Versenden der Einladungen', { message: (error as any)?.message || String(error), eventId: req.params.eventId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;















