import prisma from '../config/database';
import { logger } from '../utils/logger';

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_REVOKED_GRACE_DAYS = 7;

function isEnabled(): boolean {
  if (process.env.FACE_SEARCH_DB_CONSENT_ENABLED !== 'true') return false;
  return process.env.FACE_SEARCH_CONSENT_RETENTION_ENABLED === 'true';
}

function getIntervalMs(): number {
  const raw = process.env.FACE_SEARCH_CONSENT_RETENTION_INTERVAL_MS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_INTERVAL_MS;
  return Math.floor(n);
}

function getBatchSize(): number {
  const raw = process.env.FACE_SEARCH_CONSENT_RETENTION_BATCH_SIZE;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_BATCH_SIZE;
  return Math.floor(n);
}

function getRevokedGraceDays(): number {
  const raw = process.env.FACE_SEARCH_CONSENT_REVOKED_GRACE_DAYS;
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n < 0) return DEFAULT_REVOKED_GRACE_DAYS;
  return Math.floor(n);
}

async function retentionOnce(): Promise<void> {
  const now = new Date();
  const batchSize = getBatchSize();
  const revokedGraceDays = getRevokedGraceDays();
  const revokedCutoff = new Date(now.getTime() - revokedGraceDays * 24 * 60 * 60 * 1000);

  // Delete expired consents
  const expired = await (prisma as any).faceSearchConsent.findMany({
    where: {
      expiresAt: { lte: now },
    },
    select: { id: true, eventId: true },
    take: batchSize,
    orderBy: { expiresAt: 'asc' },
  });

  if (expired.length > 0) {
    await (prisma as any).faceSearchConsent.deleteMany({
      where: { id: { in: expired.map((c: any) => c.id) } },
    });
    logger.info('Face search consent retention: deleted expired consents', { count: expired.length });
  }

  // Delete revoked consents after grace period
  const revoked = await (prisma as any).faceSearchConsent.findMany({
    where: {
      revokedAt: { not: null, lte: revokedCutoff },
    },
    select: { id: true, eventId: true },
    take: batchSize,
    orderBy: { revokedAt: 'asc' },
  });

  if (revoked.length > 0) {
    await (prisma as any).faceSearchConsent.deleteMany({
      where: { id: { in: revoked.map((c: any) => c.id) } },
    });
    logger.info('Face search consent retention: deleted revoked consents after grace period', {
      count: revoked.length,
      revokedGraceDays,
    });
  }
}

let timer: NodeJS.Timeout | null = null;

export function startFaceSearchConsentRetentionWorker(): void {
  if (!isEnabled()) {
    logger.info('Face search consent retention worker disabled');
    return;
  }

  const intervalMs = getIntervalMs();
  logger.info('Face search consent retention worker starting', {
    intervalMs,
    batchSize: getBatchSize(),
    revokedGraceDays: getRevokedGraceDays(),
  });

  retentionOnce().catch((err) => {
    logger.error('Face search consent retention worker initial run failed', {
      message: (err as any)?.message || String(err),
    });
  });

  timer = setInterval(() => {
    retentionOnce().catch((err) => {
      logger.error('Face search consent retention worker run failed', {
        message: (err as any)?.message || String(err),
      });
    });
  }, intervalMs);
  timer.unref?.();
}

export function stopFaceSearchConsentRetentionWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
