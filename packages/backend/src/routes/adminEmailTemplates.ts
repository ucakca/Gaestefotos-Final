import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { emailService } from '../services/email';

const router = Router();

const kindSchema = z.enum(['INVITATION', 'STORAGE_ENDS_REMINDER', 'PHOTO_NOTIFICATION']);

const upsertSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const previewSchema = z.object({
  variables: z.record(z.any()).optional(),
});

const testSendSchema = z.object({
  to: z.string().min(3),
  variables: z.record(z.any()).optional(),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const templates = await (prisma as any).emailTemplate.findMany({
    orderBy: { kind: 'asc' },
    select: {
      id: true,
      kind: true,
      name: true,
      subject: true,
      html: true,
      text: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json({ templates });
});

router.get('/:kind', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const kind = kindSchema.parse(req.params.kind);

  const template = await (prisma as any).emailTemplate.findFirst({
    where: { kind },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ template: template || null });
});

router.put('/:kind', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const kind = kindSchema.parse(req.params.kind);
  const data = upsertSchema.parse(req.body);

  const saved = await (prisma as any).emailTemplate.upsert({
    where: { kind },
    create: {
      kind,
      name: data.name,
      subject: data.subject,
      html: data.html ?? null,
      text: data.text ?? null,
      isActive: data.isActive ?? true,
    },
    update: {
      name: data.name,
      subject: data.subject,
      html: data.html ?? null,
      text: data.text ?? null,
      isActive: data.isActive ?? true,
    },
  });

  res.json({ template: saved, success: true });
});

router.post('/:kind/preview', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const kind = kindSchema.parse(req.params.kind);
  const data = previewSchema.parse(req.body);

  const template = await (prisma as any).emailTemplate.findFirst({
    where: { kind, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!template) {
    return res.status(404).json({ error: 'Template nicht gefunden' });
  }

  const variables = (data.variables || {}) as Record<string, any>;
  const rendered = (emailService as any).renderTemplate({
    subject: template.subject,
    html: template.html,
    text: template.text,
    variables,
  });

  res.json({ rendered });
});

router.post('/:kind/test-send', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const kind = kindSchema.parse(req.params.kind);
  const data = testSendSchema.parse(req.body);

  const template = await (prisma as any).emailTemplate.findFirst({
    where: { kind, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (!template) {
    return res.status(404).json({ error: 'Template nicht gefunden' });
  }

  await (emailService as any).sendTemplatedEmail({
    to: data.to,
    template: {
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    variables: (data.variables || {}) as Record<string, any>,
  });

  res.json({ success: true });
});

export default router;
