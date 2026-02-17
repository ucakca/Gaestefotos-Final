import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { z } from 'zod';
import {
  listActiveTemplates,
  getTemplateHistory,
  upsertTemplate,
  restoreVersion,
  deleteTemplate,
  seedDefaultPrompts,
  resolvePrompt,
} from '../services/promptTemplates';

async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

const router = Router();

// Enforce ADMIN role at router level
router.use(authMiddleware, requireRole('ADMIN'));

// ─── Validation ─────────────────────────────────────────────

const upsertSchema = z.object({
  feature: z.string().min(2).max(100),
  name: z.string().min(2).max(200),
  description: z.string().optional().nullable(),
  category: z.enum(['SYSTEM', 'STYLE', 'GAME', 'SUGGEST', 'CUSTOM']),
  systemPrompt: z.string().optional().nullable(),
  userPromptTpl: z.string().optional().nullable(),
  negativePrompt: z.string().optional().nullable(),
  temperature: z.number().min(0).max(2).optional().nullable(),
  maxTokens: z.number().int().positive().optional().nullable(),
  strength: z.number().min(0).max(1).optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  variables: z.any().optional().nullable(),
  tags: z.any().optional().nullable(),
});

// ─── Routes ─────────────────────────────────────────────────

/**
 * GET /api/admin/prompt-templates
 * List all active prompt templates
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const { category, eventId } = req.query;
    const templates = await listActiveTemplates({
      category: category as any,
      eventId: eventId as string,
    });
    res.json({ templates });
  } catch (error) {
    logger.error('Error listing prompt templates:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Prompt-Templates' });
  }
});

/**
 * GET /api/admin/prompt-templates/all
 * List ALL templates including inactive versions (for history view)
 */
router.get('/all', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const templates = await prisma.aiPromptTemplate.findMany({
      orderBy: [{ feature: 'asc' }, { version: 'desc' }],
    });
    res.json({ templates });
  } catch (error) {
    logger.error('Error listing all prompt templates:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Templates' });
  }
});

/**
 * GET /api/admin/prompt-templates/history/:feature
 * Get version history for a specific feature
 */
router.get('/history/:feature', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const { feature } = req.params;
    const { eventId } = req.query;
    const history = await getTemplateHistory(feature, eventId as string);
    res.json({ history });
  } catch (error) {
    logger.error('Error getting template history:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Versionshistorie' });
  }
});

/**
 * GET /api/admin/prompt-templates/resolve/:feature
 * Preview how a prompt resolves (DB → fallback chain)
 */
router.get('/resolve/:feature', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const { feature } = req.params;
    const { eventId } = req.query;
    const resolved = await resolvePrompt(feature, eventId as string);
    res.json({ resolved });
  } catch (error) {
    logger.error('Error resolving prompt:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Auflösen des Prompts' });
  }
});

/**
 * POST /api/admin/prompt-templates
 * Create or update a prompt template (new version)
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const parsed = upsertSchema.parse(req.body);
    const template = await upsertTemplate({
      feature: parsed.feature,
      name: parsed.name,
      description: parsed.description ?? undefined,
      category: parsed.category as any,
      systemPrompt: parsed.systemPrompt ?? undefined,
      userPromptTpl: parsed.userPromptTpl ?? undefined,
      negativePrompt: parsed.negativePrompt ?? undefined,
      temperature: parsed.temperature ?? undefined,
      maxTokens: parsed.maxTokens ?? undefined,
      strength: parsed.strength ?? undefined,
      eventId: parsed.eventId ?? undefined,
      variables: parsed.variables,
      tags: parsed.tags,
      createdBy: req.userId,
    });

    logger.info('[PromptTemplates] Template created/updated', {
      feature: template.feature,
      version: template.version,
      by: req.userId,
    });

    res.status(201).json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validierungsfehler', details: error.errors });
    }
    logger.error('Error upserting prompt template:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Speichern des Templates' });
  }
});

/**
 * POST /api/admin/prompt-templates/restore/:id
 * Restore a specific version as active
 */
router.post('/restore/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const { id } = req.params;
    const restored = await restoreVersion(id);
    logger.info('[PromptTemplates] Version restored', {
      feature: restored.feature,
      version: restored.version,
      restoredFrom: id,
    });
    res.json({ template: restored });
  } catch (error) {
    logger.error('Error restoring template version:', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Fehler beim Wiederherstellen' });
  }
});

/**
 * DELETE /api/admin/prompt-templates/:id
 * Delete a non-default template
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const { id } = req.params;
    await deleteTemplate(id);
    logger.info('[PromptTemplates] Template deleted', { id, by: req.userId });
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting prompt template:', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message || 'Fehler beim Löschen' });
  }
});

/**
 * POST /api/admin/prompt-templates/seed
 * Seed default prompts (idempotent)
 */
router.post('/seed', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!(await requireAdmin(req, res))) return;

  try {
    const result = await seedDefaultPrompts();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Error seeding prompt templates:', { error: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Seeding der Default-Prompts' });
  }
});

export default router;
