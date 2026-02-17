/**
 * BullMQ Job Worker Processors
 * 
 * Registers worker functions for each queue.
 * Called once during server startup.
 */

import { Job } from 'bullmq';
import {
  registerWorker,
  QUEUE_NAMES,
  type FaceDetectionJobData,
  type DuplicateDetectionJobData,
  type CleanupJobData,
} from './jobQueue';
import { logger } from '../utils/logger';

/**
 * Register all job workers.
 * Call this once during server startup after Redis is connected.
 */
export function registerAllWorkers(): void {
  // Face Detection Worker
  registerWorker(QUEUE_NAMES.FACE_DETECTION, async (job: Job<FaceDetectionJobData>) => {
    const { photoId, eventId, storagePath } = job.data;
    logger.debug(`[Worker:FaceDetection] Processing photo ${photoId}`);

    // Lazy-import to avoid circular dependencies
    const { getFaceDetectionMetadata } = await import('./faceRecognition');
    const { storeFaceEmbedding } = await import('./faceSearchPgvector');
    const prisma = (await import('../config/database')).default;
    const { storageService } = await import('./storage');

    // Download the photo from storage
    const buffer = await storageService.getFileBuffer(storagePath);
    if (!buffer) {
      throw new Error(`Photo file not found: ${storagePath}`);
    }

    const faceResult = await getFaceDetectionMetadata(buffer);
    if (faceResult.faceCount > 0) {
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          faceCount: faceResult.faceCount,
          faceData: {
            faces: faceResult.faces,
            descriptors: faceResult.descriptors || [],
          },
        },
      });

      // Store embeddings in pgvector
      const descriptors = faceResult.descriptors || [];
      for (let i = 0; i < descriptors.length; i++) {
        await storeFaceEmbedding({
          photoId,
          eventId,
          descriptor: descriptors[i],
          faceIndex: i,
          box: faceResult.faces[i],
        });
      }

      logger.info(`[Worker:FaceDetection] Found ${faceResult.faceCount} faces in photo ${photoId}`);
    }

    return { faceCount: faceResult.faceCount };
  }, { concurrency: 2 });

  // Duplicate Detection Worker
  registerWorker(QUEUE_NAMES.DUPLICATE_DETECTION, async (job: Job<DuplicateDetectionJobData>) => {
    const { photoId, eventId } = job.data;
    logger.debug(`[Worker:DuplicateDetection] Checking photo ${photoId}`);

    const { processDuplicateDetection } = await import('./duplicateDetection');
    await processDuplicateDetection(photoId, eventId);

    return { checked: true };
  }, { concurrency: 2 });

  // Cleanup Worker
  registerWorker(QUEUE_NAMES.CLEANUP, async (job: Job<CleanupJobData>) => {
    const { type } = job.data;
    logger.info(`[Worker:Cleanup] Running ${type} cleanup`);

    switch (type) {
      case 'zombie-uploads': {
        const { cleanupZombieUploads } = await import('./zombieUploadCleanup');
        if (typeof cleanupZombieUploads === 'function') {
          await cleanupZombieUploads();
        }
        break;
      }
      case 'expired-events': {
        // Event purge worker handles this separately via setInterval
        break;
      }
    }

    return { type, completed: true };
  }, { concurrency: 1 });

  logger.info('[JobWorkers] All workers registered');
}
