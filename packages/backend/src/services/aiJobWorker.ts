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
import { StorageService } from './storage';
import { sendPushToEvent, pushTemplates } from './pushNotification';
import { emailService } from './email';

const storageService = new StorageService();
const APP_BASE_URL = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'https://gästefotos.com';

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
      images: inputImages.map((path: string, i: number) => ({
        name: `input_${i}.png`,
        image: path.startsWith('data:') ? path : `data:image/png;base64,${path}`,
      })),
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

    // Poll the already-submitted job for result
    const result = await runpodService.pollForResult(submitted.jobId, 300_000);

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
      // ── 1. Extract output image from RunPod result ──
      const { buffer: resultBuffer, externalUrl } = await runpodService.extractOutputBuffer(result.output);

      // ── 2. Save to SeaweedFS if we have a buffer ──
      let storagePath: string | null = null;
      let publicUrl: string | null = externalUrl;

      if (resultBuffer && resultBuffer.length > 0) {
        try {
          storagePath = await storageService.uploadFile(
            job.eventId,
            `ai-job-${shortCode}.png`,
            resultBuffer,
            'image/png',
          );
          publicUrl = `/api/media/${storagePath}`;
          logger.info('AI job result saved to storage', { jobId, storagePath, size: resultBuffer.length });
        } catch (storageErr: any) {
          logger.warn('AI job storage upload failed, using external URL', { jobId, error: storageErr.message });
        }
      }

      // ── 3. Update job as DONE ──
      await (prisma as any).aiJob.update({
        where: { id: jobId },
        data: {
          status: 'DONE',
          result: storagePath,
          resultUrl: publicUrl,
          completedAt: new Date(),
          computeTimeMs: result.executionTime ? Math.round(result.executionTime * 1000) : null,
        },
      });

      logger.info('AI job completed', { jobId, workflow: job.workflow, shortCode });

      // ── 4. Notify guest (push + email, non-blocking) ──
      notifyGuest(job, shortCode).catch((err) =>
        logger.warn('AI job guest notification failed', { jobId, error: err.message })
      );
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
 * Notify the guest that their AI result is ready (push + email)
 */
async function notifyGuest(job: any, shortCode: string): Promise<void> {
  const resultPageUrl = `${APP_BASE_URL}/r/${shortCode}`;

  // Push notification to all subscribers of this event
  await sendPushToEvent(job.eventId, pushTemplates.aiJobComplete(job.guestName, job.workflow, shortCode));

  // Email notification if guest provided an email AND has DSGVO opt-in
  const guestRecord = job.guestEmail
    ? await prisma.guest.findFirst({ where: { eventId: job.eventId, email: job.guestEmail }, select: { id: true, emailOptIn: true } })
    : null;
  if (job.guestEmail && guestRecord?.emailOptIn) {
    try {
      await emailService.sendCustomEmail({
        to: job.guestEmail,
        subject: '✨ Dein KI-Ergebnis ist fertig!',
        text: `Hallo ${job.guestName || 'Gast'},\n\ndein ${job.workflow}-Ergebnis ist fertig!\n\nHier anschauen & herunterladen:\n${resultPageUrl}\n\nViel Spaß!\nDein Gästefotos-Team`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h2 style="color: #7c3aed; margin-bottom: 8px;">✨ Dein KI-Ergebnis ist fertig!</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Hallo ${job.guestName || 'Gast'},<br><br>
              dein <strong>${job.workflow}</strong>-Ergebnis ist bereit!
            </p>
            <a href="${resultPageUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
              Ergebnis anschauen →
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
              Oder kopiere diesen Link: ${resultPageUrl}
            </p>
            <p style="color: #9ca3af; font-size: 11px; margin-top: 16px; text-align: center;">
              <a href="${APP_BASE_URL}/api/events/${job.eventId}/guests/email-optin?email=${encodeURIComponent(job.guestEmail)}&unsubscribe=1" style="color: #9ca3af; text-decoration: underline;">Abmelden</a>
            </p>
          </div>
        `,
      });

      // Mark as notified
      await (prisma as any).aiJob.update({
        where: { id: job.id },
        data: { notified: true, notifiedAt: new Date() },
      });

      logger.info('AI job guest notified via email', { jobId: job.id, email: job.guestEmail });
    } catch (emailErr: any) {
      logger.warn('AI job email notification failed', { jobId: job.id, error: emailErr.message });
    }
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
