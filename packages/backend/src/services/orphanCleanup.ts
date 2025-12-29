import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 200;
const DEFAULT_STALE_TEMP_MINUTES = 120;
const DEFAULT_STALE_SCAN_PENDING_HOURS = 24;

function getIntervalMs(): number {
  const raw = process.env.ORPHAN_CLEANUP_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.ORPHAN_CLEANUP_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

function getStaleTempMinutes(): number {
  const raw = process.env.ORPHAN_CLEANUP_STALE_TEMP_MINUTES;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_STALE_TEMP_MINUTES;
  return Math.floor(n);
}

function getStaleScanPendingHours(): number {
  const raw = process.env.ORPHAN_CLEANUP_STALE_SCAN_PENDING_HOURS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_STALE_SCAN_PENDING_HOURS;
  return Math.floor(n);
}

async function cleanupExpiredGuestbookPhotoUploads(now: Date, batchSize: number): Promise<number> {
  const expired = (await (prisma as any).guestbookPhotoUpload.findMany({
    where: {
      claimedAt: null,
      expiresAt: { lt: now },
    },
    select: { id: true, storagePath: true, eventId: true },
    take: batchSize,
    orderBy: { expiresAt: 'asc' },
  })) as Array<{ id: string; storagePath: string; eventId: string }>;

  for (const u of expired) {
    try {
      await (prisma as any).guestbookPhotoUpload.update({
        where: { id: u.id },
        data: { claimedAt: now },
      });
      logger.info('Orphan cleanup: guestbook upload marked claimed (expired)', { uploadId: u.id, eventId: u.eventId });
    } catch (err) {
      logger.error('Orphan cleanup: guestbook upload mark claimed failed', {
        uploadId: u.id,
        eventId: u.eventId,
        message: (err as any)?.message || String(err),
      });
    }
  }

  return expired.length;
}

async function cleanupStaleTempMedia(now: Date, batchSize: number, staleMinutes: number): Promise<{ photos: number; videos: number }> {
  const cutoff = new Date(now.getTime() - staleMinutes * 60 * 1000);

  const photos = await prisma.photo.findMany({
    where: {
      deletedAt: null,
      createdAt: { lt: cutoff },
      storagePath: '',
      url: '',
    },
    select: { id: true, eventId: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let photosDeleted = 0;
  for (const p of photos) {
    try {
      await prisma.photo.update({
        where: { id: p.id },
        data: {
          status: 'DELETED',
          deletedAt: now,
          purgeAfter: null,
        },
      });
      photosDeleted++;
      logger.info('Orphan cleanup: temp photo record marked DELETED', { photoId: p.id, eventId: p.eventId });
    } catch (err) {
      logger.error('Orphan cleanup: temp photo mark DELETED failed', {
        photoId: p.id,
        eventId: p.eventId,
        message: (err as any)?.message || String(err),
      });
    }
  }

  const videos = await prisma.video.findMany({
    where: {
      deletedAt: null,
      createdAt: { lt: cutoff },
      storagePath: '',
      url: '',
    },
    select: { id: true, eventId: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let videosDeleted = 0;
  for (const v of videos) {
    try {
      await prisma.video.update({
        where: { id: v.id },
        data: {
          status: 'DELETED',
          deletedAt: now,
          purgeAfter: null,
        },
      });
      videosDeleted++;
      logger.info('Orphan cleanup: temp video record marked DELETED', { videoId: v.id, eventId: v.eventId });
    } catch (err) {
      logger.error('Orphan cleanup: temp video mark DELETED failed', {
        videoId: v.id,
        eventId: v.eventId,
        message: (err as any)?.message || String(err),
      });
    }
  }

  return { photos: photosDeleted, videos: videosDeleted };
}

async function markStalePendingPhotoScans(now: Date, batchSize: number, stalePendingHours: number): Promise<number> {
  const cutoff = new Date(now.getTime() - stalePendingHours * 60 * 60 * 1000);

  const pending = await prisma.photo.findMany({
    where: {
      deletedAt: null,
      createdAt: { lt: cutoff },
      exifData: {
        path: ['scanStatus'],
        equals: 'PENDING',
      },
    },
    select: { id: true, eventId: true, exifData: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  for (const p of pending) {
    const prev = (p.exifData as any) || {};
    try {
      await prisma.photo.update({
        where: { id: p.id },
        data: {
          exifData: {
            ...prev,
            scanStatus: 'ERROR',
            scanError: 'STALE_PENDING',
            scanUpdatedAt: new Date().toISOString(),
          },
        },
      });
      updated++;
      logger.warn('Orphan cleanup: photo scan marked ERROR', { photoId: p.id, eventId: p.eventId });
    } catch (err) {
      logger.error('Orphan cleanup: failed to mark photo scan ERROR', {
        photoId: p.id,
        eventId: p.eventId,
        message: (err as any)?.message || String(err),
      });
    }
  }

  return updated;
}

async function markStalePendingVideoScans(now: Date, batchSize: number, stalePendingHours: number): Promise<number> {
  const cutoff = new Date(now.getTime() - stalePendingHours * 60 * 60 * 1000);

  const pending = await (prisma as any).video.findMany({
    where: {
      deletedAt: null,
      createdAt: { lt: cutoff },
      scanStatus: 'PENDING',
      status: { not: 'DELETED' },
    },
    select: { id: true, eventId: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  for (const v of pending) {
    try {
      await (prisma as any).video.update({
        where: { id: v.id },
        data: {
          scanStatus: 'ERROR',
          scanError: 'STALE_PENDING',
          scannedAt: new Date(),
        },
      });
      updated++;
      logger.warn('Orphan cleanup: video scan marked ERROR', { videoId: v.id, eventId: v.eventId });
    } catch (err) {
      logger.error('Orphan cleanup: failed to mark video scan ERROR', {
        videoId: v.id,
        eventId: v.eventId,
        message: (err as any)?.message || String(err),
      });
    }
  }

  return updated;
}

async function orphanCleanupOnce(): Promise<void> {
  const now = new Date();
  const batchSize = getBatchSize();
  const staleMinutes = getStaleTempMinutes();
  const staleScanPendingHours = getStaleScanPendingHours();

  const guestbookUploadsDeleted = await cleanupExpiredGuestbookPhotoUploads(now, batchSize);
  const stale = await cleanupStaleTempMedia(now, batchSize, staleMinutes);
  const staleScanMarkedError = await markStalePendingPhotoScans(now, batchSize, staleScanPendingHours);
  const staleVideoScanMarkedError = await markStalePendingVideoScans(now, batchSize, staleScanPendingHours);

  if (
    guestbookUploadsDeleted > 0 ||
    stale.photos > 0 ||
    stale.videos > 0 ||
    staleScanMarkedError > 0 ||
    staleVideoScanMarkedError > 0
  ) {
    logger.info('Orphan cleanup: run summary', {
      guestbookUploadsDeleted,
      staleTempPhotosDeleted: stale.photos,
      staleTempVideosDeleted: stale.videos,
      staleScanMarkedError,
      staleVideoScanMarkedError,
    });
  }
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startOrphanCleanupWorker(): void {
  const enabled = process.env.ORPHAN_CLEANUP_ENABLED === 'true';
  if (!enabled) {
    logger.info('Orphan cleanup worker disabled');
    return;
  }

  const intervalMs = getIntervalMs();
  logger.info('Orphan cleanup worker starting', {
    intervalMs,
    batchSize: getBatchSize(),
    staleTempMinutes: getStaleTempMinutes(),
    staleScanPendingHours: getStaleScanPendingHours(),
  });

  orphanCleanupOnce().catch((err) => {
    logger.error('Orphan cleanup worker initial run failed', { message: (err as any)?.message || String(err) });
  });

  cleanupTimer = setInterval(() => {
    orphanCleanupOnce().catch((err) => {
      logger.error('Orphan cleanup worker run failed', { message: (err as any)?.message || String(err) });
    });
  }, intervalMs);
  cleanupTimer.unref?.();
}

export function stopOrphanCleanupWorker(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
