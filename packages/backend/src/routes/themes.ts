import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import groqService, { type GeneratedTheme } from '../lib/groq';

const router = Router();

// ─── Validation Schemas ──────────────────────────────────────

const generateThemeSchema = z.object({
  eventType: z.string().min(1),
  season: z.string().optional(),
  location: z.string().optional(),
});

const createThemeSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  eventType: z.string().min(1),
  season: z.string().nullable().optional(),
  locationStyle: z.string().nullable().optional(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    background: z.string(),
    surface: z.string(),
    text: z.string(),
    textMuted: z.string(),
  }),
  animations: z.object({
    entrance: z.object({ type: z.string(), duration: z.number(), easing: z.string() }),
    hover: z.object({ type: z.string(), duration: z.number(), easing: z.string() }),
    ambient: z.object({ type: z.string(), duration: z.number(), easing: z.string() }).nullable(),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
    accent: z.string(),
  }),
  wallLayout: z.string().default('masonry'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPremium: z.boolean().default(false),
  isPublic: z.boolean().default(true),
});

const updateThemeSchema = createThemeSchema.partial().omit({ slug: true });

// ─── Public Routes ───────────────────────────────────────────

/**
 * POST /api/event-themes/generate
 * AI-generate theme suggestions based on event context.
 * Returns 3 theme suggestions (cached for 30 days).
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const parsed = generateThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Parameter', details: parsed.error.errors });
    }

    const { eventType, season, location } = parsed.data;
    const themes = await groqService.suggestTheme({ eventType, season, location });

    res.json({ themes });
  } catch (error) {
    logger.error('Error generating themes:', { error: (error as Error).message });
    res.status(500).json({ error: 'Theme-Generierung fehlgeschlagen' });
  }
});

/**
 * GET /api/event-themes/stats/overview
 * Theme usage statistics (Admin only).
 */
router.get('/stats/overview', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const [totalThemes, totalUsage, byEventType, topThemes] = await Promise.all([
      prisma.eventTheme.count(),
      prisma.eventTheme.aggregate({ _sum: { usageCount: true } }),
      prisma.eventTheme.groupBy({
        by: ['eventType'],
        _count: true,
        _sum: { usageCount: true },
      }),
      prisma.eventTheme.findMany({
        orderBy: { usageCount: 'desc' },
        take: 10,
        select: { id: true, name: true, slug: true, eventType: true, usageCount: true, isPremium: true },
      }),
    ]);

    res.json({
      totalThemes,
      totalUsage: totalUsage._sum.usageCount || 0,
      byEventType,
      topThemes,
    });
  } catch (error) {
    logger.error('Error getting theme stats:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

/**
 * GET /api/event-themes
 * List themes with optional filters.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { eventType, season, isPremium, isPublic, search } = req.query;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (season) where.season = season;
    if (isPremium !== undefined) where.isPremium = isPremium === 'true';
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    else where.isPublic = true; // Default: only public themes
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const themes = await prisma.eventTheme.findMany({
      where,
      orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ themes });
  } catch (error) {
    logger.error('Error listing themes:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Themes' });
  }
});

/**
 * GET /api/themes/:id
 * Get a single theme by ID.
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const theme = await prisma.eventTheme.findUnique({
      where: { id: req.params.id },
    });

    if (!theme) {
      return res.status(404).json({ error: 'Theme nicht gefunden' });
    }

    res.json({ theme });
  } catch (error) {
    logger.error('Error getting theme:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden des Themes' });
  }
});

// ─── Admin Routes ────────────────────────────────────────────

/**
 * POST /api/themes
 * Create a custom theme (Admin only).
 */
router.post('/', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.errors });
    }

    const existing = await prisma.eventTheme.findUnique({ where: { slug: parsed.data.slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug bereits vergeben' });
    }

    const theme = await prisma.eventTheme.create({
      data: {
        ...parsed.data,
        colors: parsed.data.colors as any,
        animations: parsed.data.animations as any,
        fonts: parsed.data.fonts as any,
      },
    });

    res.status(201).json({ theme });
  } catch (error) {
    logger.error('Error creating theme:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen des Themes' });
  }
});

/**
 * PUT /api/themes/:id
 * Update a theme (Admin only).
 */
router.put('/:id', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.errors });
    }

    const existing = await prisma.eventTheme.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Theme nicht gefunden' });
    }

    const data: any = { ...parsed.data };
    if (data.colors) data.colors = data.colors as any;
    if (data.animations) data.animations = data.animations as any;
    if (data.fonts) data.fonts = data.fonts as any;

    const theme = await prisma.eventTheme.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ theme });
  } catch (error) {
    logger.error('Error updating theme:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Themes' });
  }
});

/**
 * DELETE /api/themes/:id
 * Delete a theme (Admin only). Events using this theme will have themeId set to null.
 */
router.delete('/:id', authMiddleware, requireRole('ADMIN', 'SUPERADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.eventTheme.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { events: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Theme nicht gefunden' });
    }

    await prisma.eventTheme.delete({ where: { id: req.params.id } });

    res.json({ success: true, eventsAffected: existing._count.events });
  } catch (error) {
    logger.error('Error deleting theme:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Löschen des Themes' });
  }
});

/**
 * POST /api/event-themes/:id/save-generated
 * Save an AI-generated theme to the database.
 * Used when a user selects an AI-generated theme in the wizard.
 */
router.post('/:id/save-generated', async (req: Request, res: Response) => {
  try {
    const generatedThemeSchema = z.object({
      name: z.string().min(1),
      eventType: z.string().min(1),
      colors: z.any(),
      animations: z.any(),
      fonts: z.any(),
      wallLayout: z.string().default('masonry'),
      tasteScore: z.number().optional(),
    });

    const parsed = generatedThemeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Daten', details: parsed.error.errors });
    }

    const { name, eventType, colors, animations, fonts, wallLayout } = parsed.data;

    // Generate unique slug
    const baseSlug = `${eventType}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.eventTheme.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const theme = await prisma.eventTheme.create({
      data: {
        slug,
        name,
        eventType,
        colors,
        animations,
        fonts,
        wallLayout,
        isAiGenerated: true,
        isPublic: false, // AI-generated themes are private by default
        tags: ['ai-generated'],
      },
    });

    res.status(201).json({ theme });
  } catch (error) {
    logger.error('Error saving generated theme:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Speichern des generierten Themes' });
  }
});

export default router;
