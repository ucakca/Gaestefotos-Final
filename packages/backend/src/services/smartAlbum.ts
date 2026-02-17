import prisma from '../config/database';
import { cacheGet, cacheSet } from './cache/redis';

interface CachedCategory {
  id: string;
  startAt: string;
  endAt: string;
  uploadLocked: boolean;
}

const CACHE_TTL = 120; // 2 minutes

/**
 * Get event categories with time windows from cache or DB.
 */
async function getEventTimeCategories(eventId: string): Promise<CachedCategory[]> {
  const cacheKey = `smart-album:${eventId}`;
  const cached = await cacheGet<CachedCategory[]>(cacheKey);
  if (cached) return cached;

  const cats = await prisma.category.findMany({
    where: {
      eventId,
      startAt: { not: null },
      endAt: { not: null },
    },
    select: { id: true, startAt: true, endAt: true, uploadLocked: true },
    orderBy: { startAt: 'desc' },
  });

  const result: CachedCategory[] = cats.map(c => ({
    id: c.id,
    startAt: c.startAt!.toISOString(),
    endAt: c.endAt!.toISOString(),
    uploadLocked: c.uploadLocked ?? false,
  }));

  await cacheSet(cacheKey, result, CACHE_TTL);
  return result;
}

/**
 * Selects the appropriate smart category (album) based on capture time.
 * Uses Redis cache (2min TTL) to avoid DB queries on every upload.
 */
export async function selectSmartCategoryId(opts: {
  eventId: string;
  capturedAt: Date;
  isGuest: boolean;
}): Promise<string | null> {
  const { eventId, capturedAt, isGuest } = opts;
  const capturedMs = capturedAt.getTime();

  const cats = await getEventTimeCategories(eventId);

  for (const cat of cats) {
    const start = new Date(cat.startAt).getTime();
    const end = new Date(cat.endAt).getTime();
    if (capturedMs >= start && capturedMs <= end) {
      if (isGuest && cat.uploadLocked) return null;
      return cat.id;
    }
  }

  return null;
}
