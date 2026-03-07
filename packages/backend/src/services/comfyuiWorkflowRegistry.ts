/**
 * ComfyUI Workflow Registry
 * 
 * Maps each style effect to its own dedicated ComfyUI workflow JSON.
 * Workflows are stored as JSON files in /workflows/ directory.
 * 
 * Flow:
 *   1. User designs workflow in ComfyUI Node Editor
 *   2. Exports as "Save (API Format)" → JSON file
 *   3. JSON saved to /workflows/{effect_name}.json
 *   4. This registry loads it and injects the input image + parameters
 *   5. Sends the complete workflow to RunPod Serverless
 * 
 * Placeholder convention in workflow JSONs:
 *   - "{{INPUT_IMAGE}}"   → replaced with uploaded image filename
 *   - "{{PROMPT}}"        → replaced with style prompt
 *   - "{{NEG_PROMPT}}"    → replaced with negative prompt
 *   - "{{STRENGTH}}"      → replaced with denoise strength (0.0-1.0)
 *   - "{{SEED}}"          → replaced with random seed
 *   - "{{STEPS}}"         → replaced with step count
 *   - "{{WIDTH}}"         → replaced with output width
 *   - "{{HEIGHT}}"        → replaced with output height
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { runpodService } from './runpodService';
import { StyleEffect } from './aiStyleEffects';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkflowParams {
  prompt?: string;
  negativePrompt?: string;
  strength?: number;
  steps?: number;
  seed?: number;
  width?: number;
  height?: number;
}

interface WorkflowRegistryEntry {
  effectName: string;
  workflowJson: Record<string, any>;
  loadedFrom: string;
  loadedAt: Date;
}

// ─── Workflow Storage ───────────────────────────────────────────────────────

const WORKFLOW_DIR = path.join(__dirname, '..', 'workflows');
const workflowCache = new Map<string, WorkflowRegistryEntry>();

/**
 * Load a workflow JSON file for a given effect.
 * Looks for: /workflows/{effect}.json
 */
function loadWorkflowFromFile(effect: string): Record<string, any> | null {
  const filePath = path.join(WORKFLOW_DIR, `${effect}.json`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(raw);
    logger.info(`[WorkflowRegistry] Loaded custom workflow for "${effect}" from ${filePath}`);
    return workflow;
  } catch (err) {
    logger.error(`[WorkflowRegistry] Failed to parse workflow file ${filePath}`, { error: err });
    return null;
  }
}

/**
 * Get the workflow for a specific effect.
 * Returns cached version if available, otherwise loads from file.
 * Returns null if no custom workflow exists for this effect.
 */
export function getWorkflowForEffect(effect: string): Record<string, any> | null {
  // Check cache first (invalidate after 60s to allow hot-reload)
  const cached = workflowCache.get(effect);
  if (cached && (Date.now() - cached.loadedAt.getTime()) < 60_000) {
    return JSON.parse(JSON.stringify(cached.workflowJson)); // deep clone
  }

  const workflow = loadWorkflowFromFile(effect);
  if (workflow) {
    workflowCache.set(effect, {
      effectName: effect,
      workflowJson: workflow,
      loadedFrom: path.join(WORKFLOW_DIR, `${effect}.json`),
      loadedAt: new Date(),
    });
    return JSON.parse(JSON.stringify(workflow)); // deep clone
  }

  return null;
}

/**
 * Check which effects have custom workflows available.
 */
export function listAvailableWorkflows(): string[] {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    return [];
  }

  return fs.readdirSync(WORKFLOW_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}

/**
 * Save a workflow JSON for an effect (e.g. from admin API upload).
 */
export function saveWorkflowForEffect(effect: string, workflowJson: Record<string, any>): void {
  if (!fs.existsSync(WORKFLOW_DIR)) {
    fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
  }

  const filePath = path.join(WORKFLOW_DIR, `${effect}.json`);
  fs.writeFileSync(filePath, JSON.stringify(workflowJson, null, 2), 'utf-8');

  // Invalidate cache
  workflowCache.delete(effect);

  logger.info(`[WorkflowRegistry] Saved custom workflow for "${effect}" to ${filePath}`);
}

/**
 * Delete a custom workflow for an effect (falls back to generic).
 */
export function deleteWorkflowForEffect(effect: string): boolean {
  const filePath = path.join(WORKFLOW_DIR, `${effect}.json`);
  workflowCache.delete(effect);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.info(`[WorkflowRegistry] Deleted custom workflow for "${effect}"`);
    return true;
  }
  return false;
}

// ─── Placeholder Injection ──────────────────────────────────────────────────

/**
 * Inject parameters into a workflow JSON.
 * 1. Replaces {{PLACEHOLDER}} strings with actual values
 * 2. Randomizes seed values in KSampler/SamplerCustom nodes
 */
function injectParams(workflow: Record<string, any>, params: WorkflowParams): Record<string, any> {
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);
  
  const replacements: Record<string, any> = {
    '{{PROMPT}}': params.prompt || '',
    '{{NEG_PROMPT}}': params.negativePrompt || '',
    '{{STRENGTH}}': params.strength ?? 0.65,
    '{{SEED}}': seed,
    '{{STEPS}}': params.steps ?? 28,
    '{{WIDTH}}': params.width ?? 1024,
    '{{HEIGHT}}': params.height ?? 1024,
    '{{INPUT_IMAGE}}': 'input_image.png',
  };

  const result = deepReplace(workflow, replacements);

  // Randomize seed in all KSampler/SamplerCustom nodes
  for (const [nodeId, node] of Object.entries(result)) {
    const n = node as any;
    if (n?.inputs?.seed !== undefined && 
        (n.class_type === 'KSampler' || n.class_type === 'SamplerCustom' || 
         n.class_type === 'KSamplerAdvanced')) {
      n.inputs.seed = seed;
    }
    // Also randomize noise_seed in SamplerCustom
    if (n?.inputs?.noise_seed !== undefined) {
      n.inputs.noise_seed = seed;
    }
  }

  return result;
}

function deepReplace(obj: any, replacements: Record<string, any>): any {
  if (typeof obj === 'string') {
    // Exact match → replace with typed value (number, etc.)
    if (replacements[obj] !== undefined) {
      return replacements[obj];
    }
    // Partial match → string interpolation
    let result = obj;
    for (const [placeholder, value] of Object.entries(replacements)) {
      if (result.includes(placeholder)) {
        result = result.replace(placeholder, String(value));
      }
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepReplace(item, replacements));
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepReplace(value, replacements);
    }
    return result;
  }

  return obj;
}

// ─── Main Execution ─────────────────────────────────────────────────────────

/**
 * Execute a custom workflow for a style effect.
 * 
 * 1. Loads the workflow JSON for the effect
 * 2. Injects parameters (prompt, strength, seed, etc.)
 * 3. Sends to RunPod with the input image
 * 4. Returns the output image as Buffer
 * 
 * Returns null if no custom workflow exists (caller should fall back to generic).
 */
export async function executeCustomWorkflow(
  effect: StyleEffect,
  imageBuffer: Buffer,
  params: WorkflowParams,
): Promise<Buffer | null> {
  const workflow = getWorkflowForEffect(effect);

  if (!workflow) {
    return null; // No custom workflow → caller uses generic fallback
  }

  if (!runpodService.isConfigured()) {
    throw new Error('RunPod nicht konfiguriert (RUNPOD_API_KEY / RUNPOD_ENDPOINT_ID fehlt)');
  }

  // Inject parameters into workflow
  const finalWorkflow = injectParams(workflow, params);

  // Prepare image payload (worker-comfyui v5.x format)
  const imagePayload = [{
    name: 'input_image.png',
    image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
  }];

  logger.info(`[WorkflowRegistry] Executing custom workflow for "${effect}"`, {
    nodeCount: Object.keys(finalWorkflow).length,
    prompt: (params.prompt || '').slice(0, 80),
    strength: params.strength,
  });

  const result = await runpodService.submitAndWait(
    { workflow: finalWorkflow, images: imagePayload },
    360_000,
  );

  if (!result) {
    throw new Error(`RunPod: Keine Antwort für Workflow "${effect}"`);
  }

  if (result.status === 'FAILED') {
    throw new Error(`RunPod Workflow "${effect}" fehlgeschlagen: ${result.error || 'unbekannter Fehler'}`);
  }

  if (result.status === 'TIMED_OUT') {
    throw new Error(`RunPod Workflow "${effect}" Timeout`);
  }

  if (result.status !== 'COMPLETED' || !result.output) {
    throw new Error(`RunPod Workflow "${effect}" Status: ${result.status}`);
  }

  const { buffer: outputData } = await runpodService.extractOutputBuffer(result.output);

  if (!outputData || outputData.length === 0) {
    logger.error(`[WorkflowRegistry] Unknown output format for "${effect}"`, {
      outputKeys: Object.keys(result.output),
    });
    throw new Error(`RunPod Workflow "${effect}": Output-Format nicht erkannt`);
  }

  logger.info(`[WorkflowRegistry] Workflow "${effect}" erfolgreich`, {
    outputSize: outputData.length,
    executionTime: result.executionTime,
  });

  return outputData;
}

/**
 * Execute the Qwen Image Edit face/head swap workflow.
 * Uses face_swap.json workflow with 2 images:
 *   - bodyImage: target person (keep body, lighting, background)
 *   - faceImage: source face (head to transplant)
 * 
 * Returns the output image as Buffer, or null if no face_swap workflow exists.
 */
export async function executeFaceSwapWorkflow(
  bodyImage: Buffer,
  faceImage: Buffer,
): Promise<Buffer | null> {
  const workflow = getWorkflowForEffect('face_swap');

  if (!workflow) {
    return null;
  }

  if (!runpodService.isConfigured()) {
    throw new Error('RunPod nicht konfiguriert (RUNPOD_API_KEY / RUNPOD_ENDPOINT_ID fehlt)');
  }

  // Randomize seed
  const seed = Math.floor(Math.random() * 2147483647);
  for (const [_nodeId, node] of Object.entries(workflow)) {
    const n = node as any;
    if (n?.inputs?.seed !== undefined) {
      n.inputs.seed = seed;
    }
  }

  // 2 images: body reference + face reference
  const imagePayload = [
    {
      name: 'input_image.png',
      image: `data:image/png;base64,${bodyImage.toString('base64')}`,
    },
    {
      name: 'face_image.png',
      image: `data:image/png;base64,${faceImage.toString('base64')}`,
    },
  ];

  logger.info('[WorkflowRegistry] Executing face swap workflow (Qwen Image Edit)', {
    bodySize: bodyImage.length,
    faceSize: faceImage.length,
  });

  const result = await runpodService.submitAndWait(
    { workflow, images: imagePayload },
    360_000,
  );

  if (!result) {
    throw new Error('RunPod: Keine Antwort für Face-Swap Workflow');
  }

  if (result.status === 'FAILED') {
    throw new Error(`RunPod Face-Swap fehlgeschlagen: ${result.error || 'unbekannter Fehler'}`);
  }

  if (result.status !== 'COMPLETED' || !result.output) {
    throw new Error(`RunPod Face-Swap Status: ${result.status}`);
  }

  const { buffer: outputData } = await runpodService.extractOutputBuffer(result.output);

  if (!outputData || outputData.length === 0) {
    logger.error('[WorkflowRegistry] Unknown output format for face_swap', {
      outputKeys: Object.keys(result.output),
    });
    throw new Error('RunPod Face-Swap: Output-Format nicht erkannt');
  }

  return outputData;
}
