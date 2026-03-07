import prisma from '../config/database';
import { emailService } from './email';
import { logger } from '../utils/logger';

const LOG = '[PhotoDelivery]';
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://gaestefotos.com';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Send photo delivery email to a single opted-in guest
 */
async function sendPhotoDeliveryEmail(guest: { email: string; firstName: string }, event: { id: string; title: string; slug: string; photoCount: number }): Promise<boolean> {
  const galleryUrl = `${APP_BASE_URL}/e3/${event.slug}`;
  const unsubscribeUrl = `${APP_BASE_URL}/api/events/${event.id}/guests/email-optin?email=${encodeURIComponent(guest.email)}&unsubscribe=1`;

  const subject = `📸 Deine Fotos von "${event.title}" sind bereit!`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:520px;margin:0 auto;background:#fff">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 24px;border-radius:16px 16px 0 0;text-align:center">
        <div style="font-size:48px;margin-bottom:8px">📸</div>
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">Deine Event-Fotos sind da!</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">${escapeHtml(event.title)}</p>
      </div>

      <div style="padding:24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none">
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
          Hallo ${escapeHtml(guest.firstName)},
        </p>
        <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px">
          ${event.photoCount > 0 ? `<strong>${event.photoCount} Fotos</strong> von deinem Event warten auf dich!` : 'Die Fotos von deinem Event sind jetzt verfügbar!'}
          Schau sie dir an, lade sie herunter und teile sie mit Freunden.
        </p>

        <div style="text-align:center;margin:24px 0">
          <a href="${galleryUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:16px;font-weight:700">
            Fotos ansehen →
          </a>
        </div>

        <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
          Oder öffne: <a href="${galleryUrl}" style="color:#667eea">${galleryUrl}</a>
        </p>
      </div>

      <div style="padding:16px 24px;background:#f3f4f6;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;text-align:center">
        <p style="margin:0;color:#9ca3af;font-size:11px">
          Du erhältst diese E-Mail, weil du dich für Foto-Benachrichtigungen angemeldet hast.<br>
          <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">Abmelden</a> · Gesendet von <a href="${APP_BASE_URL}" style="color:#9ca3af">gästefotos.com</a>
        </p>
      </div>
    </div>
  `;

  const text = `Hallo ${guest.firstName},\n\n` +
    `Die Fotos von "${event.title}" sind jetzt verfügbar!\n` +
    (event.photoCount > 0 ? `${event.photoCount} Fotos warten auf dich.\n\n` : '\n') +
    `Fotos ansehen: ${galleryUrl}\n\n` +
    `Abmelden: ${unsubscribeUrl}\n\n` +
    `Dein Gästefotos-Team`;

  try {
    await emailService.sendCustomEmail({ to: guest.email, subject, html, text });
    return true;
  } catch (err) {
    logger.warn(`${LOG} Email failed for ${guest.email}`, { error: (err as Error).message });
    return false;
  }
}

/**
 * Deliver photos to all opted-in guests of an event
 */
export async function deliverPhotosToGuests(eventId: string): Promise<{ sent: number; total: number }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true },
  });
  if (!event || !event.slug) {
    logger.warn(`${LOG} Event not found or has no slug`, { eventId });
    return { sent: 0, total: 0 };
  }

  const photoCount = await prisma.photo.count({ where: { eventId, status: 'APPROVED' } });

  const guests = await prisma.guest.findMany({
    where: { eventId, emailOptIn: true, email: { not: null } },
    select: { email: true, firstName: true },
  });

  if (guests.length === 0) {
    logger.info(`${LOG} No opted-in guests for event ${eventId}`);
    return { sent: 0, total: 0 };
  }

  let sent = 0;
  for (const g of guests) {
    if (!g.email) continue;
    const ok = await sendPhotoDeliveryEmail(
      { email: g.email, firstName: g.firstName },
      { id: event.id, title: event.title, slug: event.slug, photoCount },
    );
    if (ok) sent++;
  }

  logger.info(`${LOG} Photo delivery sent ${sent}/${guests.length} emails`, { eventId });
  return { sent, total: guests.length };
}

/**
 * Worker: Auto-deliver photos to opted-in guests ~4h after event ends
 */
export async function startPhotoDeliveryWorker(): Promise<void> {
  const INTERVAL = 30 * 60 * 1000; // Check every 30 minutes

  async function checkAndDeliver() {
    try {
      // Find events that ended ~4h ago (between 3h and 5h ago)
      const minCutoff = new Date(Date.now() - 5 * 60 * 60 * 1000);
      const maxCutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);

      // Events with dateTime + 4h default duration = ended between 3-5h ago
      // We look for events whose dateTime is between 7-9h ago (dateTime + ~4h duration)
      const eventMinDate = new Date(Date.now() - 9 * 60 * 60 * 1000);
      const eventMaxDate = new Date(Date.now() - 7 * 60 * 60 * 1000);

      const events = await prisma.event.findMany({
        where: {
          dateTime: { gte: eventMinDate, lte: eventMaxDate },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, title: true },
      });

      for (const event of events) {
        // Check if delivery was already sent
        const existing = await (prisma as any).eventReminderLog.findFirst({
          where: { eventId: event.id, kind: 'PHOTO_DELIVERY' },
        }).catch(() => null);

        if (existing) continue;

        // Check if there are any opted-in guests
        const optInCount = await prisma.guest.count({
          where: { eventId: event.id, emailOptIn: true, email: { not: null } },
        });

        if (optInCount === 0) continue;

        const result = await deliverPhotosToGuests(event.id);

        if (result.sent > 0) {
          await (prisma as any).eventReminderLog.create({
            data: {
              eventId: event.id,
              kind: 'PHOTO_DELIVERY',
              daysBefore: 0,
              sentAt: new Date(),
            },
          }).catch(() => {});
        }

        logger.info(`${LOG} Worker delivered for "${event.title}": ${result.sent}/${result.total}`);
      }
    } catch (err) {
      logger.warn(`${LOG} Worker error`, { error: (err as Error).message });
    }
  }

  checkAndDeliver();
  setInterval(checkAndDeliver, INTERVAL);
  logger.info(`${LOG} Photo delivery worker started (checks every 30min)`);
}
