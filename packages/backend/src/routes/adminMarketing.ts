import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const statsQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

router.get('/stats', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const qParsed = statsQuerySchema.safeParse(req.query);
  if (!qParsed.success) {
    return res.status(400).json({ error: 'Ungültige Query Parameter' });
  }

  const { eventId, days } = qParsed.data;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const trafficWhere: any = {};
  if (eventId) trafficWhere.eventId = eventId;

  const trafficStats = await prisma.eventTrafficStat.findMany({
    where: trafficWhere,
    select: {
      eventId: true,
      source: true,
      count: true,
      firstSeenAt: true,
      lastSeenAt: true,
    },
    orderBy: [{ eventId: 'asc' }, { count: 'desc' }],
  });

  const wooWhere: any = {
    createdAt: { gte: since },
  };
  if (eventId) wooWhere.eventId = eventId;

  const wooTotalsByStatus = await (prisma as any).wooWebhookEventLog.groupBy({
    by: ['status'],
    where: wooWhere,
    _count: { id: true },
  });

  const wooTotalsByTopic = await (prisma as any).wooWebhookEventLog.groupBy({
    by: ['topic'],
    where: wooWhere,
    _count: { id: true },
  });

  const wooOrderPaid = await (prisma as any).wooWebhookEventLog.count({
    where: {
      ...wooWhere,
      topic: 'order-paid',
      status: 'PROCESSED',
    },
  });

  return res.json({
    ok: true,
    range: {
      days,
      since: since.toISOString(),
    },
    filters: {
      eventId: eventId || null,
    },
    traffic: {
      stats: trafficStats,
    },
    woocommerce: {
      totalsByStatus: wooTotalsByStatus,
      totalsByTopic: wooTotalsByTopic,
      processedOrderPaid: wooOrderPaid,
    },
  });
});

export default router;
