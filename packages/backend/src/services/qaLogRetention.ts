import prisma from '../config/database';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 500;

const DEBUG_RETENTION_DAYS = 7;
const DEFAULT_IMPORTANT_RETENTION_DAYS = 90;

function getIntervalMs(): number {
  const raw = process.env.QA_LOG_RETENTION_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.QA_LOG_RETENTION_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

function getImportantRetentionDays(): number {
  const raw = String(process.env.QA_LOG_RETENTION_IMPORTANT_DAYS || '').trim();
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_IMPORTANT_RETENTION_DAYS;
  if (n === 30 || n === 90) return n;
  return DEFAULT_IMPORTANT_RETENTION_DAYS;
}

function isEnabled(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return process.env.QA_LOG_RETENTION_ENABLED === 'true';
  return process.env.QA_LOG_RETENTION_ENABLED !== 'false';
}

function cutoffDays(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function deleteOldestBatch(level: 'DEBUG' | 'IMPORTANT', cutoff: Date, batchSize: number): Promise<number> {
  const rows = (await (prisma as any).qaLogEvent.findMany({
    where: {
      level,
      createdAt: { lt: cutoff },
    },
    select: { id: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  })) as Array<{ id: string }>;

  if (!rows.length) return 0;

  const ids = rows.map((r) => r.id);
  const res = await (prisma as any).qaLogEvent.deleteMany({
    where: { id: { in: ids } },
  });
  return typeof res?.count === 'number' ? res.count : ids.length;
}

async function retentionOnce(): Promise<void> {
  const now = new Date();
  const batchSize = getBatchSize();

  const debugCutoff = cutoffDays(now, DEBUG_RETENTION_DAYS);
  const importantDays = getImportantRetentionDays();
  const importantCutoff = cutoffDays(now, importantDays);

  let deletedDebug = 0;
  let deletedImportant = 0;

  for (let i = 0; i < 10; i++) {
    const n = await deleteOldestBatch('DEBUG', debugCutoff, batchSize);
    deletedDebug += n;
    if (n === 0) break;
  }

  for (let i = 0; i < 10; i++) {
    const n = await deleteOldestBatch('IMPORTANT', importantCutoff, batchSize);
    deletedImportant += n;
    if (n === 0) break;
  }

  if (deletedDebug > 0 || deletedImportant > 0) {
    logger.info('QA log retention: deleted old rows', {
      deletedDebug,
      deletedImportant,
      debugRetentionDays: DEBUG_RETENTION_DAYS,
      importantRetentionDays: importantDays,
      batchSize,
    });
  }
}

let timer: NodeJS.Timeout | null = null;

export function startQaLogRetentionWorker(): void {
  if (!isEnabled()) {
    logger.info('QA log retention worker disabled');
    return;
  }

  if (timer) return;

  const intervalMs = getIntervalMs();
  const batchSize = getBatchSize();
  const importantRetentionDays = getImportantRetentionDays();

  logger.info('QA log retention worker starting', {
    intervalMs,
    batchSize,
    debugRetentionDays: DEBUG_RETENTION_DAYS,
    importantRetentionDays,
  });

  retentionOnce().catch((err) => {
    logger.error('QA log retention worker initial run failed', {
      message: (err as any)?.message || String(err),
    });
  });

  timer = setInterval(() => {
    retentionOnce().catch((err) => {
      logger.error('QA log retention worker run failed', {
        message: (err as any)?.message || String(err),
      });
    });
  }, intervalMs);

  timer.unref?.();
}

export function stopQaLogRetentionWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
