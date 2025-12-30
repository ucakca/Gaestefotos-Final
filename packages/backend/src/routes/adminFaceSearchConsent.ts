import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const FACE_SEARCH_CONSENT_KEY = 'face_search_consent_v1';

const schema = z.object({
  noticeText: z.string().optional().nullable(),
  checkboxLabel: z.string().optional().nullable(),
});

async function getConsent(): Promise<{ noticeText: string; checkboxLabel: string }> {
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: FACE_SEARCH_CONSENT_KEY },
    select: { value: true },
  });

  const value = (setting?.value || {}) as any;
  const noticeText = typeof value?.noticeText === 'string' ? value.noticeText : '';
  const checkboxLabel = typeof value?.checkboxLabel === 'string' ? value.checkboxLabel : '';

  return { noticeText, checkboxLabel };
}

async function setConsent(noticeText: string, checkboxLabel: string) {
  await (prisma as any).appSetting.upsert({
    where: { key: FACE_SEARCH_CONSENT_KEY },
    create: {
      key: FACE_SEARCH_CONSENT_KEY,
      value: {
        noticeText,
        checkboxLabel,
      },
    },
    update: {
      value: {
        noticeText,
        checkboxLabel,
      },
    },
  });
}

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const { noticeText, checkboxLabel } = await getConsent();
  res.json({ key: FACE_SEARCH_CONSENT_KEY, noticeText, checkboxLabel });
});

router.put('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const data = schema.parse(req.body);
  const noticeText = (data.noticeText ?? '').trim();
  const checkboxLabel = (data.checkboxLabel ?? '').trim();
  await setConsent(noticeText, checkboxLabel);
  const current = await getConsent();
  res.json({ key: FACE_SEARCH_CONSENT_KEY, ...current, success: true });
});

export default router;
