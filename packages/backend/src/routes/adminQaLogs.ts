import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { QA_LOG_SETTING_KEY } from './qaLogs';

const router = Router();

const setConfigSchema = z.object({
  debugEnabled: z.boolean().optional(),
  debugDurationMinutes: z.coerce.number().int().min(0).max(24 * 60).optional(),
});

async function getConfigValue(): Promise<{ debugEnabledUntil: string | null }> {
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: QA_LOG_SETTING_KEY },
    select: { value: true },
  });
  const value = (setting?.value || {}) as any;
  const debugEnabledUntil = typeof value?.debugEnabledUntil === 'string' ? value.debugEnabledUntil : null;
  return { debugEnabledUntil };
}

function isDebugEnabledUntil(until: string | null): boolean {
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && Date.now() < t;
}

async function upsertConfigValue(value: { debugEnabledUntil: string | null }) {
  await (prisma as any).appSetting.upsert({
    where: { key: QA_LOG_SETTING_KEY },
    create: { key: QA_LOG_SETTING_KEY, value },
    update: { value },
  });
}

router.get('/config', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const cfg = await getConfigValue();
  res.json({
    key: QA_LOG_SETTING_KEY,
    debugEnabled: isDebugEnabledUntil(cfg.debugEnabledUntil),
    debugEnabledUntil: cfg.debugEnabledUntil,
  });
});

router.put('/config', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = setConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültiger Body' });
  }

  const existing = await getConfigValue();

  let debugEnabledUntil: string | null = existing.debugEnabledUntil;

  const durationMinutes =
    typeof parsed.data.debugDurationMinutes === 'number' ? parsed.data.debugDurationMinutes : undefined;

  if (parsed.data.debugEnabled === false) {
    debugEnabledUntil = null;
  }

  if (parsed.data.debugEnabled === true) {
    const minutes = typeof durationMinutes === 'number' ? durationMinutes : 30;
    const until = new Date(Date.now() + minutes * 60 * 1000);
    debugEnabledUntil = until.toISOString();
  }

  if (parsed.data.debugEnabled === undefined && typeof durationMinutes === 'number') {
    if (durationMinutes <= 0) {
      debugEnabledUntil = null;
    } else {
      const until = new Date(Date.now() + durationMinutes * 60 * 1000);
      debugEnabledUntil = until.toISOString();
    }
  }

  await upsertConfigValue({ debugEnabledUntil });

  res.json({
    ok: true,
    key: QA_LOG_SETTING_KEY,
    debugEnabled: isDebugEnabledUntil(debugEnabledUntil),
    debugEnabledUntil,
  });
});

const listSchema = z.object({
  level: z.enum(['IMPORTANT', 'DEBUG']).optional(),
  type: z.string().optional(),
  eventId: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/events', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
  }

  const { level, type, eventId, userId, limit, offset } = parsed.data;

  const where: any = {};
  if (level) where.level = level;
  if (eventId && eventId.trim().length > 0) where.eventId = eventId.trim();
  if (userId && userId.trim().length > 0) where.userId = userId.trim();
  if (type && type.trim().length > 0) where.type = { contains: type.trim(), mode: 'insensitive' };

  const [total, events] = await Promise.all([
    (prisma as any).qaLogEvent.count({ where }),
    (prisma as any).qaLogEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  res.json({ ok: true, total, events });
});

export default router;
