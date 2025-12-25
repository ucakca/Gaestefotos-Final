import prisma from '../config/database';

export const DEFAULT_FREE_STORAGE_DAYS = 14;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function tierToDefaultDurationDays(tier: string | null | undefined): number {
  const t = String(tier || '').toUpperCase();
  if (t === 'PREMIUM') return 365;
  if (t === 'SMART') return 180;
  return DEFAULT_FREE_STORAGE_DAYS;
}

export async function getPackageDurationDaysBySku(sku: string): Promise<number | null> {
  const pkg = await prisma.packageDefinition.findFirst({
    where: { sku, isActive: true },
    select: { storageDurationDays: true, resultingTier: true },
  });
  if (!pkg) return null;
  if (typeof pkg.storageDurationDays === 'number' && pkg.storageDurationDays > 0) return pkg.storageDurationDays;
  return tierToDefaultDurationDays(pkg.resultingTier);
}

export async function getEventStorageEndsAt(eventId: string): Promise<Date | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      entitlements: {
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { wcSku: true },
      },
    },
  });
  if (!event) return null;

  const [firstPhoto, firstVideo, firstGuestbook] = await Promise.all([
    prisma.photo.aggregate({
      where: {
        eventId,
        deletedAt: null,
        NOT: { status: 'DELETED' },
      },
      _min: { createdAt: true },
    }),
    prisma.video.aggregate({
      where: {
        eventId,
        deletedAt: null,
        NOT: { status: 'DELETED' },
      },
      _min: { createdAt: true },
    }),
    prisma.guestbookEntry.aggregate({
      where: {
        eventId,
      },
      _min: { createdAt: true },
    }),
  ]);

  const firstMediaAt =
    [firstPhoto._min.createdAt, firstVideo._min.createdAt, firstGuestbook._min.createdAt]
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;

  // If there is no uploaded media yet, there is no storage window to expire.
  if (!firstMediaAt) return null;

  const sku = event.entitlements?.[0]?.wcSku || null;
  const durationDays = sku ? await getPackageDurationDaysBySku(sku) : DEFAULT_FREE_STORAGE_DAYS;
  return addDays(firstMediaAt, durationDays || DEFAULT_FREE_STORAGE_DAYS);
}

export async function isEventStorageLocked(eventId: string, now = new Date()): Promise<boolean> {
  const endsAt = await getEventStorageEndsAt(eventId);
  if (!endsAt) return false;
  return now.getTime() > endsAt.getTime();
}
