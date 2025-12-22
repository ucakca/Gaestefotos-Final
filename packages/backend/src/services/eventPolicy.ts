import { Response } from 'express';

export type AccessVisibility = 'guest' | 'hostOrAdmin';

export function isWithinEventDateWindow(now: Date, eventDateTime: Date, toleranceDays = 1): boolean {
  const ms = toleranceDays * 24 * 60 * 60 * 1000;
  const diff = now.getTime() - new Date(eventDateTime).getTime();
  return diff >= -ms && diff <= ms;
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
