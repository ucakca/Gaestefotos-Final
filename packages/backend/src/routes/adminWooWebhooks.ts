import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { processWooOrderPaidWebhook } from './woocommerceWebhooks';

const router = Router();

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

const listSchema = z.object({
  status: z.string().optional(),
  wcOrderId: z.string().optional(),
  eventId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/logs', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Query Parameter' });
  }

  const { status, wcOrderId, eventId, limit, offset } = parsed.data;

  const where: any = {};
  if (status && status.trim().length > 0) where.status = status.trim();
  if (wcOrderId && wcOrderId.trim().length > 0) where.wcOrderId = wcOrderId.trim();
  if (eventId && eventId.trim().length > 0) where.eventId = eventId.trim();

  const [total, logs] = await Promise.all([
    (prisma as any).wooWebhookEventLog.count({ where }),
    (prisma as any).wooWebhookEventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  res.json({ ok: true, total, logs });
});

router.get('/logs/export.csv', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Query Parameter' });
  }

  const { status, wcOrderId, eventId } = parsed.data;

  const where: any = {};
  if (status && status.trim().length > 0) where.status = status.trim();
  if (wcOrderId && wcOrderId.trim().length > 0) where.wcOrderId = wcOrderId.trim();
  if (eventId && eventId.trim().length > 0) where.eventId = eventId.trim();

  const logs = await (prisma as any).wooWebhookEventLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      provider: true,
      topic: true,
      status: true,
      reason: true,
      error: true,
      signatureOk: true,
      payloadHash: true,
      wcOrderId: true,
      wcProductId: true,
      wcSku: true,
      skus: true,
      eventCode: true,
      eventId: true,
      wpUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const header = [
    'id',
    'provider',
    'topic',
    'status',
    'reason',
    'error',
    'signatureOk',
    'payloadHash',
    'wcOrderId',
    'wcProductId',
    'wcSku',
    'skus',
    'eventCode',
    'eventId',
    'wpUserId',
    'createdAt',
    'updatedAt',
  ].join(',');

  const lines = (logs || []).map((l: any) => {
    return [
      toCsvValue(l.id),
      toCsvValue(l.provider),
      toCsvValue(l.topic),
      toCsvValue(l.status),
      toCsvValue(l.reason),
      toCsvValue(l.error),
      toCsvValue(l.signatureOk),
      toCsvValue(l.payloadHash),
      toCsvValue(l.wcOrderId),
      toCsvValue(l.wcProductId),
      toCsvValue(l.wcSku),
      toCsvValue(Array.isArray(l.skus) ? l.skus.join('|') : ''),
      toCsvValue(l.eventCode),
      toCsvValue(l.eventId),
      toCsvValue(l.wpUserId),
      toCsvValue(l.createdAt?.toISOString?.() || l.createdAt),
      toCsvValue(l.updatedAt?.toISOString?.() || l.updatedAt),
    ].join(',');
  });

  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="woo-webhook-logs.csv"');
  return res.send(csv);
});

const purgeSchema = z.object({
  olderThanDays: z.coerce.number().int().min(1).max(3650),
  status: z.string().optional(),
  topic: z.string().optional(),
});

router.post('/logs/purge', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = purgeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültiger Body' });
  }

  const cutoff = new Date(Date.now() - parsed.data.olderThanDays * 24 * 60 * 60 * 1000);

  const where: any = {
    createdAt: { lt: cutoff },
  };
  if (parsed.data.status && parsed.data.status.trim()) where.status = parsed.data.status.trim();
  if (parsed.data.topic && parsed.data.topic.trim()) where.topic = parsed.data.topic.trim();

  const result = await (prisma as any).wooWebhookEventLog.deleteMany({ where });
  return res.json({ ok: true, deleted: result?.count || 0, cutoff: cutoff.toISOString() });
});

const replaySchema = z.object({
  mode: z.enum(['dry_run', 'apply']).optional().default('dry_run'),
});

router.post('/replay/:logId', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { logId } = req.params;
  const parsed = replaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültiger Body' });
  }

  const log = await (prisma as any).wooWebhookEventLog.findUnique({
    where: { id: logId },
  });

  if (!log) {
    return res.status(404).json({ error: 'Log nicht gefunden' });
  }

  if (parsed.data.mode === 'dry_run') {
    return res.json({ ok: true, mode: parsed.data.mode, log });
  }

  if (log.provider !== 'WOOCOMMERCE' || log.topic !== 'order-paid') {
    return res.status(400).json({ error: 'Replay wird nur für WooCommerce order-paid unterstützt' });
  }

  const createdReplayLog = await (prisma as any).wooWebhookEventLog
    .create({
      data: {
        provider: 'WOOCOMMERCE',
        topic: 'order-paid',
        signatureOk: true,
        payloadHash: log.payloadHash || null,
        payload: log.payload as any,
        status: 'RECEIVED',
        reason: 'admin_replay_apply',
      },
    })
    .catch(() => null);

  const replayLogId = createdReplayLog?.id || null;

  const result = await processWooOrderPaidWebhook({
    payload: log.payload as any,
    signatureOk: true,
    payloadHash: log.payloadHash || null,
    logId: replayLogId,
  });

  return res.status(result.httpStatus).json({
    ok: result.httpStatus >= 200 && result.httpStatus < 300,
    mode: parsed.data.mode,
    sourceLogId: log.id,
    replayLogId,
    result: result.body,
  });
});

router.get('/sku-mapping', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.packageDefinition.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        sku: true,
        name: true,
        type: true,
        resultingTier: true,
        isActive: true,
        priceEurCents: true,
      },
    });

    // Count orders per SKU from webhook logs
    const skuCounts = await (prisma as any).$queryRawUnsafe(`
      SELECT "wcSku" as sku, COUNT(*)::int as count
      FROM woo_webhook_event_logs
      WHERE "wcSku" IS NOT NULL AND status = 'PROCESSED'
      GROUP BY "wcSku"
    `).catch(() => []);

    const countMap = new Map<string, number>();
    for (const row of skuCounts as any[]) {
      if (row.sku) countMap.set(row.sku, row.count);
    }

    // Find orphaned SKUs (in webhook logs but no PackageDefinition)
    const packageSkus = new Set(packages.map((p: any) => p.sku));
    const orphanedSkus = Array.from(countMap.entries())
      .filter(([sku]) => !packageSkus.has(sku))
      .map(([sku, count]) => ({ sku, orderCount: count }));

    const mapping = packages.map((pkg: any) => ({
      ...pkg,
      orderCount: countMap.get(pkg.sku) || 0,
    }));

    return res.json({ ok: true, mapping, orphanedSkus });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
