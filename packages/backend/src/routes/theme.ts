import { Router, Response } from 'express';
import prisma from '../config/database';

const router = Router();

const THEME_SETTING_KEY = 'theme_tokens_v1';

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

router.get('/', async (_req, res: Response) => {
  const tokens = await getThemeTokens();
  res.json({ key: THEME_SETTING_KEY, tokens });
});

export default router;
