import { Router, Response } from 'express';
import { z } from 'zod';
import { randomString } from '@gaestefotos/shared';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { sanitizeText } from '../utils/sanitize';

const router = Router();

// Validation schemas
const createGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  dietaryRequirements: z.string().optional(),
  plusOneCount: z.number().int().min(0).default(0),
});

// Get all guests for an event
router.get('/:eventId/guests', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ guests });
  } catch (error) {
    logger.error('Get guests error', { error: getErrorMessage(error), eventId: req.params.eventId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create guest
router.post('/:eventId/guests', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const data = createGuestSchema.parse(req.body);

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Generate access token
    const accessToken = randomString(32);

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName: sanitizeText(data.firstName),
        lastName: sanitizeText(data.lastName),
        email: data.email,
        dietaryRequirements: data.dietaryRequirements,
        plusOneCount: data.plusOneCount,
        accessToken,
      },
    });

    // Trigger workflow automations (non-blocking)
    import('../services/workflowExecutor').then(m =>
      m.onEventTrigger(eventId, 'TRIGGER_GUEST_JOINED', { guestId: guest.id })
    ).catch(() => {});

    res.status(201).json({ guest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Create guest error', { error: getErrorMessage(error), eventId: req.params.eventId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guest (RSVP)
router.put(
  '/:eventId/guests/:guestId',
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, guestId } = req.params;
      const { status, dietaryRequirements, plusOneCount } = req.body;

      // Check if guest exists and belongs to event
      const guest = await prisma.guest.findFirst({
        where: {
          id: guestId,
          eventId,
        },
      });

      if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      const updatedGuest = await prisma.guest.update({
        where: { id: guestId },
        data: {
          status: status || undefined,
          dietaryRequirements: dietaryRequirements || undefined,
          plusOneCount: plusOneCount !== undefined ? plusOneCount : undefined,
        },
      });

      res.json({ guest: updatedGuest });
    } catch (error) {
      logger.error('Update guest error', { error: getErrorMessage(error), eventId: req.params.eventId, guestId: req.params.guestId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete guest
router.delete(
  '/:eventId/guests/:guestId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, guestId } = req.params;

      // Check if event exists and user owns it
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.guest.delete({
        where: { id: guestId },
      });

      res.json({ message: 'Guest deleted' });
    } catch (error) {
      logger.error('Delete guest error', { error: getErrorMessage(error), eventId: req.params.eventId, guestId: req.params.guestId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /:eventId/guests/email-all — Send invitation email to ALL guests with email addresses
router.post(
  '/:eventId/guests/email-all',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const guests = await prisma.guest.findMany({ where: { eventId, email: { not: null } } });
      const withEmail = guests.filter(g => g.email);
      if (withEmail.length === 0) return res.status(400).json({ error: 'Keine Gäste mit E-Mail-Adresse' });

      const { emailService } = await import('../services/email');
      const connected = await emailService.testConnection();
      if (!connected) {
        return res.status(503).json({ error: 'E-Mail-Service nicht konfiguriert' });
      }

      const eventUrl = `${process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com'}/e3/${event.slug}`;
      const customSubject = req.body.subject;
      const customMessage = req.body.message;

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const guest of withEmail) {
        try {
          const subject = customSubject || `Du bist eingeladen: ${event.title}`;
          const message = customMessage
            || `Hallo ${guest.firstName},\n\ndu wurdest zum Event "${event.title}" eingeladen!\n\nFotos hochladen und ansehen:\n${eventUrl}\n\nWir freuen uns auf dich!`;
          await emailService.sendCustomEmail({
            to: guest.email!,
            subject,
            text: message,
            html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
          });
          sent++;
        } catch (err: any) {
          failed++;
          errors.push(`${guest.email}: ${err.message}`);
        }
      }

      logger.info('Bulk guest emails sent', { eventId, sent, failed });
      res.json({ success: true, sent, failed, total: withEmail.length, errors: errors.slice(0, 5) });
    } catch (error) {
      logger.error('Bulk guest email error', { error: getErrorMessage(error) });
      res.status(500).json({ error: getErrorMessage(error) || 'Fehler beim Massen-Versand' });
    }
  }
);

// POST /:eventId/guests/:guestId/email — Send invitation email to a guest
router.post(
  '/:eventId/guests/:guestId/email',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, guestId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const [guest, event] = await Promise.all([
        prisma.guest.findFirst({ where: { id: guestId, eventId } }),
        prisma.event.findUnique({ where: { id: eventId } }),
      ]);

      if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });
      if (!guest.email) return res.status(400).json({ error: 'Gast hat keine E-Mail-Adresse' });
      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const { emailService } = await import('../services/email');
      const connected = await emailService.testConnection();
      if (!connected) {
        return res.status(503).json({ error: 'E-Mail-Service nicht konfiguriert. Bitte SMTP in den Admin-Einstellungen einrichten.' });
      }

      const eventUrl = `${process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com'}/e3/${event.slug}`;
      const subject = req.body.subject || `Du bist eingeladen: ${event.title}`;
      const message = req.body.message || `Hallo ${guest.firstName},\n\ndu wurdest zum Event "${event.title}" eingeladen!\n\nFotos hochladen und ansehen:\n${eventUrl}\n\nWir freuen uns auf dich!`;

      await emailService.sendCustomEmail({
        to: guest.email,
        subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
      });

      logger.info('Guest invitation email sent', { guestId, email: guest.email, eventId });
      res.json({ success: true, sentTo: guest.email });
    } catch (error) {
      logger.error('Guest email error', { error: getErrorMessage(error) });
      res.status(500).json({ error: getErrorMessage(error) || 'E-Mail konnte nicht gesendet werden' });
    }
  }
);

export default router;

