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

      const buildHtml = (firstName: string, message: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#e879a6,#f9a825);padding:32px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:24px">📸 ${event.title.replace(/</g, '&lt;')}</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.9)">Du bist eingeladen!</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="color:#374151">Hallo <strong>${firstName.replace(/</g, '&lt;')}</strong>,</p>
  <p style="color:#6b7280;line-height:1.6">${message.replace(/\n/g, '<br>')}</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${eventUrl}" style="background:linear-gradient(135deg,#e879a6,#f9a825);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700">Jetzt Fotos ansehen 📸</a>
  </div>
  <p style="color:#9ca3af;font-size:12px;text-align:center"><a href="${eventUrl}" style="color:#e879a6">${eventUrl}</a></p>
</td></tr></table></td></tr></table></body></html>`;

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const guest of withEmail) {
        try {
          const subject = customSubject || `Du bist eingeladen: ${event.title}`;
          const plainText = customMessage
            || `Hallo ${guest.firstName},\n\ndu wurdest zum Event "${event.title}" eingeladen!\n\nFotos hochladen und ansehen:\n${eventUrl}\n\nWir freuen uns auf dich!`;
          await emailService.sendCustomEmail({
            to: guest.email!,
            subject,
            text: plainText,
            html: buildHtml(guest.firstName, customMessage || `Du wurdest zum Event <strong>${event.title.replace(/</g, '&lt;')}</strong> eingeladen. Lade deine Fotos hoch!`),
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
      const plainText = req.body.message || `Hallo ${guest.firstName},\n\ndu wurdest zum Event "${event.title}" eingeladen!\n\nFotos hochladen und ansehen:\n${eventUrl}\n\nWir freuen uns auf dich!`;

      const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#e879a6,#f9a825);padding:32px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800">📸 ${event.title.replace(/</g, '&lt;')}</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:15px">Du bist eingeladen!</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="margin:0 0 16px;color:#374151;font-size:16px">Hallo <strong>${guest.firstName.replace(/</g, '&lt;')}</strong>,</p>
  <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
    ${(req.body.message || `Du wurdest zum Event <strong>${event.title.replace(/</g, '&lt;')}</strong> eingeladen. Lade deine Fotos hoch und sieh dir die Galerie an!`).replace(/\n/g, '<br>')}
  </p>
  <div style="text-align:center;margin:32px 0">
    <a href="${eventUrl}" style="display:inline-block;background:linear-gradient(135deg,#e879a6,#f9a825);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:16px;font-weight:700">Jetzt Fotos ansehen 📸</a>
  </div>
  <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">Oder diesen Link öffnen: <a href="${eventUrl}" style="color:#e879a6">${eventUrl}</a></p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center">
  <p style="margin:0;color:#9ca3af;font-size:12px">Diese Einladung wurde von g&auml;stefotos.com generiert.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

      await emailService.sendCustomEmail({
        to: guest.email,
        subject,
        text: plainText,
        html: htmlBody,
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

