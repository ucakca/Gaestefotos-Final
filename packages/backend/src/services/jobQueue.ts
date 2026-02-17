/**
 * BullMQ Job Queue Infrastructure
 * 
 * Centralizes async background jobs that were previously fire-and-forget promises:
 * - Face detection after photo upload
 * - Duplicate detection
 * - Image optimization (WebP generation)
 * - Email notifications
 * 
 * Uses the existing Redis connection for queue storage.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { logger } from '../utils/logger';

// ─── Redis Connection ─────────────────────────────────────────────────────────

function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  };
}

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  PHOTO_PROCESSING: 'photo-processing',
  FACE_DETECTION: 'face-detection',
  DUPLICATE_DETECTION: 'duplicate-detection',
  EMAIL: 'email',
  CLEANUP: 'cleanup',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Job Data Interfaces ──────────────────────────────────────────────────────

export interface PhotoProcessingJobData {
  photoId: string;
  eventId: string;
  storagePath: string;
  generateWebP?: boolean;
}

export interface FaceDetectionJobData {
  photoId: string;
  eventId: string;
  storagePath: string;
}

export interface DuplicateDetectionJobData {
  photoId: string;
  eventId: string;
  storagePath: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface CleanupJobData {
  type: 'zombie-uploads' | 'expired-events' | 'orphaned-files';
  batchSize?: number;
}

// ─── Queue Registry ───────────────────────────────────────────────────────────

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

/**
 * Get or create a queue by name.
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    queues.set(name, queue);
    logger.info(`[JobQueue] Queue "${name}" created`);
  }
  return queues.get(name)!;
}

// ─── Job Enqueue Helpers ──────────────────────────────────────────────────────

export async function enqueuePhotoProcessing(data: PhotoProcessingJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.PHOTO_PROCESSING);
  return queue.add('process', data, {
    priority: 1,
    jobId: `photo-${data.photoId}`,
  });
}

export async function enqueueFaceDetection(data: FaceDetectionJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.FACE_DETECTION);
  return queue.add('detect', data, {
    priority: 2,
    delay: 1000, // Slight delay to let photo processing finish first
    jobId: `face-${data.photoId}`,
  });
}

export async function enqueueDuplicateDetection(data: DuplicateDetectionJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.DUPLICATE_DETECTION);
  return queue.add('check', data, {
    priority: 3,
    delay: 2000,
    jobId: `dup-${data.photoId}`,
  });
}

export async function enqueueEmail(data: EmailJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  return queue.add('send', data, {
    priority: 2,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function enqueueCleanup(data: CleanupJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.CLEANUP);
  return queue.add(data.type, data, {
    priority: 5,
  });
}

// ─── Worker Registration ──────────────────────────────────────────────────────

type ProcessorFn = (job: Job) => Promise<any>;

/**
 * Register a worker for a specific queue.
 * Only call this in the main server process, not in tests.
 */
export function registerWorker(
  name: QueueName,
  processor: ProcessorFn,
  opts?: { concurrency?: number }
): Worker {
  if (workers.has(name)) {
    logger.warn(`[JobQueue] Worker "${name}" already registered, skipping`);
    return workers.get(name)!;
  }

  const worker = new Worker(name, processor, {
    connection: getRedisConnection(),
    concurrency: opts?.concurrency ?? 2,
  });

  worker.on('completed', (job) => {
    logger.debug(`[JobQueue] Job ${job.id} completed in ${name}`);
  });

  worker.on('failed', (job, error) => {
    logger.error(`[JobQueue] Job ${job?.id} failed in ${name}`, {
      error: error.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (error) => {
    logger.error(`[JobQueue] Worker error in ${name}`, { error: error.message });
  });

  workers.set(name, worker);
  logger.info(`[JobQueue] Worker "${name}" registered (concurrency: ${opts?.concurrency ?? 2})`);
  return worker;
}

// ─── Queue Stats ──────────────────────────────────────────────────────────────

export async function getQueueStats(): Promise<Record<string, {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}>> {
  const stats: Record<string, any> = {};

  for (const [name, queue] of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    stats[name] = { waiting, active, completed, failed, delayed };
  }

  return stats;
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

export async function shutdownQueues(): Promise<void> {
  logger.info('[JobQueue] Shutting down queues...');

  // Close workers first
  for (const [name, worker] of workers) {
    try {
      await worker.close();
      logger.debug(`[JobQueue] Worker "${name}" closed`);
    } catch (err) {
      logger.error(`[JobQueue] Error closing worker "${name}"`, { error: (err as Error).message });
    }
  }

  // Then close queues
  for (const [name, queue] of queues) {
    try {
      await queue.close();
      logger.debug(`[JobQueue] Queue "${name}" closed`);
    } catch (err) {
      logger.error(`[JobQueue] Error closing queue "${name}"`, { error: (err as Error).message });
    }
  }

  workers.clear();
  queues.clear();
  logger.info('[JobQueue] All queues shut down');
}
