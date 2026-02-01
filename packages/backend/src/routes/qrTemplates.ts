import { Router, Response, Request } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

// GET /api/qr-templates - List all public, active templates (without SVG content)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.qr_templates.findMany({
      where: {
        isActive: true,
        isPublic: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        isPremium: true,
        defaultBgColor: true,
        defaultTextColor: true,
        defaultAccentColor: true,
        previewUrl: true,
      },
    });
    return res.json({ templates });
  } catch (error) {
    logger.error('[qrTemplates] Failed to list templates', {
      message: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/qr-templates/:slug - Get single template with SVG content
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const template = await prisma.qr_templates.findFirst({
      where: {
        slug: req.params.slug,
        isActive: true,
        isPublic: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        isPremium: true,
        defaultBgColor: true,
        defaultTextColor: true,
        defaultAccentColor: true,
        svgA6: true,
        svgA5: true,
        svgStory: true,
        svgSquare: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ template });
  } catch (error) {
    logger.error('[qrTemplates] Failed to get template', {
      slug: req.params.slug,
      message: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/qr-templates/:slug/:format - Get SVG for specific format
router.get('/:slug/:format', async (req: Request, res: Response) => {
  try {
    const { slug, format } = req.params;
    const validFormats = ['A6', 'A5', 'story', 'square'];
    
    if (!validFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use: A6, A5, story, square' });
    }

    const template = await prisma.qr_templates.findFirst({
      where: {
        slug,
        isActive: true,
        isPublic: true,
      },
      select: {
        svgA6: true,
        svgA5: true,
        svgStory: true,
        svgSquare: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const formatMap: Record<string, string | null> = {
      A6: template.svgA6,
      A5: template.svgA5,
      story: template.svgStory,
      square: template.svgSquare,
    };

    const svg = formatMap[format];

    if (!svg) {
      return res.status(404).json({ error: `Format ${format} not available for this template` });
    }

    // Return as SVG
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(svg);
  } catch (error) {
    logger.error('[qrTemplates] Failed to get SVG', {
      slug: req.params.slug,
      format: req.params.format,
      message: getErrorMessage(error),
    });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
