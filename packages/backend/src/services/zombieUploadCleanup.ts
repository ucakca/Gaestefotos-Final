/**
 * Zombie Upload Cleanup
 * 
 * Cleans up orphaned TUS uploads that were never completed or claimed.
 * Called by the BullMQ cleanup worker.
 */

import prisma from '../config/database';
import { storageService } from './storage';
import { logger } from '../utils/logger';

const ZOMBIE_AGE_HOURS = parseInt(process.env.ZOMBIE_UPLOAD_AGE_HOURS || '24', 10);

/**
 * Find and remove uploads that are older than ZOMBIE_AGE_HOURS
 * and were never associated with a photo record.
 */
export async function cleanupZombieUploads(): Promise<{ removed: number }> {
  const cutoff = new Date(Date.now() - ZOMBIE_AGE_HOURS * 60 * 60 * 1000);
  let removed = 0;

  try {
    // Clean up orphaned guestbook photo uploads
    const orphanedPhotos = await (prisma as any).guestbookPhotoUpload.findMany({
      where: {
        claimedAt: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, storagePath: true },
    });

    for (const upload of orphanedPhotos) {
      try {
        if (upload.storagePath) {
          await storageService.deleteFile(upload.storagePath);
        }
        await (prisma as any).guestbookPhotoUpload.delete({ where: { id: upload.id } });
        removed++;
      } catch (err) {
        logger.warn('[ZombieCleanup] Failed to clean guestbook photo upload', { id: upload.id, error: (err as Error).message });
      }
    }

    // Clean up orphaned guestbook audio uploads
    const orphanedAudios = await (prisma as any).guestbookAudioUpload.findMany({
      where: {
        claimedAt: null,
        createdAt: { lt: cutoff },
      },
      select: { id: true, storagePath: true },
    });

    for (const upload of orphanedAudios) {
      try {
        if (upload.storagePath) {
          await storageService.deleteFile(upload.storagePath);
        }
        await (prisma as any).guestbookAudioUpload.delete({ where: { id: upload.id } });
        removed++;
      } catch (err) {
        logger.warn('[ZombieCleanup] Failed to clean guestbook audio upload', { id: upload.id, error: (err as Error).message });
      }
    }

    logger.info(`[ZombieCleanup] Removed ${removed} orphaned uploads (cutoff: ${cutoff.toISOString()})`);
  } catch (error) {
    logger.error('[ZombieCleanup] Error during cleanup', { error: (error as Error).message });
  }

  return { removed };
}
