/**
 * Demo Mosaic Retention Worker
 *
 * Free-tier (demo) mosaic walls are archived after 7 days:
 * - All tile images are deleted from storage
 * - All tile DB rows are deleted
 * - Wall status is set to ARCHIVED
 *
 * This keeps storage costs low while giving free users a full taste of the feature.
 */

import prisma from '../config/database';
import { storageService } from './storage';
import { isFeatureEnabled } from './featureGate';
import { logger } from '../utils/logger';

const DEMO_RETENTION_DAYS = 7;
const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const BATCH_SIZE = 50;

async function purgeExpiredDemoMosaics(): Promise<void> {
  const cutoff = new Date(Date.now() - DEMO_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // Find active/draft mosaic walls older than 7 days
  const walls = await prisma.mosaicWall.findMany({
    where: {
      createdAt: { lte: cutoff },
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    select: {
      id: true,
      eventId: true,
      createdAt: true,
      status: true,
    },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
  });

  if (walls.length === 0) return;

  let purgedCount = 0;

  for (const wall of walls) {
    try {
      // Only purge if the event is on the free tier (no mosaic feature)
      const hasMosaicFeature = await isFeatureEnabled(wall.eventId, 'mosaicWall');
      if (hasMosaicFeature) continue; // Paid user — skip

      // Delete tile images from storage
      const tiles = await prisma.mosaicTile.findMany({
        where: { mosaicWallId: wall.id },
        select: { id: true, croppedImagePath: true },
      });

      for (const tile of tiles) {
        if (tile.croppedImagePath) {
          try {
            await storageService.deleteFile(tile.croppedImagePath);
          } catch (err: any) {
            logger.warn('Demo mosaic retention: tile image delete failed', {
              tileId: tile.id, message: err.message,
            });
          }
        }
      }

      // Delete all tiles from DB
      await prisma.mosaicTile.deleteMany({
        where: { mosaicWallId: wall.id },
      });

      // Reset wall to DRAFT (keeps config so user can re-activate after upgrade)
      await prisma.mosaicWall.update({
        where: { id: wall.id },
        data: { status: 'DRAFT' },
      });

      purgedCount++;
      logger.info('Demo mosaic retention: wall archived', {
        wallId: wall.id,
        eventId: wall.eventId,
        tileCount: tiles.length,
        ageHours: Math.round((Date.now() - wall.createdAt.getTime()) / (60 * 60 * 1000)),
      });
    } catch (err: any) {
      logger.error('Demo mosaic retention: wall purge failed', {
        wallId: wall.id, eventId: wall.eventId, message: err.message,
      });
    }
  }

  if (purgedCount > 0) {
    logger.info('Demo mosaic retention: cycle complete', { purged: purgedCount, checked: walls.length });
  }
}

let retentionTimer: NodeJS.Timeout | null = null;

export function startDemoMosaicRetentionWorker(): void {
  logger.info('Demo mosaic retention worker starting', {
    retentionDays: DEMO_RETENTION_DAYS,
    intervalMs: INTERVAL_MS,
  });

  // Run once at boot
  purgeExpiredDemoMosaics().catch((err) => {
    logger.error('Demo mosaic retention: initial run failed', { message: err.message });
  });

  retentionTimer = setInterval(() => {
    purgeExpiredDemoMosaics().catch((err) => {
      logger.error('Demo mosaic retention: run failed', { message: err.message });
    });
  }, INTERVAL_MS);
  retentionTimer.unref?.();
}

export function stopDemoMosaicRetentionWorker(): void {
  if (retentionTimer) {
    clearInterval(retentionTimer);
    retentionTimer = null;
  }
}
