import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const GENERAL_KEY = 'general_settings';

const generalSchema = z.object({
  siteName: z.string().optional().default('Gästefotos'),
  supportEmail: z.string().email().optional().default('support@gaestefotos.com'),
  consentText: z.string().optional().default(''),
  footerText: z.string().optional().default(''),
});

router.get('/general', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const row = await prisma.appSetting.findUnique({ where: { key: GENERAL_KEY } });
  const defaults = {
    siteName: 'Gästefotos',
    supportEmail: 'support@gaestefotos.com',
    consentText: '',
    footerText: '',
  };
  const settings = row ? { ...defaults, ...(row.value as any) } : defaults;
  res.json({ settings });
});

router.post('/general', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = generalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Ungültige Einstellungen', details: parsed.error.errors });
  }

  const settings = await prisma.appSetting.upsert({
    where: { key: GENERAL_KEY },
    create: { key: GENERAL_KEY, value: parsed.data as any },
    update: { value: parsed.data as any },
  });

  res.json({ settings: settings.value });
});

export default router;
