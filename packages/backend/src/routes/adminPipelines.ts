/**
 * Admin AI Pipeline Management Routes
 * 
 * Full CRUD for AI Pipelines, Prompts, Nodes, and Event Overrides.
 * Powers the KI-Studio dashboard page.
 * 
 * Routes:
 *   GET    /api/admin/pipelines                        — List all pipelines (with active prompt)
 *   GET    /api/admin/pipelines/:id                    — Get pipeline detail (prompts, nodes)
 *   POST   /api/admin/pipelines                        — Create new pipeline
 *   PUT    /api/admin/pipelines/:id                    — Update pipeline config
 *   DELETE /api/admin/pipelines/:id                    — Delete pipeline (non-default only)
 *   PATCH  /api/admin/pipelines/:id/toggle             — Toggle isActive
 * 
 *   GET    /api/admin/pipelines/:id/prompts            — List all prompt versions
 *   POST   /api/admin/pipelines/:id/prompts            — Create new prompt version
 *   PUT    /api/admin/pipelines/:id/prompts/:promptId  — Update prompt
 *   POST   /api/admin/pipelines/:id/prompts/:promptId/activate — Activate this version
 * 
 *   PUT    /api/admin/pipelines/:id/nodes              — Save all nodes (bulk replace)
 * 
 *   POST   /api/admin/pipelines/:id/test               — Test pipeline with sample image
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import prisma from '../config/database';

const router = Router();
router.use(authMiddleware, requireRole('ADMIN'));

// ─── LIST ALL PIPELINES ─────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { executor, isActive, search } = req.query;

    const where: any = {};
    if (executor) where.executor = executor;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { featureKey: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pipelines = await prisma.aiPipeline.findMany({
      where,
      include: {
        prompts: {
          where: { isActive: true },
          take: 1,
          orderBy: { version: 'desc' },
        },
        _count: {
          select: { prompts: true, nodes: true, eventOverrides: true },
        },
      },
      orderBy: [{ executor: 'asc' }, { name: 'asc' }],
    });

    res.json({
      pipelines: pipelines.map((p) => ({
        ...p,
        activePrompt: p.prompts[0] || null,
        prompts: undefined,
        promptCount: p._count.prompts,
        nodeCount: p._count.nodes,
        eventOverrideCount: p._count.eventOverrides,
      })),
      total: pipelines.length,
    });
  } catch (error) {
    logger.error('Failed to list pipelines', error);
    res.status(500).json({ error: 'Failed to list pipelines' });
  }
});

// ─── PIPELINE STATS (must be before /:id) ───────────────────────────────────

router.get('/stats/overview', async (req: AuthRequest, res: Response) => {
  try {
    const [total, byExecutor, active, inactive] = await Promise.all([
      prisma.aiPipeline.count(),
      prisma.aiPipeline.groupBy({ by: ['executor'], _count: true }),
      prisma.aiPipeline.count({ where: { isActive: true } }),
      prisma.aiPipeline.count({ where: { isActive: false } }),
    ]);

    res.json({
      total,
      active,
      inactive,
      byExecutor: byExecutor.reduce((acc, item) => {
        acc[item.executor] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    logger.error('Failed to get pipeline stats', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// ─── GET PIPELINE DETAIL ────────────────────────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await prisma.aiPipeline.findUnique({
      where: { id: req.params.id },
      include: {
        prompts: { orderBy: [{ isActive: 'desc' }, { version: 'desc' }] },
        nodes: { orderBy: { nodeId: 'asc' } },
        eventOverrides: {
          include: { event: { select: { id: true, title: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    res.json(pipeline);
  } catch (error) {
    logger.error('Failed to get pipeline', error);
    res.status(500).json({ error: 'Failed to get pipeline' });
  }
});

// ─── CREATE PIPELINE ────────────────────────────────────────────────────────

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      featureKey, name, description, executor, model,
      workflowJson, fallbackWorkflow,
      inputType, outputType,
      defaultStrength, defaultSteps, defaultCfg, defaultSampler, defaultScheduler,
      extraConfig, creditCost,
      prompt, negativePrompt, systemPrompt, editPrompt, strength,
    } = req.body;

    if (!featureKey || !name || !executor) {
      return res.status(400).json({ error: 'featureKey, name, and executor are required' });
    }

    // Check for duplicate featureKey
    const existing = await prisma.aiPipeline.findUnique({ where: { featureKey } });
    if (existing) {
      return res.status(409).json({ error: `Pipeline with featureKey "${featureKey}" already exists` });
    }

    const pipeline = await prisma.$transaction(async (tx) => {
      const p = await tx.aiPipeline.create({
        data: {
          featureKey, name, description,
          executor, model,
          workflowJson: workflowJson || undefined,
          fallbackWorkflow,
          inputType: inputType || 'SINGLE_IMAGE',
          outputType: outputType || 'IMAGE',
          defaultStrength, defaultSteps, defaultCfg,
          defaultSampler, defaultScheduler,
          extraConfig: extraConfig || undefined,
          creditCost: creditCost || 0,
          isDefault: false,
        },
      });

      // Create initial prompt if provided
      if (prompt) {
        await tx.aiPipelinePrompt.create({
          data: {
            pipelineId: p.id,
            prompt,
            negativePrompt: negativePrompt || null,
            systemPrompt: systemPrompt || null,
            editPrompt: editPrompt || null,
            strength,
            version: 1,
            isActive: true,
            changelog: 'Initial prompt',
            createdBy: req.userId,
          },
        });
      }

      // Create default node layout
      const nodes = buildDefaultNodes(executor, inputType || 'SINGLE_IMAGE', outputType || 'IMAGE');
      for (const n of nodes) {
        await tx.aiPipelineNode.create({
          data: { pipelineId: p.id, ...n },
        });
      }

      return p;
    });

    const full = await prisma.aiPipeline.findUnique({
      where: { id: pipeline.id },
      include: {
        prompts: true,
        nodes: true,
      },
    });

    res.status(201).json(full);
  } catch (error) {
    logger.error('Failed to create pipeline', error);
    res.status(500).json({ error: 'Failed to create pipeline' });
  }
});

// ─── UPDATE PIPELINE ────────────────────────────────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, description, executor, model,
      workflowJson, fallbackWorkflow,
      inputType, outputType,
      defaultStrength, defaultSteps, defaultCfg, defaultSampler, defaultScheduler,
      extraConfig, creditCost,
    } = req.body;

    const pipeline = await prisma.aiPipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    const updated = await prisma.aiPipeline.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(executor !== undefined && { executor }),
        ...(model !== undefined && { model }),
        ...(workflowJson !== undefined && { workflowJson }),
        ...(fallbackWorkflow !== undefined && { fallbackWorkflow }),
        ...(inputType !== undefined && { inputType }),
        ...(outputType !== undefined && { outputType }),
        ...(defaultStrength !== undefined && { defaultStrength }),
        ...(defaultSteps !== undefined && { defaultSteps }),
        ...(defaultCfg !== undefined && { defaultCfg }),
        ...(defaultSampler !== undefined && { defaultSampler }),
        ...(defaultScheduler !== undefined && { defaultScheduler }),
        ...(extraConfig !== undefined && { extraConfig }),
        ...(creditCost !== undefined && { creditCost }),
      },
      include: {
        prompts: { where: { isActive: true }, take: 1 },
        nodes: true,
      },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to update pipeline', error);
    res.status(500).json({ error: 'Failed to update pipeline' });
  }
});

// ─── DELETE PIPELINE ────────────────────────────────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await prisma.aiPipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    if (pipeline.isDefault) {
      return res.status(403).json({ error: 'Cannot delete a system default pipeline' });
    }

    await prisma.aiPipeline.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete pipeline', error);
    res.status(500).json({ error: 'Failed to delete pipeline' });
  }
});

// ─── TOGGLE ACTIVE ──────────────────────────────────────────────────────────

router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const pipeline = await prisma.aiPipeline.findUnique({ where: { id: req.params.id } });
    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    const updated = await prisma.aiPipeline.update({
      where: { id: req.params.id },
      data: { isActive: !pipeline.isActive },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to toggle pipeline', error);
    res.status(500).json({ error: 'Failed to toggle pipeline' });
  }
});

// ─── LIST PROMPT VERSIONS ───────────────────────────────────────────────────

router.get('/:id/prompts', async (req: AuthRequest, res: Response) => {
  try {
    const prompts = await prisma.aiPipelinePrompt.findMany({
      where: { pipelineId: req.params.id },
      orderBy: [{ isActive: 'desc' }, { version: 'desc' }],
    });

    res.json(prompts);
  } catch (error) {
    logger.error('Failed to list prompts', error);
    res.status(500).json({ error: 'Failed to list prompts' });
  }
});

// ─── CREATE NEW PROMPT VERSION ──────────────────────────────────────────────

router.post('/:id/prompts', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, negativePrompt, systemPrompt, editPrompt, strength, temperature, maxTokens, changelog, variantLabel, trafficWeight } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    // Get latest version number
    const latest = await prisma.aiPipelinePrompt.findFirst({
      where: { pipelineId: req.params.id, variantLabel: variantLabel || null },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latest?.version || 0) + 1;

    // Deactivate current active prompt for the same variant
    await prisma.aiPipelinePrompt.updateMany({
      where: { pipelineId: req.params.id, isActive: true, variantLabel: variantLabel || null },
      data: { isActive: false },
    });

    const created = await prisma.aiPipelinePrompt.create({
      data: {
        pipelineId: req.params.id,
        prompt,
        negativePrompt: negativePrompt || null,
        systemPrompt: systemPrompt || null,
        editPrompt: editPrompt || null,
        strength,
        temperature,
        maxTokens,
        version: newVersion,
        isActive: true,
        variantLabel: variantLabel || null,
        trafficWeight: trafficWeight != null ? parseInt(trafficWeight) : 100,
        changelog: changelog || `Version ${newVersion}`,
        createdBy: req.userId,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    logger.error('Failed to create prompt version', error);
    res.status(500).json({ error: 'Failed to create prompt version' });
  }
});

// ─── UPDATE PROMPT ──────────────────────────────────────────────────────────

router.put('/:id/prompts/:promptId', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, negativePrompt, systemPrompt, editPrompt, strength, temperature, maxTokens, trafficWeight } = req.body;

    const updated = await prisma.aiPipelinePrompt.update({
      where: { id: req.params.promptId },
      data: {
        ...(prompt !== undefined && { prompt }),
        ...(negativePrompt !== undefined && { negativePrompt }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(editPrompt !== undefined && { editPrompt }),
        ...(strength !== undefined && { strength }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(trafficWeight !== undefined && { trafficWeight }),
      },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to update prompt', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

// ─── ACTIVATE PROMPT VERSION ────────────────────────────────────────────────

router.post('/:id/prompts/:promptId/activate', async (req: AuthRequest, res: Response) => {
  try {
    const promptToActivate = await prisma.aiPipelinePrompt.findUnique({ where: { id: req.params.promptId } });
    if (!promptToActivate) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    await prisma.$transaction([
      // Deactivate all prompts of same variant
      prisma.aiPipelinePrompt.updateMany({
        where: { pipelineId: req.params.id, isActive: true, variantLabel: promptToActivate.variantLabel },
        data: { isActive: false },
      }),
      // Activate selected
      prisma.aiPipelinePrompt.update({
        where: { id: req.params.promptId },
        data: { isActive: true },
      }),
    ]);

    res.json({ success: true, activatedVersion: promptToActivate.version });
  } catch (error) {
    logger.error('Failed to activate prompt', error);
    res.status(500).json({ error: 'Failed to activate prompt' });
  }
});

// ─── SAVE NODES (BULK REPLACE) ─────────────────────────────────────────────

router.put('/:id/nodes', async (req: AuthRequest, res: Response) => {
  try {
    const { nodes } = req.body;

    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'nodes must be an array' });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing nodes
      await tx.aiPipelineNode.deleteMany({ where: { pipelineId: req.params.id } });

      // Create new nodes
      for (const n of nodes) {
        await tx.aiPipelineNode.create({
          data: {
            pipelineId: req.params.id,
            nodeId: n.nodeId,
            nodeType: n.nodeType,
            label: n.label,
            positionX: n.positionX || 0,
            positionY: n.positionY || 0,
            width: n.width,
            height: n.height,
            config: n.config || null,
            connections: n.connections || [],
          },
        });
      }
    });

    const updated = await prisma.aiPipelineNode.findMany({
      where: { pipelineId: req.params.id },
      orderBy: { nodeId: 'asc' },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to save nodes', error);
    res.status(500).json({ error: 'Failed to save nodes' });
  }
});

// ─── LIST EVENT OVERRIDES ──────────────────────────────────────────────────

router.get('/:id/events', async (req: AuthRequest, res: Response) => {
  try {
    const overrides = await prisma.aiPipelineEvent.findMany({
      where: { pipelineId: req.params.id },
      include: { event: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(overrides);
  } catch (error) {
    logger.error('Failed to list event overrides', error);
    res.status(500).json({ error: 'Failed to list event overrides' });
  }
});

// ─── CREATE EVENT OVERRIDE ────────────────────────────────────────────────

router.post('/:id/events', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, customPrompt, customNegativePrompt, customLogoUrl, logoPosition, logoOpacity, logoScale, customConfig } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }

    // Check for existing override
    const existing = await prisma.aiPipelineEvent.findUnique({
      where: { pipelineId_eventId: { pipelineId: req.params.id, eventId } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Override for this event already exists' });
    }

    const override = await prisma.aiPipelineEvent.create({
      data: {
        pipelineId: req.params.id,
        eventId,
        customPrompt: customPrompt || null,
        customNegativePrompt: customNegativePrompt || null,
        customLogoUrl: customLogoUrl || null,
        logoPosition: logoPosition || 'bottom-right',
        logoOpacity: logoOpacity ?? 0.8,
        logoScale: logoScale ?? 0.15,
        customConfig: customConfig || null,
      },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    res.status(201).json(override);
  } catch (error) {
    logger.error('Failed to create event override', error);
    res.status(500).json({ error: 'Failed to create event override' });
  }
});

// ─── UPDATE EVENT OVERRIDE ────────────────────────────────────────────────

router.put('/:id/events/:overrideId', async (req: AuthRequest, res: Response) => {
  try {
    const { customPrompt, customNegativePrompt, customLogoUrl, logoPosition, logoOpacity, logoScale, customConfig, isActive } = req.body;

    const updated = await prisma.aiPipelineEvent.update({
      where: { id: req.params.overrideId },
      data: {
        ...(customPrompt !== undefined && { customPrompt }),
        ...(customNegativePrompt !== undefined && { customNegativePrompt }),
        ...(customLogoUrl !== undefined && { customLogoUrl }),
        ...(logoPosition !== undefined && { logoPosition }),
        ...(logoOpacity !== undefined && { logoOpacity }),
        ...(logoScale !== undefined && { logoScale }),
        ...(customConfig !== undefined && { customConfig }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { event: { select: { id: true, title: true, slug: true } } },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to update event override', error);
    res.status(500).json({ error: 'Failed to update event override' });
  }
});

// ─── DELETE EVENT OVERRIDE ────────────────────────────────────────────────

router.delete('/:id/events/:overrideId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.aiPipelineEvent.delete({ where: { id: req.params.overrideId } });
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete event override', error);
    res.status(500).json({ error: 'Failed to delete event override' });
  }
});

// ─── HELPERS ────────────────────────────────────────────────────────────────

function buildDefaultNodes(executor: string, inputType: string, outputType: string) {
  const nodes: any[] = [];

  nodes.push({
    nodeId: 'input_1', nodeType: 'input',
    label: ['TEXT_ONLY', 'NAME_ONLY'].includes(inputType) ? 'Text Input' : 'Foto Upload',
    positionX: 50, positionY: 150,
    config: { inputType },
    connections: [{ targetNodeId: 'processor_1', targetPort: 'input' }],
  });

  nodes.push({
    nodeId: 'prompt_1', nodeType: 'config',
    label: 'Prompt Config',
    positionX: 250, positionY: 50,
    config: { configType: 'prompt' },
    connections: [{ targetNodeId: 'processor_1', targetPort: 'prompt' }],
  });

  const processorLabel = executor === 'COMFYUI' ? 'ComfyUI Processor'
    : executor === 'LLM' ? 'LLM Processor'
    : executor === 'LOCAL' ? 'Local Processor' : 'External API';

  nodes.push({
    nodeId: 'processor_1', nodeType: 'processor',
    label: processorLabel,
    positionX: 450, positionY: 150,
    config: { executor },
    connections: [{ targetNodeId: 'output_1', targetPort: 'input' }],
  });

  const outputLabel = outputType === 'TEXT' ? 'Text Output'
    : outputType === 'VIDEO' ? 'Video Output'
    : outputType === 'GIF' ? 'GIF Output'
    : outputType === 'JSON' ? 'JSON Output' : 'Image Output';

  nodes.push({
    nodeId: 'output_1', nodeType: 'output',
    label: outputLabel,
    positionX: 700, positionY: 150,
    config: { outputType },
    connections: [],
  });

  return nodes;
}

export default router;
