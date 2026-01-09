import prisma from '../config/database';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 500;

const DEFAULT_RETENTION_DAYS = 30;

function getIntervalMs(): number {
  const raw = process.env.WOO_LOG_RETENTION_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.WOO_LOG_RETENTION_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

function getRetentionDays(): number {
  const raw = String(process.env.WOO_LOG_RETENTION_DAYS || '').trim();
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.floor(n);
}

function isEnabled(): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) return process.env.WOO_LOG_RETENTION_ENABLED === 'true';
  return process.env.WOO_LOG_RETENTION_ENABLED !== 'false';
}

function cutoffDays(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function deleteOldestBatch(cutoff: Date, batchSize: number): Promise<number> {
  const rows = (await (prisma as any).wooWebhookEventLog.findMany({
    where: {
      createdAt: { lt: cutoff },
    },
    select: { id: true },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  })) as Array<{ id: string }>;

  if (!rows.length) return 0;

  const ids = rows.map((r) => r.id);
  const res = await (prisma as any).wooWebhookEventLog.deleteMany({
    where: { id: { in: ids } },
  });
  return typeof res?.count === 'number' ? res.count : ids.length;
}

async function retentionOnce(): Promise<void> {
  const now = new Date();
  const batchSize = getBatchSize();
  const retentionDays = getRetentionDays();
  const cutoff = cutoffDays(now, retentionDays);

  let deleted = 0;
  for (let i = 0; i < 10; i++) {
    const n = await deleteOldestBatch(cutoff, batchSize);
    deleted += n;
    if (n === 0) break;
  }

  if (deleted > 0) {
    logger.info('Woo log retention: deleted old rows', {
      deleted,
      retentionDays,
      batchSize,
    });
  }
}

let timer: NodeJS.Timeout | null = null;

export function startWooLogRetentionWorker(): void {
  if (!isEnabled()) {
    logger.info('Woo log retention worker disabled');
    return;
  }

  if (timer) return;

  const intervalMs = getIntervalMs();
  const batchSize = getBatchSize();
  const retentionDays = getRetentionDays();

  logger.info('Woo log retention worker starting', {
    intervalMs,
    batchSize,
    retentionDays,
  });

  retentionOnce().catch((err) => {
    logger.error('Woo log retention worker initial run failed', {
      message: (err as any)?.message || String(err),
    });
  });

  timer = setInterval(() => {
    retentionOnce().catch((err) => {
      logger.error('Woo log retention worker run failed', {
        message: (err as any)?.message || String(err),
      });
    });
  }, intervalMs);

  timer.unref?.();
}

export function stopWooLogRetentionWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
