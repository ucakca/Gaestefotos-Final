import webpush from 'web-push';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// ─── VAPID Configuration ────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@gaestefotos.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info('Web Push: VAPID configured');
} else {
  logger.warn('Web Push: VAPID keys not configured — push notifications disabled');
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, any>;
}

// ─── Send to Single Subscription ────────────────────────────────────────────

async function sendToSubscription(
  subscriptionId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint,
        keys: { p256dh, auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 } // 1 hour
    );
    return true;
  } catch (err: any) {
    // 404 or 410 = subscription expired/invalid → remove
    if (err.statusCode === 404 || err.statusCode === 410) {
      await (prisma as any).pushSubscription.delete({ where: { id: subscriptionId } }).catch(() => {});
      logger.debug('Push subscription expired, removed', { subscriptionId });
    } else {
      logger.warn('Push send failed', { subscriptionId, status: err.statusCode, message: err.message });
    }
    return false;
  }
}

// ─── Send to All Subscribers of an Event ────────────────────────────────────

export async function sendPushToEvent(
  eventId: string,
  payload: PushPayload,
  excludeVisitorId?: string
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY) return { sent: 0, failed: 0 };

  const subscriptions = await (prisma as any).pushSubscription.findMany({
    where: { eventId },
    select: { id: true, endpoint: true, p256dh: true, auth: true, visitorId: true },
  });

  let sent = 0;
  let failed = 0;

  // Send in parallel batches of 10
  const batch = subscriptions.filter((s: any) => s.visitorId !== excludeVisitorId);
  const chunks = [];
  for (let i = 0; i < batch.length; i += 10) {
    chunks.push(batch.slice(i, i + 10));
  }

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map((s: any) => sendToSubscription(s.id, s.endpoint, s.p256dh, s.auth, payload))
    );
    results.forEach((r: any) => {
      if (r.status === 'fulfilled' && r.value) sent++;
      else failed++;
    });
  }

  if (sent > 0) {
    logger.info('Push notifications sent', { eventId, sent, failed, total: batch.length });
  }

  return { sent, failed };
}

// ─── Send to a Specific User (Host/Admin) ───────────────────────────────────

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY) return { sent: 0, failed: 0 };

  const subscriptions = await (prisma as any).pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  let sent = 0;
  let failed = 0;

  for (const s of subscriptions) {
    const ok = await sendToSubscription(s.id, s.endpoint, s.p256dh, s.auth, payload);
    if (ok) sent++;
    else failed++;
  }

  return { sent, failed };
}

// ─── Convenience: Notify Event Host ─────────────────────────────────────────

export async function notifyEventHost(
  eventId: string,
  payload: PushPayload
): Promise<void> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true },
    });
    if (event?.hostId) {
      await sendPushToUser(event.hostId, payload);
    }
  } catch (err) {
    logger.warn('notifyEventHost failed', { eventId, error: (err as Error).message });
  }
}

// ─── Pre-built Notification Templates ───────────────────────────────────────

export const pushTemplates = {
  newPhoto: (eventTitle: string, uploaderName: string, eventSlug: string) => ({
    title: '📸 Neues Foto!',
    body: `${uploaderName} hat ein Foto bei "${eventTitle}" hochgeladen`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'new-photo',
    url: `/e3/${eventSlug}`,
  }),

  newGuestbookEntry: (eventTitle: string, authorName: string, eventSlug: string) => ({
    title: '📖 Neuer Gästebuch-Eintrag!',
    body: `${authorName} hat einen Eintrag bei "${eventTitle}" geschrieben`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'guestbook',
    url: `/e3/${eventSlug}?tab=guestbook`,
  }),

  achievementUnlocked: (achievementTitle: string, achievementIcon: string) => ({
    title: `${achievementIcon} Achievement!`,
    body: `Du hast "${achievementTitle}" freigeschaltet!`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'achievement',
    url: '/',
  }),

  photoApproved: (eventTitle: string, eventSlug: string) => ({
    title: '✅ Foto genehmigt!',
    body: `Dein Foto bei "${eventTitle}" wurde freigegeben`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'photo-approved',
    url: `/e3/${eventSlug}`,
  }),

  hostNewUpload: (eventTitle: string, count: number) => ({
    title: '📸 Neue Uploads!',
    body: `${count} neue${count === 1 ? 's' : ''} Foto${count === 1 ? '' : 's'} bei "${eventTitle}"`,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'host-upload',
    url: '/dashboard',
  }),
};

export { VAPID_PUBLIC_KEY };
