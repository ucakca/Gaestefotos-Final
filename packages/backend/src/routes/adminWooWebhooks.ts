import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

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

  // For now this is a lightweight replay: we only return the stored payload.
  // Applying the payload is implemented in the webhook route (single source of truth)
  // once logs table is migrated and we can safely call the shared processor.
  return res.json({ ok: true, mode: parsed.data.mode, log });
});

export default router;
