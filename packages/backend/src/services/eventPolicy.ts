import { Response } from 'express';
import prisma from '../config/database';

export type AccessVisibility = 'guest' | 'hostOrAdmin';

export function isWithinEventDateWindow(now: Date, eventDateTime: Date, toleranceDays = 1): boolean {
  const ms = toleranceDays * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - new Date(eventDateTime).getTime();
  return diff >= -ms && diff <= ms;
}

/**
 * Compute upload window dynamically from event date + category date ranges.
 * The window spans from the earliest category startAt (or event.dateTime - tolerance)
 * to the latest category endAt (or event.dateTime + tolerance).
 */
export async function isWithinUploadWindow(opts: {
  eventId: string;
  eventDateTime: Date | null;
  toleranceDays: number;
  now?: Date;
}): Promise<boolean> {
  const { eventId, eventDateTime, now = new Date() } = opts;
  const toleranceDays = Math.max(0, opts.toleranceDays);

  // Fetch category date boundaries
  const categories = await prisma.category.findMany({
    where: { eventId, startAt: { not: null } },
    select: { startAt: true, endAt: true },
  });

  const toleranceMs = toleranceDays * 24 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;

  // If we have categories with dates, use their full range
  if (categories.length > 0) {
    const starts = categories.map(c => new Date(c.startAt!).getTime());
    // For categories without endAt, use startAt + 24h as implicit end
    const ends = categories.map(c =>
      c.endAt ? new Date(c.endAt).getTime() : new Date(c.startAt!).getTime() + dayMs
    );

    const earliest = Math.min(...starts) - toleranceMs;
    const latest = Math.max(...ends) + toleranceMs;

    return now.getTime() >= earliest && now.getTime() <= latest;
  }

  // Fallback: use event.dateTime with tolerance
  if (eventDateTime) {
    return isWithinEventDateWindow(now, eventDateTime, toleranceDays);
  }

  // No date set at all → always allow
  return true;
}

export function denyByVisibility(
  res: Response,
  visibility: AccessVisibility,
  payload?: { code?: string; error?: string }
) {
  if (visibility === 'guest') {
    return res.status(404).json({ error: payload?.error || 'Event nicht gefunden' });
  }
  return res.status(403).json({ code: payload?.code || 'FORBIDDEN', error: payload?.error || 'Forbidden' });
}
