/**
 * AI Job Queue Worker
 * 
 * Processes QUEUED AiJobs by submitting them to RunPod serverless,
 * polls for results, saves output to storage, and notifies guests.
 * 
 * Runs on a configurable interval (default: 30s).
 * Gracefully handles offline scenarios — jobs stay QUEUED until RunPod is reachable.
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { runpodService } from './runpodService';

const WORKER_INTERVAL_MS = 30_000; // 30 seconds
const MAX_CONCURRENT_JOBS = 3;
let workerRunning = false;

/**
 * Generate a unique short code for /r/:shortCode delivery
 */
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Process a single queued job
 */
async function processJob(jobId: string): Promise<void> {
  const job = await (prisma as any).aiJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'QUEUED') return;

  // Assign a shortCode if not yet set
  const shortCode = job.shortCode || generateShortCode();

  try {
    // Mark as PROCESSING
    await (prisma as any).aiJob.update({
      where: { id: jobId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        shortCode,
      },
    });

    // Build ComfyUI workflow input
    const workflowJson = job.workflowJson as Record<string, any> | null;
    const parameters = job.parameters as Record<string, any> | null;
    const inputImages = (job.inputImages as string[]) || [];

    if (!workflowJson) {
      // No workflow JSON — need to look up from a workflow registry
      // For now, mark as failed with a clear message
      await (prisma as any).aiJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: `No workflowJson provided and workflow registry not yet implemented for: ${job.workflow}`,
          completedAt: new Date(),
        },
      });
      return;
    }

    // Submit to RunPod
    const submitted = await runpodService.submitJob({
      workflow: workflowJson,
      images: inputImages.reduce((acc: Record<string, string>, path: string, i: number) => {
        acc[`input_${i}`] = path;
        return acc;
      }, {}),
    });

    if (!submitted) {
      // RunPod unreachable — put back in queue for retry
      const newRetry = job.retryCount + 1;
      if (newRetry > job.maxRetries) {
        await (prisma as any).aiJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            error: 'RunPod unreachable after max retries',
            retryCount: newRetry,
            completedAt: new Date(),
          },
        });
      } else {
        await (prisma as any).aiJob.update({
          where: { id: jobId },
          data: {
            status: 'QUEUED',
            retryCount: newRetry,
            startedAt: null,
          },
        });
      }
      return;
    }

    // Save RunPod job ID
    await (prisma as any).aiJob.update({
      where: { id: jobId },
      data: { runpodJobId: submitted.jobId },
    });

    // Poll for result (non-blocking for the worker — each job polls independently)
    const result = await runpodService.submitAndWait(
      { workflow: workflowJson },
      300_000 // 5 min timeout
    );

    if (!result || result.status === 'TIMED_OUT') {
      await (prisma as any).aiJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: 'RunPod job timed out',
          completedAt: new Date(),
        },
      });
      return;
    }

    if (result.status === 'FAILED') {
      await (prisma as any).aiJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          error: result.error || 'RunPod job failed',
          completedAt: new Date(),
          computeTimeMs: result.executionTime ? Math.round(result.executionTime * 1000) : null,
        },
      });
      return;
    }

    if (result.status === 'COMPLETED') {
      // TODO: Download result from RunPod output, save to SeaweedFS, generate resultUrl
      const outputUrl = result.output?.image_url || result.output?.url || null;

      await (prisma as any).aiJob.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          resultUrl: outputUrl,
          completedAt: new Date(),
          computeTimeMs: result.executionTime ? Math.round(result.executionTime * 1000) : null,
        },
      });

      logger.info('AI job completed', { jobId, workflow: job.workflow, shortCode });

      // TODO: Send notification (push + email) to guest
      // if (job.guestEmail) { ... }
    }
  } catch (err: any) {
    logger.error('AI job processing error', { jobId, error: err.message });
    await (prisma as any).aiJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        error: `Worker error: ${err.message}`.slice(0, 2000),
        completedAt: new Date(),
      },
    }).catch(() => {});
  }
}

/**
 * Main worker tick — find and process queued jobs
 */
async function tick(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  try {
    // Skip if RunPod is not configured
    if (!runpodService.isConfigured()) return;

    // Find queued jobs, ordered by priority (desc) then creation time (asc)
    const jobs = await (prisma as any).aiJob.findMany({
      where: { status: 'QUEUED' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: MAX_CONCURRENT_JOBS,
      select: { id: true },
    });

    if (jobs.length === 0) return;

    logger.info(`AI job worker: processing ${jobs.length} queued jobs`);

    // Process jobs sequentially to avoid overwhelming RunPod
    for (const job of jobs) {
      await processJob(job.id);
    }
  } catch (err: any) {
    logger.error('AI job worker tick error', { error: err.message });
  } finally {
    workerRunning = false;
  }
}

/**
 * Start the AI job queue worker
 */
export function startAiJobWorker(): void {
  if (!runpodService.isConfigured()) {
    logger.info('AI job worker: RunPod not configured, worker disabled');
    return;
  }

  logger.info(`AI job worker started (interval: ${WORKER_INTERVAL_MS / 1000}s)`);
  setInterval(tick, WORKER_INTERVAL_MS);

  // Run immediately on startup
  setTimeout(tick, 5000);
}
