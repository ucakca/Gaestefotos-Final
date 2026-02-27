import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// Helper: require admin role
async function requireAdmin(req: AuthRequest, res: Response): Promise<boolean> {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

// GET /api/admin/ai-surfaces — list all surfaces with assignments
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    // Get all assignments
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM ai_feature_surfaces ORDER BY surface, sort_order, feature_key`,
    );

    // Enrich with registry data
    let registry: any[] = [];
    try {
      const { AI_FEATURE_REGISTRY } = await import('../services/aiFeatureRegistry');
      registry = AI_FEATURE_REGISTRY;
    } catch { /* ignore */ }

    const registryMap = new Map(registry.map((r: any) => [r.key, r]));

    // Group by surface
    const assignments: Record<string, any[]> = {};
    const surfaceSet = new Set<string>();

    for (const row of rows) {
      const reg = registryMap.get(row.feature_key);
      const enriched = {
        id: row.id,
        feature_key: row.feature_key,
        surface: row.surface,
        sort_order: row.sort_order,
        is_enabled: row.is_enabled,
        custom_label: row.custom_label,
        custom_emoji: row.custom_emoji,
        custom_gradient: row.custom_gradient,
        custom_description: row.custom_description,
        created_at: row.created_at,
        updated_at: row.updated_at,
        registryLabel: reg?.label || null,
        registryEmoji: reg?.emoji || null,
        registryCategory: reg?.category || null,
        registryEndpoint: reg?.endpoint || null,
      };
      surfaceSet.add(row.surface);
      if (!assignments[row.surface]) assignments[row.surface] = [];
      assignments[row.surface].push(enriched);
    }

    // Ensure known surfaces appear even if empty
    const KNOWN_SURFACES = ['guest_app_games', 'guest_app_effects', 'booth_interactive', 'ki_booth', 'admin_tools', 'guestbook'];
    for (const s of KNOWN_SURFACES) {
      surfaceSet.add(s);
      if (!assignments[s]) assignments[s] = [];
    }

    res.json({
      surfaces: Array.from(surfaceSet).sort(),
      assignments,
      totalCount: rows.length,
    });
  } catch (error: any) {
    logger.error('Error loading AI surfaces', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admin/ai-surfaces — create assignment
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { feature_key, surface, sort_order } = req.body;
    if (!feature_key || !surface) return res.status(400).json({ error: 'feature_key and surface required' });

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO ai_feature_surfaces (feature_key, surface, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (feature_key, surface)
       DO UPDATE SET sort_order = EXCLUDED.sort_order, updated_at = NOW()
       RETURNING *`,
      feature_key, surface, sort_order || 0,
    );

    res.json(rows[0]);
  } catch (error: any) {
    logger.error('Error creating AI surface assignment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/admin/ai-surfaces/:id — update assignment
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const { id } = req.params;
    const { is_enabled, sort_order, custom_label, custom_emoji, custom_gradient, custom_description } = req.body;

    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [id];
    let idx = 2;

    if (is_enabled !== undefined) { sets.push(`is_enabled = $${idx++}`); params.push(is_enabled); }
    if (sort_order !== undefined) { sets.push(`sort_order = $${idx++}`); params.push(sort_order); }
    if (custom_label !== undefined) { sets.push(`custom_label = $${idx++}`); params.push(custom_label); }
    if (custom_emoji !== undefined) { sets.push(`custom_emoji = $${idx++}`); params.push(custom_emoji); }
    if (custom_gradient !== undefined) { sets.push(`custom_gradient = $${idx++}`); params.push(custom_gradient); }
    if (custom_description !== undefined) { sets.push(`custom_description = $${idx++}`); params.push(custom_description); }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE ai_feature_surfaces SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
      ...params,
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json(rows[0]);
  } catch (error: any) {
    logger.error('Error updating AI surface assignment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/admin/ai-surfaces/:id — delete assignment
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await requireAdmin(req, res))) return;
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM ai_feature_surfaces WHERE id = $1`, req.params.id,
    );
    if (result === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Error deleting AI surface assignment', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

export default router;
