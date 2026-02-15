import prisma from '../config/database';
import { emailService } from './email';
import { logger } from '../utils/logger';

interface EventRecapStats {
  totalPhotos: number;
  totalGuestbook: number;
  totalVisits: number;
  topUploaders: { name: string; count: number }[];
  peakHour: string | null;
  gameCompletions: number;
  duration: string;
}

async function getEventRecapStats(eventId: string): Promise<EventRecapStats> {
  const [totalPhotos, totalGuestbook, event, topUploadersRaw, photosByHour, gameCompletions] = await Promise.all([
    prisma.photo.count({ where: { eventId, status: 'APPROVED' } }),
    (prisma as any).guestbookEntry.count({ where: { eventId } }).catch(() => 0),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { visitCount: true, dateTime: true, createdAt: true },
    }),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT "uploadedBy" as name, COUNT(*)::int as count
      FROM photos WHERE "eventId" = $1 AND "uploadedBy" IS NOT NULL AND "status" = 'APPROVED'
      GROUP BY "uploadedBy" ORDER BY count DESC LIMIT 5
    `, eventId).catch(() => []),
    prisma.$queryRawUnsafe<any[]>(`
      SELECT date_trunc('hour', "createdAt") as hour, COUNT(*)::int as count
      FROM photos WHERE "eventId" = $1
      GROUP BY date_trunc('hour', "createdAt") ORDER BY count DESC LIMIT 1
    `, eventId).catch(() => []),
    (prisma as any).challengeCompletion
      ? (prisma as any).challengeCompletion.count({ where: { eventId } }).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const eventStart = event?.dateTime || event?.createdAt || new Date();
  const hoursElapsed = Math.max(1, Math.round((Date.now() - new Date(eventStart).getTime()) / (1000 * 60 * 60)));
  const duration = hoursElapsed > 24 ? `${Math.round(hoursElapsed / 24)} Tage` : `${hoursElapsed} Stunden`;

  const peakHour = photosByHour[0]?.hour
    ? new Date(photosByHour[0].hour).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : null;

  return {
    totalPhotos,
    totalGuestbook,
    totalVisits: event?.visitCount || 0,
    topUploaders: topUploadersRaw.map((u: any) => ({ name: u.name, count: u.count })),
    peakHour,
    gameCompletions,
    duration,
  };
}

export async function sendEventRecapEmail(eventId: string): Promise<boolean> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        locationName: true,
        host: { select: { email: true, name: true } },
      },
    });

    if (!event || !event.host?.email) {
      logger.warn('Event recap: no event or host email', { eventId });
      return false;
    }

    const stats = await getEventRecapStats(eventId);

    const topUploadersHtml = stats.topUploaders.length > 0
      ? stats.topUploaders
          .map((u, i) => `<tr><td style="padding:4px 12px;color:#666">${i + 1}.</td><td style="padding:4px 12px;font-weight:600">${u.name}</td><td style="padding:4px 12px;color:#666">${u.count} Fotos</td></tr>`)
          .join('\n')
      : '<tr><td colspan="3" style="padding:8px;color:#999">Noch keine Uploads</td></tr>';

    const eventDate = event.dateTime
      ? new Date(event.dateTime).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : '';

    const baseUrl = process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com';

    const subject = `📸 Event-Zusammenfassung: ${event.title}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:white;margin:0;font-size:24px">📸 Event-Zusammenfassung</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px">${event.title}</p>
          ${eventDate ? `<p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">${eventDate}${event.locationName ? ` • ${event.locationName}` : ''}</p>` : ''}
        </div>

        <div style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none">
          <h2 style="font-size:16px;margin:0 0 16px;color:#374151">Dein Event in Zahlen</h2>

          <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px">
            <div style="flex:1;min-width:120px;background:white;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb">
              <div style="font-size:28px;font-weight:800;color:#667eea">${stats.totalPhotos}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px">Fotos</div>
            </div>
            <div style="flex:1;min-width:120px;background:white;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb">
              <div style="font-size:28px;font-weight:800;color:#10b981">${stats.totalVisits}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px">Besucher</div>
            </div>
            <div style="flex:1;min-width:120px;background:white;border-radius:12px;padding:16px;text-align:center;border:1px solid #e5e7eb">
              <div style="font-size:28px;font-weight:800;color:#f59e0b">${stats.totalGuestbook}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px">Gästebuch</div>
            </div>
          </div>

          ${stats.gameCompletions > 0 ? `
            <div style="background:white;border-radius:12px;padding:12px 16px;border:1px solid #e5e7eb;margin-bottom:16px">
              <span style="font-size:13px;color:#6b7280">🎮 Foto-Spiele abgeschlossen: <strong style="color:#222">${stats.gameCompletions}</strong></span>
            </div>
          ` : ''}

          ${stats.peakHour ? `
            <div style="background:white;border-radius:12px;padding:12px 16px;border:1px solid #e5e7eb;margin-bottom:16px">
              <span style="font-size:13px;color:#6b7280">⏰ Peak-Stunde: <strong style="color:#222">${stats.peakHour} Uhr</strong></span>
              <span style="font-size:13px;color:#6b7280;margin-left:12px">⏱ Dauer: <strong style="color:#222">${stats.duration}</strong></span>
            </div>
          ` : ''}

          <h3 style="font-size:14px;margin:20px 0 8px;color:#374151">🏆 Top Fotografen</h3>
          <table style="width:100%;background:white;border-radius:12px;border:1px solid #e5e7eb;border-collapse:collapse">
            ${topUploadersHtml}
          </table>
        </div>

        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;text-align:center">
          <a href="${baseUrl}/e3/${event.slug}" style="display:inline-block;background:#667eea;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Event-Galerie öffnen</a>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">
            <a href="${baseUrl}/events/${event.id}/guestbook/export-pdf" style="color:#667eea;text-decoration:none">📖 Gästebuch als PDF herunterladen</a>
          </p>
        </div>

        <p style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px">
          Gesendet von Gästefotos • <a href="${baseUrl}" style="color:#9ca3af">gästefotos.com</a>
        </p>
      </div>
    `;

    const text = `Event-Zusammenfassung: ${event.title}\n\n` +
      `Fotos: ${stats.totalPhotos}\n` +
      `Besucher: ${stats.totalVisits}\n` +
      `Gästebuch: ${stats.totalGuestbook}\n` +
      (stats.peakHour ? `Peak: ${stats.peakHour} Uhr\n` : '') +
      `\nEvent-Galerie: ${baseUrl}/e3/${event.slug}\n`;

    await emailService.sendTemplatedEmail({
      to: event.host.email,
      template: { subject, html, text },
      variables: {},
    });

    logger.info('Event recap email sent', { eventId, to: event.host.email });
    return true;
  } catch (err) {
    logger.error('Event recap email failed', { eventId, error: (err as Error).message });
    return false;
  }
}

// ─── Worker: Auto-send recap 24h after event date ───────────────────────────

export async function startEventRecapWorker(): Promise<void> {
  const INTERVAL = 60 * 60 * 1000; // Check every hour

  async function checkAndSend() {
    try {
      // Find events that ended 24h ago and haven't received a recap
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // Max 48h ago

      const events = await prisma.event.findMany({
        where: {
          dateTime: { gte: recentCutoff, lte: cutoff },
          isActive: true,
          deletedAt: null,
        },
        select: { id: true, title: true },
      });

      for (const event of events) {
        // Check if recap was already sent (use EventReminderLog)
        const existing = await (prisma as any).eventReminderLog.findFirst({
          where: { eventId: event.id, type: 'EVENT_RECAP' },
        }).catch(() => null);

        if (existing) continue;

        const sent = await sendEventRecapEmail(event.id);

        if (sent) {
          await (prisma as any).eventReminderLog.create({
            data: {
              eventId: event.id,
              type: 'EVENT_RECAP',
              sentAt: new Date(),
            },
          }).catch(() => {});
        }
      }
    } catch (err) {
      logger.warn('Event recap worker error', { error: (err as Error).message });
    }
  }

  // Run immediately + every hour
  checkAndSend();
  setInterval(checkAndSend, INTERVAL);
  logger.info('Event recap worker started (checks every hour)');
}
