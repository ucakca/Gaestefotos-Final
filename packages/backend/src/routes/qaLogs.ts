import { Router, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const QA_LOG_SETTING_KEY = 'qa_logging_v1';

const ingestSchema = z.object({
  level: z.enum(['IMPORTANT', 'DEBUG']).optional().default('IMPORTANT'),
  type: z.string().min(1).max(80),
  message: z.string().max(400).optional(),
  data: z.any().optional(),
  eventId: z.string().max(80).optional(),
  path: z.string().max(200).optional(),
  method: z.string().max(20).optional(),
});

type QaLoggingConfig = {
  debugEnabledUntil?: string | null;
};

async function getQaLoggingConfig(): Promise<QaLoggingConfig> {
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: QA_LOG_SETTING_KEY },
    select: { value: true },
  });
  const value = (setting?.value || {}) as any;
  return {
    debugEnabledUntil: typeof value?.debugEnabledUntil === 'string' ? value.debugEnabledUntil : null,
  };
}

function isDebugEnabled(cfg: QaLoggingConfig): boolean {
  const until = cfg.debugEnabledUntil;
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && Date.now() < t;
}

function ipHashForRequest(req: AuthRequest): string | null {
  const ipRaw =
    (typeof req.headers['x-forwarded-for'] === 'string' ? req.headers['x-forwarded-for'].split(',')[0]?.trim() : null) ||
    (typeof (req as any).ip === 'string' ? (req as any).ip : null) ||
    (typeof (req as any).connection?.remoteAddress === 'string' ? (req as any).connection.remoteAddress : null);

  const ip = (ipRaw || '').trim();
  if (!ip) return null;

  const salt = String(process.env.QA_LOG_IP_SALT || process.env.JWT_SECRET || 'qa-log').trim();
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex');
}

router.get('/config', async (_req: AuthRequest, res: Response) => {
  const cfg = await getQaLoggingConfig();
  res.json({
    key: QA_LOG_SETTING_KEY,
    debugEnabled: isDebugEnabled(cfg),
    debugEnabledUntil: cfg.debugEnabledUntil || null,
  });
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültiger Body' });
  }

  const payload = parsed.data;
  const cfg = await getQaLoggingConfig();

  const level = payload.level;
  if (level === 'DEBUG' && !isDebugEnabled(cfg)) {
    return res.json({ ok: true, skipped: true });
  }

  await (prisma as any).qaLogEvent.create({
    data: {
      level,
      type: payload.type,
      message: payload.message,
      data: payload.data,
      userId: req.userId || null,
      userRole: req.userRole || null,
      eventId: payload.eventId || null,
      path: payload.path || (req.originalUrl || req.url),
      method: payload.method || req.method,
      userAgent: String(req.get('user-agent') || ''),
      ipHash: ipHashForRequest(req),
    },
  });

  res.json({ ok: true });
});

export default router;
export { QA_LOG_SETTING_KEY };
