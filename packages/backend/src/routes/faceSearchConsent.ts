import { Router, Response } from 'express';
import prisma from '../config/database';

const router = Router();

const FACE_SEARCH_CONSENT_KEY = 'face_search_consent_v1';

type FaceSearchConsentValue = {
  noticeText?: string;
  checkboxLabel?: string;
};

async function getConsent(): Promise<Required<FaceSearchConsentValue>> {
  const setting = await (prisma as any).appSetting.findUnique({
    where: { key: FACE_SEARCH_CONSENT_KEY },
    select: { value: true },
  });

  const value = (setting?.value || {}) as any;
  const noticeText = typeof value?.noticeText === 'string' ? value.noticeText : '';
  const checkboxLabel = typeof value?.checkboxLabel === 'string' ? value.checkboxLabel : '';

  return {
    noticeText,
    checkboxLabel,
  };
}

router.get('/', async (_req, res: Response) => {
  const consent = await getConsent();
  res.json({ key: FACE_SEARCH_CONSENT_KEY, ...consent });
});

export default router;
