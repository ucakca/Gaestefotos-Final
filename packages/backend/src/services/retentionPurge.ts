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

let purgeTimer: NodeJS.Timeout | null = null;

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
}

export function stopRetentionPurgeWorker(): void {
  if (purgeTimer) {
    clearInterval(purgeTimer);
    purgeTimer = null;
  }
}
