import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

let scanTimer: NodeJS.Timeout | null = null;

async function processPendingPhotoScans(): Promise<void> {
  const pending = await prisma.photo.findMany({
    where: {
      deletedAt: null,
      status: { not: 'DELETED' },
      exifData: {
        path: ['scanStatus'],
        equals: 'PENDING',
      },
    },
    select: {
      id: true,
      exifData: true,
      eventId: true,
      event: {
        select: {
          featuresConfig: true,
        },
      },
    },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  const globalAutoClean = process.env.VIRUS_SCAN_AUTO_CLEAN === 'true';

  for (const item of pending) {
    const prev = (item.exifData as any) || {};
    try {
      const perEventAutoClean = (item.event.featuresConfig as any)?.virusScan?.autoClean === true;
      if (!globalAutoClean && !perEventAutoClean) {
        continue;
      }

      await prisma.photo.update({
        where: { id: item.id },
        data: {
          exifData: {
            ...prev,
            scanStatus: 'CLEAN',
            scanError: null,
            scanUpdatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      logger.warn('[VirusScan] failed to update scan status', {
        message: getErrorMessage(error),
        photoId: item.id,
      });
    }
  }
}

async function processPendingVideoScans(): Promise<void> {
  const pending = await (prisma as any).video.findMany({
    where: {
      deletedAt: null,
      status: { not: 'DELETED' },
      scanStatus: 'PENDING',
    },
    select: {
      id: true,
      eventId: true,
      event: {
        select: {
          featuresConfig: true,
        },
      },
    },
    take: 50,
    orderBy: { createdAt: 'asc' },
  });

  const globalAutoClean = process.env.VIRUS_SCAN_AUTO_CLEAN === 'true';

  for (const item of pending) {
    try {
      const perEventAutoClean = (item.event.featuresConfig as any)?.virusScan?.autoClean === true;
      if (!globalAutoClean && !perEventAutoClean) {
        continue;
      }

      await (prisma as any).video.update({
        where: { id: item.id },
        data: {
          scanStatus: 'CLEAN',
          scannedAt: new Date(),
          scanError: null,
        },
      });
    } catch (error) {
      logger.warn('[VirusScan] failed to update video scan status', {
        message: getErrorMessage(error),
        videoId: item.id,
      });
    }
  }
}

export function startVirusScanWorker(): void {
  const enabled = process.env.VIRUS_SCAN_WORKER_ENABLED === 'true';
  if (!enabled) {
    logger.info('Virus scan worker disabled');
    return;
  }

  if (scanTimer) {
    return;
  }

  const intervalMs = Number(process.env.VIRUS_SCAN_POLL_INTERVAL_MS || '60000');
  const safeIntervalMs = Number.isFinite(intervalMs) && intervalMs >= 5000 ? intervalMs : 60000;

  scanTimer = setInterval(() => {
    Promise.all([processPendingPhotoScans(), processPendingVideoScans()]).catch((error) => {
      logger.warn('[VirusScan] worker tick failed', { message: getErrorMessage(error) });
    });
  }, safeIntervalMs);

  logger.info('Virus scan worker started', { intervalMs: safeIntervalMs });
}
