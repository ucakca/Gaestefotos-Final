import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

function handleError(res: Response, error: unknown) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Slug already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Template not found' });
    }
  }

  logger.error('[adminQrTemplates] request failed', {
    message: getErrorMessage(error),
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

const categorySchema = z.enum(['MINIMAL', 'ELEGANT', 'NATURAL', 'FESTIVE', 'MODERN', 'RUSTIC']);

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color');

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
  category: categorySchema.optional().default('MINIMAL'),
  svgA6: z.string().optional().nullable(),
  svgA5: z.string().optional().nullable(),
  svgStory: z.string().optional().nullable(),
  svgSquare: z.string().optional().nullable(),
  defaultBgColor: colorSchema.optional().default('#ffffff'),
  defaultTextColor: colorSchema.optional().default('#1a1a1a'),
  defaultAccentColor: colorSchema.optional().default('#295B4D'),
  isPremium: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

const updateSchema = createSchema.partial().omit({ slug: true });

// GET /api/admin/qr-templates - List all templates
router.get('/', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const templates = await prisma.qr_templates.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        isPremium: true,
        isPublic: true,
        isActive: true,
        sortOrder: true,
        defaultBgColor: true,
        defaultTextColor: true,
        defaultAccentColor: true,
        previewUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ templates });
  } catch (error) {
    return handleError(res, error);
  }
});

// GET /api/admin/qr-templates/:slug - Get single template with SVG content
router.get('/:slug', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const template = await prisma.qr_templates.findFirst({
      where: { slug: req.params.slug },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ template });
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/admin/qr-templates - Create new template
router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = createSchema.parse(req.body);

    const created = await prisma.qr_templates.create({
      data: {
        id: crypto.randomUUID(),
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        category: data.category,
        svgA6: data.svgA6 ?? null,
        svgA5: data.svgA5 ?? null,
        svgStory: data.svgStory ?? null,
        svgSquare: data.svgSquare ?? null,
        defaultBgColor: data.defaultBgColor,
        defaultTextColor: data.defaultTextColor,
        defaultAccentColor: data.defaultAccentColor,
        isPremium: data.isPremium,
        isPublic: data.isPublic,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    logger.info('[adminQrTemplates] Template created', { slug: created.slug, id: created.id });
    return res.status(201).json({ template: created });
  } catch (error) {
    return handleError(res, error);
  }
});

// PUT /api/admin/qr-templates/:slug - Update template
router.put('/:slug', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = updateSchema.parse(req.body);

    const updated = await prisma.qr_templates.update({
      where: { slug: req.params.slug },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.svgA6 !== undefined && { svgA6: data.svgA6 }),
        ...(data.svgA5 !== undefined && { svgA5: data.svgA5 }),
        ...(data.svgStory !== undefined && { svgStory: data.svgStory }),
        ...(data.svgSquare !== undefined && { svgSquare: data.svgSquare }),
        ...(data.defaultBgColor !== undefined && { defaultBgColor: data.defaultBgColor }),
        ...(data.defaultTextColor !== undefined && { defaultTextColor: data.defaultTextColor }),
        ...(data.defaultAccentColor !== undefined && { defaultAccentColor: data.defaultAccentColor }),
        ...(data.isPremium !== undefined && { isPremium: data.isPremium }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    logger.info('[adminQrTemplates] Template updated', { slug: updated.slug });
    return res.json({ template: updated });
  } catch (error) {
    return handleError(res, error);
  }
});

// DELETE /api/admin/qr-templates/:slug - Delete template
router.delete('/:slug', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.qr_templates.delete({
      where: { slug: req.params.slug },
    });

    logger.info('[adminQrTemplates] Template deleted', { slug: req.params.slug });
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error);
  }
});

// POST /api/admin/qr-templates/:slug/duplicate - Duplicate a template
router.post('/:slug/duplicate', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const original = await prisma.qr_templates.findFirst({
      where: { slug: req.params.slug },
    });

    if (!original) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const newSlug = `${original.slug}-copy-${Date.now()}`;

    const duplicate = await prisma.qr_templates.create({
      data: {
        id: crypto.randomUUID(),
        slug: newSlug,
        name: `${original.name} (Kopie)`,
        description: original.description,
        category: original.category,
        svgA6: original.svgA6,
        svgA5: original.svgA5,
        svgStory: original.svgStory,
        svgSquare: original.svgSquare,
        defaultBgColor: original.defaultBgColor,
        defaultTextColor: original.defaultTextColor,
        defaultAccentColor: original.defaultAccentColor,
        isPremium: original.isPremium,
        isPublic: false,
        isActive: false,
        sortOrder: original.sortOrder + 1,
      },
    });

    logger.info('[adminQrTemplates] Template duplicated', { original: original.slug, new: duplicate.slug });
    return res.status(201).json({ template: duplicate });
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
