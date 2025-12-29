import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const THEME_SETTING_KEY = 'theme_tokens_v1';

const themeSchema = z.object({
  tokens: z.record(z.string().min(1)).default({}),
});

async function getThemeTokens(): Promise<Record<string, string>> {
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: THEME_SETTING_KEY },
    select: { value: true },
  });

  const value = (setting?.value || {}) as any;
  const tokens = value?.tokens && typeof value.tokens === 'object' ? value.tokens : {};

  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof k === 'string' && typeof v === 'string' && k.trim() && v.trim()) {
      result[k] = v;
    }
  }

  return result;
}

async function setThemeTokens(tokens: Record<string, string>) {
  await (prisma as any).appSetting.upsert({
    where: { key: THEME_SETTING_KEY },
    create: {
      key: THEME_SETTING_KEY,
      value: { tokens },
    },
    update: {
      value: { tokens },
    },
  });
}

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const tokens = await getThemeTokens();
  res.json({ key: THEME_SETTING_KEY, tokens });
});

router.put('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = themeSchema.parse(req.body);
  await setThemeTokens(data.tokens);
  const tokens = await getThemeTokens();
  res.json({ key: THEME_SETTING_KEY, tokens, success: true });
});

export default router;
