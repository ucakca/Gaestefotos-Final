/**
 * Pipeline Runner Service
 * 
 * Central service that reads AI pipeline configs from DB instead of hardcoded values.
 * Replaces scattered STYLE_PROMPTS, system prompts, and workflow configs.
 * 
 * Features:
 *   - Loads pipeline + active prompt from DB with caching
 *   - Resolves event-specific overrides
 *   - Tracks execution metrics (totalExecutions, successCount, avgDurationMs)
 *   - Supports A/B traffic-weighted prompt selection
 *   - Falls back to hardcoded defaults if DB is unavailable
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PipelineConfig {
  id: string;
  featureKey: string;
  name: string;
  executor: 'COMFYUI' | 'LLM' | 'LOCAL' | 'EXTERNAL';
  model: string | null;
  inputType: string;
  outputType: string;
  isActive: boolean;
  creditCost: number;
  defaultStrength: number | null;
  defaultSteps: number | null;
  defaultCfg: number | null;
  defaultSampler: string | null;
  defaultScheduler: string | null;
  workflowJson: any | null;
  fallbackWorkflow: string | null;
  extraConfig: any | null;
  // Active prompt data
  prompt: string;
  negativePrompt: string | null;
  systemPrompt: string | null;
  editPrompt: string | null;
  promptStrength: number | null;
  promptTemperature: number | null;
  promptMaxTokens: number | null;
  promptVersion: number;
  promptId: string | null;
}

export interface StylePromptConfig {
  prompt: string;
  negativePrompt: string;
  strength: number;
  editPrompt?: string;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const pipelineCache = new Map<string, { data: PipelineConfig; loadedAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Invalidate cache for a specific pipeline or all pipelines.
 */
export function invalidatePipelineCache(featureKey?: string): void {
  if (featureKey) {
    pipelineCache.delete(featureKey);
  } else {
    pipelineCache.clear();
  }
}

// ─── Core: Load Pipeline Config ─────────────────────────────────────────────

/**
 * Get the full pipeline config for a feature key.
 * Reads from DB with 30s cache. Returns null if pipeline not found or inactive.
 */
export async function getPipelineConfig(featureKey: string, eventId?: string): Promise<PipelineConfig | null> {
  // Check cache
  const cached = pipelineCache.get(featureKey);
  if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL_MS) {
    // If eventId, still need to check for overrides (not cached)
    if (!eventId) return cached.data;
  }

  try {
    const pipeline = await prisma.aiPipeline.findUnique({
      where: { featureKey },
      include: {
        prompts: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!pipeline) {
      logger.debug(`[PipelineRunner] No pipeline found for "${featureKey}"`);
      return null;
    }

    // Select prompt (with A/B traffic weighting if multiple active)
    const activePrompt = selectPrompt(pipeline.prompts);

    const config: PipelineConfig = {
      id: pipeline.id,
      featureKey: pipeline.featureKey,
      name: pipeline.name,
      executor: pipeline.executor as any,
      model: pipeline.model,
      inputType: pipeline.inputType as any,
      outputType: pipeline.outputType as any,
      isActive: pipeline.isActive,
      creditCost: pipeline.creditCost,
      defaultStrength: pipeline.defaultStrength,
      defaultSteps: pipeline.defaultSteps,
      defaultCfg: pipeline.defaultCfg,
      defaultSampler: pipeline.defaultSampler,
      defaultScheduler: pipeline.defaultScheduler,
      workflowJson: pipeline.workflowJson,
      fallbackWorkflow: pipeline.fallbackWorkflow,
      extraConfig: pipeline.extraConfig,
      prompt: activePrompt?.prompt || '',
      negativePrompt: activePrompt?.negativePrompt || null,
      systemPrompt: activePrompt?.systemPrompt || null,
      editPrompt: activePrompt?.editPrompt || null,
      promptStrength: activePrompt?.strength ?? null,
      promptTemperature: activePrompt?.temperature ?? null,
      promptMaxTokens: activePrompt?.maxTokens ?? null,
      promptVersion: activePrompt?.version || 0,
      promptId: activePrompt?.id || null,
    };

    // Cache (without event overrides)
    pipelineCache.set(featureKey, { data: config, loadedAt: Date.now() });

    // Apply event overrides if eventId provided
    if (eventId) {
      return await applyEventOverrides(config, eventId);
    }

    return config;
  } catch (err) {
    logger.error(`[PipelineRunner] Failed to load pipeline "${featureKey}"`, { error: err });
    return null;
  }
}

/**
 * Get style prompt config for a ComfyUI style effect.
 * Returns { prompt, negativePrompt, strength } compatible with existing STYLE_PROMPTS format.
 */
export async function getStylePromptConfig(featureKey: string, eventId?: string): Promise<StylePromptConfig | null> {
  const config = await getPipelineConfig(featureKey, eventId);
  if (!config) return null;

  return {
    prompt: config.prompt,
    negativePrompt: config.negativePrompt || '',
    strength: config.promptStrength ?? config.defaultStrength ?? 0.65,
    editPrompt: config.editPrompt || undefined,
  };
}

/**
 * Get LLM prompt config for an LLM feature.
 * Returns { systemPrompt, userPrompt, temperature, maxTokens }.
 */
export async function getLlmPromptConfig(featureKey: string, eventId?: string): Promise<{
  systemPrompt: string;
  userPrompt: string;
  temperature: number | null;
  maxTokens: number | null;
  model: string | null;
} | null> {
  const config = await getPipelineConfig(featureKey, eventId);
  if (!config) return null;

  return {
    systemPrompt: config.systemPrompt || '',
    userPrompt: config.prompt,
    temperature: config.promptTemperature,
    maxTokens: config.promptMaxTokens,
    model: config.model,
  };
}

// ─── A/B Prompt Selection ───────────────────────────────────────────────────

/**
 * Select a prompt from active prompts using traffic-weighted random selection.
 * If only one active prompt, returns it directly.
 */
function selectPrompt(prompts: any[]): any | null {
  if (!prompts || prompts.length === 0) return null;
  if (prompts.length === 1) return prompts[0];

  // Group by variant
  const defaultPrompts = prompts.filter(p => !p.variantLabel);
  if (defaultPrompts.length <= 1) return defaultPrompts[0] || prompts[0];

  // Traffic-weighted selection
  const totalWeight = defaultPrompts.reduce((sum, p) => sum + (p.trafficWeight || 1), 0);
  let random = Math.random() * totalWeight;

  for (const p of defaultPrompts) {
    random -= (p.trafficWeight || 1);
    if (random <= 0) return p;
  }

  return defaultPrompts[0];
}

// ─── Event Overrides ────────────────────────────────────────────────────────

async function applyEventOverrides(config: PipelineConfig, eventId: string): Promise<PipelineConfig> {
  try {
    const override = await prisma.aiPipelineEvent.findUnique({
      where: {
        pipelineId_eventId: {
          pipelineId: config.id,
          eventId,
        },
      },
    });

    if (!override) return config;

    const merged = { ...config };
    if (override.customPrompt) merged.prompt = override.customPrompt;
    if (override.customNegativePrompt) merged.negativePrompt = override.customNegativePrompt;
    if (override.customConfig && typeof override.customConfig === 'object') {
      const cc = override.customConfig as Record<string, any>;
      if (cc.systemPrompt) merged.systemPrompt = cc.systemPrompt;
      if (cc.strength != null) merged.promptStrength = cc.strength;
      if (cc.workflowJson) merged.workflowJson = cc.workflowJson;
      merged.extraConfig = { ...(config.extraConfig || {}), ...cc };
    }

    return merged;
  } catch (err) {
    logger.warn(`[PipelineRunner] Failed to load event override for ${config.featureKey}/${eventId}`, { error: err });
    return config;
  }
}

// ─── Execution Metrics ──────────────────────────────────────────────────────

/**
 * Record pipeline execution result for metrics tracking.
 */
export async function recordPipelineExecution(
  featureKey: string,
  success: boolean,
  durationMs: number,
  promptId?: string | null,
): Promise<void> {
  try {
    // Single atomic UPDATE — computes new averages in-place (was 2 queries: find + update)
    await prisma.$executeRaw`
      UPDATE "ai_pipelines"
      SET "totalExecutions" = "totalExecutions" + 1,
          "successCount" = "successCount" + ${success ? 1 : 0},
          "avgDurationMs" = CASE
            WHEN "totalExecutions" = 0 THEN ${durationMs}
            ELSE ROUND((COALESCE("avgDurationMs", 0) * "totalExecutions" + ${durationMs}) / ("totalExecutions" + 1))
          END
      WHERE "featureKey" = ${featureKey}
    `;

    // Update prompt metrics if promptId known
    if (promptId) {
      await prisma.aiPipelinePrompt.update({
        where: { id: promptId },
        data: {
          testCount: { increment: 1 },
          ...(success ? { successCount: { increment: 1 } } : {}),
        },
      });
    }

    // Invalidate cache to reflect new metrics
    invalidatePipelineCache(featureKey);
  } catch (err) {
    // Non-critical — don't fail the request
    logger.warn(`[PipelineRunner] Failed to record metrics for "${featureKey}"`, { error: err });
  }
}

/**
 * Record a test result with rating for a specific prompt.
 */
export async function recordPromptTestResult(
  promptId: string,
  rating: number,
): Promise<void> {
  try {
    // Single atomic UPDATE — computes running average in-place (was 2 queries: find + update)
    await prisma.$executeRaw`
      UPDATE "ai_pipeline_prompts"
      SET "testCount" = "testCount" + 1,
          "avgRating" = CASE
            WHEN "testCount" = 0 THEN ${rating}
            ELSE ROUND(((COALESCE("avgRating", 0) * "testCount" + ${rating}) / ("testCount" + 1))::numeric, 2)
          END
      WHERE "id" = ${promptId}
    `;
  } catch (err) {
    logger.warn(`[PipelineRunner] Failed to record test result`, { error: err });
  }
}

// ─── Batch Operations ───────────────────────────────────────────────────────

/**
 * Get all active pipeline configs grouped by executor type.
 * Useful for dashboards and monitoring.
 */
export async function getAllActivePipelines(): Promise<PipelineConfig[]> {
  try {
    const pipelines = await prisma.aiPipeline.findMany({
      where: { isActive: true },
      include: {
        prompts: {
          where: { isActive: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ executor: 'asc' }, { name: 'asc' }],
    });

    return pipelines.map((p) => {
      const activePrompt = p.prompts[0];
      return {
        id: p.id,
        featureKey: p.featureKey,
        name: p.name,
        executor: p.executor as any,
        model: p.model,
        inputType: p.inputType as any,
        outputType: p.outputType as any,
        isActive: p.isActive,
        creditCost: p.creditCost,
        defaultStrength: p.defaultStrength,
        defaultSteps: p.defaultSteps,
        defaultCfg: p.defaultCfg,
        defaultSampler: p.defaultSampler,
        defaultScheduler: p.defaultScheduler,
        workflowJson: p.workflowJson,
        fallbackWorkflow: p.fallbackWorkflow,
        extraConfig: p.extraConfig,
        prompt: activePrompt?.prompt || '',
        negativePrompt: activePrompt?.negativePrompt || null,
        systemPrompt: activePrompt?.systemPrompt || null,
        editPrompt: activePrompt?.editPrompt || null,
        promptStrength: activePrompt?.strength ?? null,
        promptTemperature: activePrompt?.temperature ?? null,
        promptMaxTokens: activePrompt?.maxTokens ?? null,
        promptVersion: activePrompt?.version || 0,
        promptId: activePrompt?.id || null,
      };
    });
  } catch (err) {
    logger.error('[PipelineRunner] Failed to load all pipelines', { error: err });
    return [];
  }
}
