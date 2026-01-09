import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

function handleError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' });
    }
  }

  logger.error('[adminInvitationTemplates] request failed', {
    message: (error as any)?.message || String(error),
    stack: (error as any)?.stack,
  });
  return res.status(500).json({ error: 'Internal Server Error' });
}

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, 'slug must be URL-safe (letters, numbers, hyphens)');

const createSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(500).optional().nullable(),
  html: z.string().optional().nullable(),
  text: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.invitationTemplate.findMany({
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
    return res.json({ templates });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);

    const created = await prisma.invitationTemplate.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description ?? null,
        html: data.html ?? null,
        text: data.text ?? null,
        isActive: data.isActive ?? true,
      },
    });

    return res.status(201).json({ template: created });
  } catch (error) {
    return handleError(res, error);
  }
});

router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const patch = updateSchema.parse(req.body);

    const updated = await prisma.invitationTemplate.update({
      where: { id },
      data: {
        slug: patch.slug,
        title: patch.title,
        description: patch.description === undefined ? undefined : patch.description,
        html: patch.html === undefined ? undefined : patch.html,
        text: patch.text === undefined ? undefined : patch.text,
        isActive: patch.isActive,
      },
    });

    return res.json({ template: updated });
  } catch (error) {
    return handleError(res, error);
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.invitationTemplate.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, template: updated });
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
