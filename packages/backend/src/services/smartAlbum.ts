import prisma from '../config/database';

/**
 * Selects the appropriate smart category (album) based on capture time
 * Used for automatic album assignment during photo/video uploads
 */
export async function selectSmartCategoryId(opts: {
  eventId: string;
  capturedAt: Date;
  isGuest: boolean;
}): Promise<string | null> {
  const { eventId, capturedAt, isGuest } = opts;

  const cat = await prisma.category.findFirst({
    where: {
      eventId,
      startAt: { not: null, lte: capturedAt },
      endAt: { not: null, gte: capturedAt },
    },
    select: { id: true, uploadLocked: true },
    orderBy: { startAt: 'desc' },
  });

  if (!cat) return null;
  if (isGuest && cat.uploadLocked) return null;
  return cat.id;
}
