/**
 * Admin Workflow Management Routes
 * 
 * CRUD API for ComfyUI workflow JSONs per style effect.
 * Allows uploading, listing, testing and deleting custom workflows.
 * 
 * Routes:
 *   GET    /api/admin/workflows              — List all workflows + available effects
 *   GET    /api/admin/workflows/:effect       — Get workflow JSON for an effect
 *   PUT    /api/admin/workflows/:effect       — Upload/update workflow JSON for an effect
 *   DELETE /api/admin/workflows/:effect       — Delete custom workflow (falls back to generic)
 *   POST   /api/admin/workflows/:effect/test  — Test a workflow with a sample image
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getWorkflowForEffect,
  listAvailableWorkflows,
  saveWorkflowForEffect,
  deleteWorkflowForEffect,
  executeCustomWorkflow,
  WorkflowParams,
} from '../services/comfyuiWorkflowRegistry';

const router = Router();

// All routes require ADMIN role
router.use(authMiddleware, requireRole('ADMIN'));

// ─── Available style effects ────────────────────────────────────────────────

const ALL_EFFECTS = [
  'ai_oldify', 'ai_cartoon', 'ai_style_pop', 'time_machine', 'pet_me',
  'yearbook', 'emoji_me', 'miniature', 'anime', 'watercolor',
  'oil_painting', 'sketch', 'neon_noir', 'renaissance', 'comic_book',
  'pixel_art', 'gif_morph', 'gif_aging', 'trading_card', 'face_swap',
];

// ─── GET /api/admin/workflows — List all workflows ──────────────────────────

router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const customWorkflows = listAvailableWorkflows();

    const effects = ALL_EFFECTS.map(effect => ({
      effect,
      hasCustomWorkflow: customWorkflows.includes(effect),
      label: effectLabel(effect),
    }));

    res.json({
      effects,
      customWorkflowCount: customWorkflows.length,
      totalEffects: ALL_EFFECTS.length,
    });
  } catch (error) {
    logger.error('Failed to list workflows', { error });
    res.status(500).json({ error: 'Fehler beim Laden der Workflows' });
  }
});

// ─── GET /api/admin/workflows/:effect — Get workflow JSON ───────────────────

router.get('/:effect', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;

    if (!ALL_EFFECTS.includes(effect)) {
      return res.status(400).json({ error: `Unbekannter Effect: ${effect}` });
    }

    const workflow = getWorkflowForEffect(effect);

    if (!workflow) {
      return res.status(404).json({
        error: `Kein Custom-Workflow für "${effect}" vorhanden`,
        hint: 'Erstelle einen Workflow im ComfyUI Editor und lade ihn hier hoch.',
      });
    }

    res.json({
      effect,
      workflow,
      nodeCount: Object.keys(workflow).length,
    });
  } catch (error) {
    logger.error('Failed to get workflow', { effect: req.params.effect, error });
    res.status(500).json({ error: 'Fehler beim Laden des Workflows' });
  }
});

// ─── PUT /api/admin/workflows/:effect — Upload/update workflow ──────────────

router.put('/:effect', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;
    const { workflow } = req.body;

    if (!ALL_EFFECTS.includes(effect)) {
      return res.status(400).json({ error: `Unbekannter Effect: ${effect}` });
    }

    if (!workflow || typeof workflow !== 'object') {
      return res.status(400).json({
        error: 'Workflow JSON erforderlich',
        hint: 'Exportiere den Workflow im ComfyUI Editor via "Save (API Format)"',
      });
    }

    // Basic validation: must have at least a SaveImage node
    const nodes = Object.values(workflow);
    const hasSaveNode = nodes.some((n: any) =>
      n.class_type === 'SaveImage' ||
      n.class_type === 'SaveAnimatedWEBP' ||
      n.class_type === 'PreviewImage'
    );

    if (!hasSaveNode) {
      return res.status(400).json({
        error: 'Workflow muss mindestens einen SaveImage/PreviewImage Node enthalten',
      });
    }

    saveWorkflowForEffect(effect, workflow);

    logger.info(`Admin uploaded workflow for "${effect}"`, {
      userId: req.userId,
      nodeCount: Object.keys(workflow).length,
    });

    res.json({
      success: true,
      effect,
      nodeCount: Object.keys(workflow).length,
      message: `Workflow für "${effectLabel(effect)}" gespeichert`,
    });
  } catch (error) {
    logger.error('Failed to save workflow', { effect: req.params.effect, error });
    res.status(500).json({ error: 'Fehler beim Speichern des Workflows' });
  }
});

// ─── DELETE /api/admin/workflows/:effect — Delete custom workflow ───────────

router.delete('/:effect', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;

    if (!ALL_EFFECTS.includes(effect)) {
      return res.status(400).json({ error: `Unbekannter Effect: ${effect}` });
    }

    const deleted = deleteWorkflowForEffect(effect);

    if (!deleted) {
      return res.status(404).json({
        error: `Kein Custom-Workflow für "${effect}" vorhanden`,
      });
    }

    logger.info(`Admin deleted workflow for "${effect}"`, { userId: req.userId });

    res.json({
      success: true,
      effect,
      message: `Custom-Workflow für "${effectLabel(effect)}" gelöscht. Fallback: generisches Flux img2img.`,
    });
  } catch (error) {
    logger.error('Failed to delete workflow', { effect: req.params.effect, error });
    res.status(500).json({ error: 'Fehler beim Löschen des Workflows' });
  }
});

// ─── POST /api/admin/workflows/:effect/test — Test a workflow ───────────────

router.post('/:effect/test', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;
    const { imageBase64, prompt, strength, steps } = req.body;

    if (!ALL_EFFECTS.includes(effect)) {
      return res.status(400).json({ error: `Unbekannter Effect: ${effect}` });
    }

    const workflow = getWorkflowForEffect(effect);
    if (!workflow) {
      return res.status(404).json({
        error: `Kein Custom-Workflow für "${effect}" vorhanden. Bitte zuerst hochladen.`,
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 erforderlich (Base64-kodiertes Bild)' });
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const params: WorkflowParams = {
      prompt: prompt || undefined,
      strength: strength ? Number(strength) : undefined,
      steps: steps ? Number(steps) : undefined,
    };

    logger.info(`Admin testing workflow for "${effect}"`, { userId: req.userId });

    const startTime = Date.now();
    const result = await executeCustomWorkflow(effect as any, imageBuffer, params);

    if (!result) {
      return res.status(500).json({ error: 'Workflow hat kein Ergebnis zurückgegeben' });
    }

    const durationMs = Date.now() - startTime;

    res.json({
      success: true,
      effect,
      durationMs,
      outputSize: result.length,
      outputBase64: result.toString('base64'),
    });
  } catch (error) {
    logger.error('Workflow test failed', { effect: req.params.effect, error: (error as Error).message });
    res.status(500).json({ error: `Workflow-Test fehlgeschlagen: ${(error as Error).message}` });
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function effectLabel(effect: string): string {
  const labels: Record<string, string> = {
    ai_oldify: 'Oldify (Aging)',
    ai_cartoon: 'Cartoon',
    ai_style_pop: 'Pop Art',
    time_machine: 'Time Machine',
    pet_me: 'Pet Me',
    yearbook: 'Yearbook',
    emoji_me: 'Emoji Me',
    miniature: 'Miniature',
    anime: 'Anime',
    watercolor: 'Watercolor',
    oil_painting: 'Oil Painting',
    sketch: 'Sketch',
    neon_noir: 'Neon Noir / Cyberpunk',
    renaissance: 'Renaissance',
    comic_book: 'Comic Book',
    pixel_art: 'Pixel Art',
    gif_morph: 'GIF Morph',
    gif_aging: 'GIF Aging',
    trading_card: 'Trading Card',
    face_swap: 'Face / Head Swap',
  };
  return labels[effect] || effect;
}

// ─── Public Workflow Download Router (for Pod sync) ─────────────────────────
// Separate router mounted at /api/workflows — uses simple API key auth
// so the ComfyUI Pod can pull/push workflows without a full JWT session.

export const workflowSyncRouter = Router();

// Simple API key check (uses WORKFLOW_SYNC_KEY env var)
function checkSyncKey(req: any, res: Response, next: any) {
  const key = req.headers['x-sync-key'] || req.query.key;
  const expected = process.env.WORKFLOW_SYNC_KEY;
  if (!expected) {
    return res.status(503).json({ error: 'WORKFLOW_SYNC_KEY not configured' });
  }
  if (key !== expected) {
    return res.status(401).json({ error: 'Invalid sync key' });
  }
  next();
}

// GET /api/workflows — List all available workflows
workflowSyncRouter.get('/', checkSyncKey, (_req: any, res: Response) => {
  try {
    const customWorkflows = listAvailableWorkflows();
    res.json({
      workflows: ALL_EFFECTS.map(effect => ({
        effect,
        hasWorkflow: customWorkflows.includes(effect),
      })).filter(w => w.hasWorkflow),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list workflows' });
  }
});

// GET /api/workflows/:effect — Download a workflow JSON
workflowSyncRouter.get('/:effect', checkSyncKey, (req: any, res: Response) => {
  try {
    const workflow = getWorkflowForEffect(req.params.effect);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// PUT /api/workflows/:effect — Upload modified workflow back
workflowSyncRouter.put('/:effect', checkSyncKey, (req: any, res: Response) => {
  try {
    const { effect } = req.params;
    const workflow = req.body;
    if (!workflow || typeof workflow !== 'object' || !Object.keys(workflow).length) {
      return res.status(400).json({ error: 'Invalid workflow JSON' });
    }
    saveWorkflowForEffect(effect, workflow);
    logger.info(`[WorkflowSync] Workflow updated for "${effect}" via sync API`);
    res.json({ success: true, effect, nodeCount: Object.keys(workflow).length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save workflow' });
  }
});

export default router;
