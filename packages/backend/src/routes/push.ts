import { Router, Response } from 'express';
import prisma from '../config/database';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { VAPID_PUBLIC_KEY } from '../services/pushNotification';

const router = Router();

// ─── GET /api/push/vapid-key ────────────────────────────────────────────────
// Returns the public VAPID key for the frontend to subscribe
router.get('/vapid-key', (_req, res: Response) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── POST /api/push/subscribe ───────────────────────────────────────────────
// Subscribe to push notifications for an event
router.post(
  '/subscribe',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { subscription, eventId, visitorId } = req.body;

      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription object' });
      }

      const data = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent'] || null,
        eventId: eventId || null,
        visitorId: visitorId || null,
        userId: req.userId || null,
      };

      // Upsert by endpoint (unique)
      const sub = await (prisma as any).pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
          p256dh: data.p256dh,
          auth: data.auth,
          eventId: data.eventId,
          visitorId: data.visitorId,
          userId: data.userId,
          userAgent: data.userAgent,
        },
        create: data,
      });

      logger.info('Push subscription saved', {
        id: sub.id,
        eventId: data.eventId,
        hasUser: !!data.userId,
      });

      res.json({ success: true, id: sub.id });
    } catch (error) {
      logger.error('Push subscribe failed', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Subscription failed' });
    }
  }
);

// ─── DELETE /api/push/subscribe ─────────────────────────────────────────────
// Unsubscribe from push notifications
router.delete(
  '/subscribe',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      await (prisma as any).pushSubscription.deleteMany({
        where: { endpoint },
      });

      logger.info('Push subscription removed', { endpoint: endpoint.substring(0, 50) });
      res.json({ success: true });
    } catch (error) {
      logger.error('Push unsubscribe failed', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Unsubscribe failed' });
    }
  }
);

export default router;
