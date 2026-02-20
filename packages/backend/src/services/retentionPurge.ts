import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';
import { getEventStorageEndsAt } from './storagePolicy';

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_BATCH_SIZE = 200;
const RETENTION_GRACE_MONTHS = 6;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function getPurgeIntervalMs(): number {
  const raw = process.env.RETENTION_PURGE_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.RETENTION_PURGE_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

async function purgeExpiredOnce(): Promise<void> {
  const hardDelete = process.env.RETENTION_PURGE_HARD_DELETE === 'true';
  const now = new Date();
  const batchSize = getBatchSize();

  // 1) Purge by computed storage policy:
  // If the event is past storageEndsAt AND the 6-month grace period, hard-delete the event.
  // This will remove all child rows via DB cascade.
  // Storage objects are cleaned up by explicitly deleting photo/video storagePath before deleting the event.
  if (hardDelete) {
    const eventCandidates = await prisma.event.findMany({
      where: {
        dateTime: { not: null },
      },
      select: { id: true, hostId: true, dateTime: true },
      take: Math.min(batchSize, 100),
      orderBy: { dateTime: 'asc' },
    });

    for (const e of eventCandidates) {
      try {
        const endsAt = await getEventStorageEndsAt(e.id);
        if (!endsAt) continue;
        const purgeAt = addMonths(endsAt, RETENTION_GRACE_MONTHS);
        if (now.getTime() <= purgeAt.getTime()) continue;

        const photos = await prisma.photo.findMany({
          where: { eventId: e.id },
          select: { id: true, storagePath: true },
          take: batchSize,
        });
        for (const p of photos) {
          try {
            await storageService.deleteFile(p.storagePath);
          } catch (err) {
            logger.warn('Retention purge (storage): failed deleting photo from storage', {
              eventId: e.id,
              photoId: p.id,
              message: (err as any)?.message || String(err),
            });
          }
        }

        const videos = await prisma.video.findMany({
          where: { eventId: e.id },
          select: { id: true, storagePath: true },
          take: batchSize,
        });
        for (const v of videos) {
          try {
            await storageService.deleteFile(v.storagePath);
          } catch (err) {
            logger.warn('Retention purge (storage): failed deleting video from storage', {
              eventId: e.id,
              videoId: v.id,
              message: (err as any)?.message || String(err),
            });
          }
        }

        await prisma.event.delete({ where: { id: e.id } });
        logger.info('Retention purge (storage): event hard-deleted after grace period', {
          eventId: e.id,
          hostId: e.hostId,
          storageEndsAt: endsAt.toISOString(),
          purgeAt: purgeAt.toISOString(),
        });
      } catch (err) {
        logger.error('Retention purge (storage): event delete failed', {
          eventId: e.id,
          message: (err as any)?.message || String(err),
        });
      }
    }
  }

  // Purge media first (storage objects exist on media)
  const photos = await prisma.photo.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { not: null, lte: now },
    },
    select: { id: true, storagePath: true, eventId: true },
    take: batchSize,
    orderBy: { purgeAfter: 'asc' },
  });

  if (!hardDelete) {
    if (photos.length > 0) {
      await prisma.photo.updateMany({
        where: { id: { in: photos.map((p) => p.id) } },
        data: { purgeAfter: null },
      });
      logger.warn('Retention purge (soft): cleared purgeAfter on photos (no delete)', { count: photos.length });
    }
  }

  for (const p of photos) {
    try {
      if (!hardDelete) {
        continue;
      }

      try {
        await storageService.deleteFile(p.storagePath);
      } catch (err) {
        logger.warn('Retention purge: failed deleting photo from storage', { photoId: p.id, message: (err as any)?.message || String(err) });
      }

      await prisma.photo.delete({ where: { id: p.id } });
      logger.info('Retention purge: photo deleted', { photoId: p.id, eventId: p.eventId });
    } catch (err) {
      logger.error('Retention purge: photo delete failed', { photoId: p.id, message: (err as any)?.message || String(err) });
    }
  }

  const videos = await prisma.video.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { not: null, lte: now },
    },
    select: { id: true, storagePath: true, eventId: true },
    take: batchSize,
    orderBy: { purgeAfter: 'asc' },
  });

  if (!hardDelete) {
    if (videos.length > 0) {
      await prisma.video.updateMany({
        where: { id: { in: videos.map((v) => v.id) } },
        data: { purgeAfter: null },
      });
      logger.warn('Retention purge (soft): cleared purgeAfter on videos (no delete)', { count: videos.length });
    }
  }

  for (const v of videos) {
    try {
      if (!hardDelete) {
        continue;
      }

      try {
        await storageService.deleteFile(v.storagePath);
      } catch (err) {
        logger.warn('Retention purge: failed deleting video from storage', { videoId: v.id, message: (err as any)?.message || String(err) });
      }

      await prisma.video.delete({ where: { id: v.id } });
      logger.info('Retention purge: video deleted', { videoId: v.id, eventId: v.eventId });
    } catch (err) {
      logger.error('Retention purge: video delete failed', { videoId: v.id, message: (err as any)?.message || String(err) });
    }
  }

  // Purge expired events (DB cascade will remove child rows).
  // Note: Storage cleanup for event-related objects is handled via media purge; if an event has no media records
  // left, this will still delete the event. Remaining stray storage objects would require an offline garbage collector.
  const events = await prisma.event.findMany({
    where: {
      deletedAt: { not: null },
      purgeAfter: { not: null, lte: now },
    },
    select: { id: true, hostId: true },
    take: Math.min(batchSize, 100),
    orderBy: { purgeAfter: 'asc' },
  });

  if (!hardDelete) {
    if (events.length > 0) {
      await prisma.event.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: { purgeAfter: null },
      });
      logger.warn('Retention purge (soft): cleared purgeAfter on events (no delete)', { count: events.length });
    }
  }

  for (const e of events) {
    try {
      if (!hardDelete) {
        continue;
      }

      await prisma.event.delete({ where: { id: e.id } });
      logger.info('Retention purge: event deleted', { eventId: e.id, hostId: e.hostId });
    } catch (err) {
      logger.error('Retention purge: event delete failed', { eventId: e.id, message: (err as any)?.message || String(err) });
    }
  }
}

// ─── Storage Expiry Reminder Emails ─────────────────────────────────────────

async function sendExpiryReminders(): Promise<void> {
  try {
    const { emailService } = await import('./email');
    const connected = await emailService.testConnection();
    if (!connected) return; // No email configured

    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in1d = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Find events expiring in 7 days (±12h window) where reminder not yet sent
    const events7d = await prisma.event.findMany({
      where: {
        deletedAt: null,
        dateTime: {
          gte: new Date(in7d.getTime() - 12 * 60 * 60 * 1000),
          lte: new Date(in7d.getTime() + 12 * 60 * 60 * 1000),
        },
        // Only events whose storage hasn't expired yet
      },
      select: { id: true, title: true, slug: true, hostId: true },
      take: 50,
    });

    for (const event of events7d) {
      try {
        const host = await prisma.user.findUnique({ where: { id: event.hostId }, select: { email: true, name: true } });
        if (!host?.email) continue;

        const frontendUrl = process.env.FRONTEND_URL || 'https://app.xn--gstefotos-v2a.com';
        const eventUrl = `${frontendUrl}/events/${event.id}/photos`;
        await emailService.sendCustomEmail({
          to: host.email,
          subject: `⏰ Reminder: "${event.title}" — Speicherzeit läuft in 7 Tagen ab`,
          text: `Hallo ${host.name || 'Host'},\n\ndas Event "${event.title}" wurde vor ca. einem Jahr erstellt. Der Speicherplatz für deine Fotos läuft in 7 Tagen ab.\n\nBitte lade deine Fotos jetzt herunter:\n${eventUrl}\n\nNach dem Ablauf werden die Fotos schrittweise gelöscht.`,
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px;text-align:center">
  <h1 style="margin:0;color:#fff;font-size:24px">⏰ Speicherzeit läuft ab</h1>
  <p style="margin:8px 0 0;color:rgba(255,255,255,0.9)">${event.title}</p>
</td></tr>
<tr><td style="padding:32px">
  <p style="color:#374151">Hallo <strong>${host.name || 'Host'}</strong>,</p>
  <p style="color:#6b7280;line-height:1.6">Der Speicherplatz für dein Event <strong>${event.title}</strong> läuft in <strong>7 Tagen</strong> ab. Bitte lade deine Fotos rechtzeitig herunter.</p>
  <div style="text-align:center;margin:32px 0">
    <a href="${eventUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:700">Fotos jetzt sichern 📁</a>
  </div>
</td></tr></table></td></tr></table></body></html>`,
        });
        logger.info('Storage expiry reminder sent (7d)', { eventId: event.id, email: host.email });
      } catch (err: any) {
        logger.warn('Failed to send expiry reminder', { eventId: event.id, err: err.message });
      }
    }
  } catch (err: any) {
    logger.warn('Expiry reminder check failed (non-critical)', { err: err.message });
  }
}

let purgeTimer: NodeJS.Timeout | null = null;
let reminderTimer: NodeJS.Timeout | null = null;

export function startRetentionPurgeWorker(): void {
  const enabled = process.env.RETENTION_PURGE_ENABLED === 'true';
  if (!enabled) {
    logger.info('Retention purge worker disabled');
    return;
  }

  const intervalMs = getPurgeIntervalMs();
  logger.info('Retention purge worker starting', { intervalMs, batchSize: getBatchSize() });

  // Run immediately once at boot (best effort)
  purgeExpiredOnce().catch((err) => {
    logger.error('Retention purge worker initial run failed', { err });
  });

  purgeTimer = setInterval(() => {
    purgeExpiredOnce().catch((err) => {
      logger.error('Retention purge worker run failed', { err });
    });
  }, intervalMs);
  purgeTimer.unref?.();

  // Run expiry reminders daily (24h interval)
  reminderTimer = setInterval(() => {
    sendExpiryReminders().catch(() => {});
  }, 24 * 60 * 60 * 1000);
  reminderTimer.unref?.();
  // Run once at startup (best effort)
  sendExpiryReminders().catch(() => {});
}

export function stopRetentionPurgeWorker(): void {
  if (purgeTimer) { clearInterval(purgeTimer); purgeTimer = null; }
  if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; }
}
