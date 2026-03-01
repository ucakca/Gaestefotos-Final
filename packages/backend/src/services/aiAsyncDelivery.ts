/**
 * AI Async Delivery Service
 * 
 * Instead of making guests wait 30-120s for AI results, this service:
 * 1. Creates a job record with a short code
 * 2. Returns the short code immediately (for QR generation)
 * 3. Processes the AI task in the background
 * 4. Pushes the result via WebSocket when ready
 * 5. Guest can also poll via the short code URL
 */

import { logger } from '../utils/logger';
import prisma from '../config/database';

export interface AiJobCreateInput {
  eventId: string;
  photoId?: string;
  userId?: string;
  deviceId?: string;
  feature: string;
  inputData?: Record<string, any>;
}

export interface AiJobResult {
  id: string;
  shortCode: string;
  status: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED';
  feature: string;
  resultUrl?: string | null;
  error?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateShortCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateShortCode();
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT 1 FROM ai_jobs WHERE "shortCode" = $1 LIMIT 1`, code,
    );
    if (existing.length === 0) return code;
  }
  return generateShortCode(8);
}

export async function createAiJob(input: AiJobCreateInput): Promise<AiJobResult> {
  const shortCode = await generateUniqueShortCode();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `INSERT INTO ai_jobs (id, "eventId", "photoId", workflow, parameters, "shortCode", status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4::jsonb, $5, 'QUEUED', NOW(), NOW())
     RETURNING id, "shortCode", status, workflow, "createdAt"`,
    input.eventId, input.photoId || null,
    input.feature, JSON.stringify(input.inputData || {}), shortCode,
  );
  const row = rows[0];
  logger.info('[AiAsync] Job created', { id: row.id, shortCode, feature: input.feature });
  return { id: row.id, shortCode: row.shortCode, status: 'QUEUED', feature: row.workflow, createdAt: row.createdAt };
}

export async function getAiJobByShortCode(shortCode: string): Promise<AiJobResult | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, "shortCode", status, workflow, "resultUrl", error, "createdAt", "startedAt", "completedAt"
     FROM ai_jobs WHERE "shortCode" = $1 LIMIT 1`,
    shortCode.toUpperCase(),
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function getAiJobById(jobId: string): Promise<AiJobResult | null> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, "shortCode", status, workflow, "resultUrl", error, "createdAt", "startedAt", "completedAt"
     FROM ai_jobs WHERE id = $1 LIMIT 1`, jobId,
  );
  if (rows.length === 0) return null;
  return mapRow(rows[0]);
}

export async function getAiJobsForDevice(eventId: string, deviceId: string): Promise<AiJobResult[]> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, "shortCode", status, workflow, "resultUrl", error, "createdAt", "startedAt", "completedAt"
     FROM ai_jobs WHERE "eventId" = $1
     ORDER BY "createdAt" DESC LIMIT 20`,
    eventId,
  );
  return rows.map(mapRow);
}

export async function markJobProcessing(jobId: string): Promise<void> {
  await prisma.$executeRawUnsafe(`UPDATE ai_jobs SET status = 'PROCESSING', "startedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`, jobId);
}

export async function markJobCompleted(jobId: string, resultUrl: string, resultStoragePath?: string): Promise<AiJobResult> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `UPDATE ai_jobs SET status = 'DONE', "resultUrl" = $2, "completedAt" = NOW(), "updatedAt" = NOW()
     WHERE id = $1
     RETURNING id, "shortCode", status, workflow, "resultUrl", error, "createdAt", "startedAt", "completedAt"`,
    jobId, resultUrl,
  );
  if (rows.length === 0) throw new Error(`Job ${jobId} not found`);
  logger.info('[AiAsync] Job completed', { jobId, shortCode: rows[0].shortCode });
  return mapRow(rows[0]);
}

export async function markJobFailed(jobId: string, error: string): Promise<void> {
  await prisma.$executeRawUnsafe(
    `UPDATE ai_jobs SET status = 'FAILED', error = $2, "completedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`,
    jobId, error.slice(0, 1000),
  );
  logger.warn('[AiAsync] Job failed', { jobId, error: error.slice(0, 200) });
}

export async function cleanupExpiredJobs(): Promise<number> {
  const result = await prisma.$executeRawUnsafe(`DELETE FROM ai_jobs WHERE "completedAt" < NOW() - INTERVAL '7 days'`);
  if (typeof result === 'number' && result > 0) logger.info('[AiAsync] Cleaned expired jobs', { count: result });
  return typeof result === 'number' ? result : 0;
}

export async function executeAsync(
  input: AiJobCreateInput,
  processor: (jobId: string, inputData: Record<string, any>) => Promise<{ resultUrl: string; storagePath?: string }>,
  io?: any,
): Promise<AiJobResult> {
  const job = await createAiJob(input);

  (async () => {
    try {
      await markJobProcessing(job.id);
      const result = await processor(job.id, input.inputData || {});
      await markJobCompleted(job.id, result.resultUrl, result.storagePath);
      if (io && input.eventId) {
        io.to(`event:${input.eventId}`).emit('ai_job_completed', {
          jobId: job.id, shortCode: job.shortCode, feature: job.feature, resultUrl: result.resultUrl, deviceId: input.deviceId,
        });
      }
    } catch (err: any) {
      await markJobFailed(job.id, err.message).catch(() => {});
      if (io && input.eventId) {
        io.to(`event:${input.eventId}`).emit('ai_job_failed', {
          jobId: job.id, shortCode: job.shortCode, feature: job.feature, error: err.message?.slice(0, 200), deviceId: input.deviceId,
        });
      }
    }
  })();

  return job;
}

function mapRow(row: any): AiJobResult {
  return {
    id: row.id, shortCode: row.shortCode, status: row.status, feature: row.workflow,
    resultUrl: row.resultUrl, error: row.error, createdAt: row.createdAt,
    startedAt: row.startedAt, completedAt: row.completedAt,
  };
}
