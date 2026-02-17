import prisma from '../config/database';
import { tierToDefaultDurationDays, DEFAULT_FREE_STORAGE_DAYS } from './storagePolicy';
import { getRedis } from './cache/redis';
import { logger } from '../utils/logger';

function toBigInt(v: any): bigint {
  if (v === null || v === undefined) return 0n;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(v);
  if (typeof v === 'string' && v.trim() !== '') return BigInt(v);
  return 0n;
}

export function bigintToString(v: bigint | null | undefined): string | null {
  if (v === null || v === undefined) return null;
  return v.toString();
}

export async function getEffectiveEventPackage(eventId: string): Promise<{
  isFree: boolean;
  entitlement: any | null;
  packageDefinition: {
    sku: string | null;
    name: string | null;
    resultingTier: string;
    storageLimitBytes: string | null;
    storageDurationDays: number;
  };
}> {
  const entitlement = await getActiveEventEntitlement(eventId);

  const pkg = entitlement?.wcSku
    ? await prisma.packageDefinition.findFirst({
        where: { sku: entitlement.wcSku, isActive: true },
        select: {
          sku: true,
          name: true,
          resultingTier: true,
          storageLimitBytes: true,
          storageDurationDays: true,
        },
      })
    : null;

  const resultingTier = pkg?.resultingTier || 'FREE';
  const storageDurationDays =
    typeof pkg?.storageDurationDays === 'number' && pkg.storageDurationDays > 0
      ? pkg.storageDurationDays
      : tierToDefaultDurationDays(resultingTier);

  const limitFromEntitlement = toBigInt((entitlement as any)?.storageLimitBytes);
  const limitFromPkg = toBigInt((pkg as any)?.storageLimitBytes);
  const effectiveLimit = limitFromEntitlement > 0n ? limitFromEntitlement : limitFromPkg;

  return {
    isFree: !entitlement,
    entitlement: entitlement
      ? {
          ...entitlement,
          storageLimitBytes: bigintToString((entitlement as any).storageLimitBytes as any),
        }
      : null,
    packageDefinition: {
      sku: pkg?.sku || null,
      name: pkg?.name || null,
      resultingTier,
      storageLimitBytes: effectiveLimit > 0n ? effectiveLimit.toString() : null,
      storageDurationDays: storageDurationDays || DEFAULT_FREE_STORAGE_DAYS,
    },
  };
}

export async function getActiveEventEntitlement(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { host: { select: { wordpressUserId: true } } },
  });

  const ownerWpUserId = event?.host?.wordpressUserId ?? null;

  // Per-customer isolation: if the host is linked to a WP user, only accept entitlements for that wpUserId.
  if (ownerWpUserId) {
    return prisma.eventEntitlement.findFirst({
      where: {
        eventId,
        wpUserId: ownerWpUserId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Backward-compatible fallback for legacy events without wordpressUserId mapping.
  return prisma.eventEntitlement.findFirst({
    where: {
      eventId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getEventUsageBytes(eventId: string): Promise<bigint> {
  const now = new Date();
  const [photoAgg, videoAgg, guestbookAgg, guestbookPendingAgg, event] = await Promise.all([
    prisma.photo.aggregate({
      where: {
        eventId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.video.aggregate({
      where: {
        eventId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.guestbookEntry.aggregate({
      where: {
        eventId,
        photoStoragePath: { not: null },
      },
      _sum: { photoSizeBytes: true },
    }),
    (prisma as any).guestbookPhotoUpload.aggregate({
      where: {
        eventId,
        claimedAt: null,
        expiresAt: { gt: now },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { designAssetsBytes: true },
    }),
  ]);

  const photos = toBigInt((photoAgg as any)?._sum?.sizeBytes);
  const videos = toBigInt((videoAgg as any)?._sum?.sizeBytes);
  const guestbook = toBigInt((guestbookAgg as any)?._sum?.photoSizeBytes);
  const guestbookPending = toBigInt((guestbookPendingAgg as any)?._sum?.sizeBytes);
  const design = toBigInt((event as any)?.designAssetsBytes);

  return photos + videos + guestbook + guestbookPending + design;
}

export async function getEventUsageBreakdown(eventId: string): Promise<{
  photosBytes: bigint;
  videosBytes: bigint;
  guestbookBytes: bigint;
  guestbookPendingBytes: bigint;
  designBytes: bigint;
  totalBytes: bigint;
}> {
  const now = new Date();
  const [photoAgg, videoAgg, guestbookAgg, guestbookPendingAgg, event] = await Promise.all([
    prisma.photo.aggregate({
      where: {
        eventId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.video.aggregate({
      where: {
        eventId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.guestbookEntry.aggregate({
      where: {
        eventId,
        photoStoragePath: { not: null },
      },
      _sum: { photoSizeBytes: true },
    }),
    (prisma as any).guestbookPhotoUpload.aggregate({
      where: {
        eventId,
        claimedAt: null,
        expiresAt: { gt: now },
      },
      _sum: { sizeBytes: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { designAssetsBytes: true },
    }),
  ]);

  const photosBytes = toBigInt((photoAgg as any)?._sum?.sizeBytes);
  const videosBytes = toBigInt((videoAgg as any)?._sum?.sizeBytes);
  const guestbookBytes = toBigInt((guestbookAgg as any)?._sum?.photoSizeBytes);
  const guestbookPendingBytes = toBigInt((guestbookPendingAgg as any)?._sum?.sizeBytes);
  const designBytes = toBigInt((event as any)?.designAssetsBytes);

  return {
    photosBytes,
    videosBytes,
    guestbookBytes,
    guestbookPendingBytes,
    designBytes,
    totalBytes: photosBytes + videosBytes + guestbookBytes + guestbookPendingBytes + designBytes,
  };
}

export async function assertUploadWithinLimit(eventId: string, uploadBytes: bigint): Promise<void> {
  const strict = process.env.ENFORCE_STORAGE_LIMITS === 'true';
  const entitlement = await getActiveEventEntitlement(eventId);
  const limit = toBigInt((entitlement as any)?.storageLimitBytes);

  // Strict mode: require an active entitlement with a positive limit.
  if (strict && (!entitlement || limit <= 0n)) {
    const err: any = new Error('Storage limit entitlement missing');
    err.code = 'STORAGE_LIMIT_ENTITLEMENT_MISSING';
    err.httpStatus = 403;
    err.details = {
      eventId,
      hasEntitlement: !!entitlement,
      limitBytes: limit.toString(),
      uploadBytes: uploadBytes.toString(),
    };
    throw err;
  }

  // Permissive mode: no active entitlement or no limit set => allow.
  if (!entitlement || limit <= 0n) return;

  // Use Redis lock to prevent race condition on concurrent uploads
  const redis = getRedis();
  const lockKey = `upload_lock:${eventId}`;
  const reserveKey = `upload_reserve:${eventId}`;
  const lockValue = `${Date.now()}_${Math.random()}`;
  const LOCK_TTL = 30; // seconds

  let acquired = false;
  for (let i = 0; i < 10; i++) {
    const result = await redis.set(lockKey, lockValue, 'EX', LOCK_TTL, 'NX');
    if (result === 'OK') {
      acquired = true;
      break;
    }
    await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
  }

  if (!acquired) {
    logger.warn('[StorageLimit] Could not acquire lock, falling back to unlocked check', { eventId });
    // Fallback: do the check without lock (better than blocking forever)
  }

  try {
    // Get current DB usage + any pending reservations from other concurrent uploads
    const used = await getEventUsageBytes(eventId);
    const pendingReserve = toBigInt(await redis.get(reserveKey));
    const totalUsed = used + pendingReserve;

    if (totalUsed + uploadBytes > limit) {
      const err: any = new Error('Storage limit exceeded');
      err.code = 'STORAGE_LIMIT_EXCEEDED';
      err.httpStatus = 403;
      err.details = {
        usedBytes: used.toString(),
        pendingBytes: pendingReserve.toString(),
        limitBytes: limit.toString(),
        uploadBytes: uploadBytes.toString(),
      };
      throw err;
    }

    // Reserve the space atomically — add uploadBytes to the pending reserve counter
    // TTL of 5 minutes: if the upload fails/crashes, the reservation expires
    const newReserve = (pendingReserve + uploadBytes).toString();
    await redis.set(reserveKey, newReserve, 'EX', 300);
  } finally {
    // Release lock only if we own it
    if (acquired) {
      const current = await redis.get(lockKey);
      if (current === lockValue) {
        await redis.del(lockKey);
      }
    }
  }
}

/**
 * Release storage reservation after successful DB write.
 * Call this after prisma.photo.create() succeeds.
 */
export async function releaseStorageReservation(eventId: string, uploadBytes: bigint): Promise<void> {
  try {
    const redis = getRedis();
    const reserveKey = `upload_reserve:${eventId}`;
    const current = toBigInt(await redis.get(reserveKey));
    const newReserve = current - uploadBytes;
    if (newReserve <= 0n) {
      await redis.del(reserveKey);
    } else {
      await redis.set(reserveKey, newReserve.toString(), 'EX', 300);
    }
  } catch (err) {
    logger.warn('[StorageLimit] Failed to release reservation', { eventId, error: err });
  }
}
