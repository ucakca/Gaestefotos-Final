import prisma from '../config/database';
import { tierToDefaultDurationDays, DEFAULT_FREE_STORAGE_DAYS } from './storagePolicy';

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

  const used = await getEventUsageBytes(eventId);
  if (used + uploadBytes > limit) {
    const err: any = new Error('Storage limit exceeded');
    err.code = 'STORAGE_LIMIT_EXCEEDED';
    err.httpStatus = 403;
    err.details = {
      usedBytes: used.toString(),
      limitBytes: limit.toString(),
      uploadBytes: uploadBytes.toString(),
    };
    throw err;
  }
}
