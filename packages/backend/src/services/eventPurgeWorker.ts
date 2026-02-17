/**
 * Event Purge Worker
 * 
 * Periodically hard-deletes soft-deleted events whose grace period has expired.
 * Complements the soft-delete feature (P2-4) by cleaning up after purgeAfter date.
 * 
 * Also cleans up associated data: photos, videos, guestbook entries, etc.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { storageService } from './storage';

const PURGE_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

async function purgeExpiredEvents(): Promise<void> {
  try {
    const now = new Date();

    // Find events past their grace period
    const expired = await prisma.event.findMany({
      where: {
        deletedAt: { not: null },
        purgeAfter: { not: null, lt: now },
      },
      select: { id: true, title: true, purgeAfter: true },
    });

    if (expired.length === 0) return;

    logger.info(`[EventPurge] Found ${expired.length} events to purge`);

    for (const event of expired) {
      try {
        // Delete photos and their storage files
        const photos = await prisma.photo.findMany({
          where: { eventId: event.id },
          select: { id: true, storagePath: true, storagePathOriginal: true, storagePathThumb: true, storagePathWebp: true },
        });

        // Best-effort storage cleanup (don't fail purge if storage delete fails)
        for (const photo of photos) {
          const paths = [photo.storagePath, photo.storagePathOriginal, photo.storagePathThumb, photo.storagePathWebp].filter(Boolean) as string[];
          for (const p of paths) {
            try { await storageService.deleteFile(p); } catch { /* ignore */ }
          }
        }

        // Delete videos storage
        const videos = await prisma.video.findMany({
          where: { eventId: event.id },
          select: { storagePath: true },
        });
        for (const v of videos) {
          if (v.storagePath) {
            try { await storageService.deleteFile(v.storagePath); } catch { /* ignore */ }
          }
        }

        // Cascade delete the event (Prisma relations handle most child records)
        await prisma.event.delete({
          where: { id: event.id },
        });

        logger.info(`[EventPurge] Purged event: ${event.title} (${event.id})`);
      } catch (error: any) {
        logger.error(`[EventPurge] Failed to purge event ${event.id}`, { error: error.message });
      }
    }

    logger.info(`[EventPurge] Completed purge cycle: ${expired.length} events processed`);
  } catch (error: any) {
    logger.warn('[EventPurge] Worker cycle failed', { error: error.message });
  }
}

// Start the periodic worker
export function startEventPurgeWorker(): void {
  logger.info('[EventPurge] Worker started (interval: 1h)');
  setInterval(purgeExpiredEvents, PURGE_INTERVAL_MS);
  // Run once on startup after a short delay
  setTimeout(purgeExpiredEvents, 30_000);
}
