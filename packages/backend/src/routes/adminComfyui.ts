/**
 * Admin ComfyUI Management Routes
 * 
 * Pod lifecycle: create, status, stop/delete GPU pods for ComfyUI Editor
 * Workflow sync: list, get, update ComfyUI API-format workflows
 * Endpoint health: check serverless endpoint status
 * 
 * Routes:
 *   GET    /api/admin/comfyui/status          — Endpoint health + pod status
 *   POST   /api/admin/comfyui/pod             — Create a new GPU Pod
 *   DELETE /api/admin/comfyui/pod              — Stop & delete the pod
 *   GET    /api/admin/comfyui/workflows        — List all ComfyUI workflows
 *   GET    /api/admin/comfyui/workflows/:effect — Get workflow JSON
 *   PUT    /api/admin/comfyui/workflows/:effect — Update workflow JSON
 */

import { Router, Response } from 'express';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  getWorkflowForEffect,
  listAvailableWorkflows,
  saveWorkflowForEffect,
} from '../services/comfyuiWorkflowRegistry';

const router = Router();
router.use(authMiddleware, requireRole('ADMIN'));

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || '';
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || '';
const COMFYUI_DOCKER_IMAGE = process.env.COMFYUI_DOCKER_IMAGE || 'brandboost/gaestefotos-comfyui-worker:latest';

// ─── Helper: RunPod GraphQL ─────────────────────────────────────────────────

async function runpodGraphQL(query: string): Promise<any> {
  const res = await fetch('https://api.runpod.io/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

// ─── GET /status — Endpoint health + active pod ─────────────────────────────

router.get('/status', async (_req: AuthRequest, res: Response) => {
  try {
    // 1. Serverless endpoint health
    let endpointHealth: any = null;
    if (RUNPOD_ENDPOINT_ID) {
      try {
        const healthRes = await fetch(
          `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/health`,
          { headers: { 'Authorization': `Bearer ${RUNPOD_API_KEY}` } }
        );
        endpointHealth = await healthRes.json();
      } catch (e) {
        endpointHealth = { error: 'Nicht erreichbar' };
      }
    }

    // 2. Check for active pods
    const podsResult = await runpodGraphQL(`{ myself { pods { id name desiredStatus runtime { uptimeInSeconds gpus { id } ports { ip isIpPublic privatePort publicPort type } } } } }`);
    const allPods = podsResult?.data?.myself?.pods || [];
    const comfyPods = allPods.filter((p: any) =>
      p.name?.includes('gaestefotos') || p.name?.includes('comfyui') || p.name?.includes('ComfyUI')
    );

    // 3. Get endpoint info
    const epResult = await runpodGraphQL(`{ myself { endpoints { id name template { imageName } workersMin workersMax gpuIds } } }`);
    const endpoints = epResult?.data?.myself?.endpoints || [];
    const activeEndpoint = endpoints.find((e: any) => e.id === RUNPOD_ENDPOINT_ID);

    res.json({
      endpoint: {
        id: RUNPOD_ENDPOINT_ID,
        name: activeEndpoint?.name || 'Unknown',
        image: activeEndpoint?.template?.imageName || 'Unknown',
        gpuIds: activeEndpoint?.gpuIds || 'Unknown',
        workers: activeEndpoint ? { min: activeEndpoint.workersMin, max: activeEndpoint.workersMax } : null,
        health: endpointHealth,
      },
      pod: comfyPods.length > 0 ? {
        id: comfyPods[0].id,
        name: comfyPods[0].name,
        status: comfyPods[0].desiredStatus,
        uptime: comfyPods[0].runtime?.uptimeInSeconds || 0,
        ports: comfyPods[0].runtime?.ports || [],
        editorUrl: getEditorUrl(comfyPods[0]),
      } : null,
      dockerImage: COMFYUI_DOCKER_IMAGE,
    });
  } catch (error) {
    logger.error('Failed to get ComfyUI status', { error });
    res.status(500).json({ error: 'Status-Abfrage fehlgeschlagen' });
  }
});

function getEditorUrl(pod: any): string | null {
  if (!pod?.id) return null;
  const ports = pod.runtime?.ports || [];
  const port8188 = ports.find((p: any) => p.privatePort === 8188 && p.isIpPublic);
  if (port8188) {
    return `http://${port8188.ip}:${port8188.publicPort}`;
  }
  // Fallback: RunPod proxy URL
  return `https://${pod.id}-8188.proxy.runpod.net`;
}

// ─── POST /pod — Create GPU Pod ─────────────────────────────────────────────

router.post('/pod', async (req: AuthRequest, res: Response) => {
  try {
    const { gpuType = 'AMPERE_24', name = 'gaestefotos-comfyui-editor' } = req.body || {};

    // Check if pod already exists
    const podsResult = await runpodGraphQL(`{ myself { pods { id name desiredStatus } } }`);
    const existing = (podsResult?.data?.myself?.pods || []).find((p: any) =>
      p.name?.includes('gaestefotos') || p.name?.includes('comfyui')
    );
    if (existing && existing.desiredStatus === 'RUNNING') {
      return res.status(409).json({
        error: 'Pod läuft bereits',
        pod: { id: existing.id, name: existing.name },
      });
    }

    const mutation = `mutation {
      podFindAndDeployOnDemand(input: {
        name: "${name}",
        imageName: "${COMFYUI_DOCKER_IMAGE}",
        gpuTypeId: "${gpuType}",
        gpuCount: 1,
        containerDiskInGb: 50,
        volumeInGb: 0,
        minVcpuCount: 4,
        minMemoryInGb: 16,
        ports: "8188/http,22/tcp",
        dockerArgs: "",
        env: [
          { key: "WORKFLOW_SYNC_KEY", value: "${process.env.WORKFLOW_SYNC_KEY || ''}" }
        ]
      }) {
        id name desiredStatus runtime { ports { ip isIpPublic privatePort publicPort type } }
      }
    }`;

    const result = await runpodGraphQL(mutation);

    if (result.errors) {
      logger.error('Failed to create pod', { errors: result.errors });
      return res.status(500).json({ error: result.errors[0]?.message || 'Pod-Erstellung fehlgeschlagen' });
    }

    const pod = result.data?.podFindAndDeployOnDemand;
    logger.info(`Admin created ComfyUI pod: ${pod?.id}`, { userId: req.userId });

    res.json({
      success: true,
      pod: {
        id: pod?.id,
        name: pod?.name,
        status: pod?.desiredStatus,
        editorUrl: pod ? getEditorUrl(pod) : null,
      },
      message: 'Pod wird gestartet... Editor URL wird in ~60s verfügbar.',
    });
  } catch (error) {
    logger.error('Failed to create ComfyUI pod', { error });
    res.status(500).json({ error: 'Pod-Erstellung fehlgeschlagen' });
  }
});

// ─── DELETE /pod — Stop & Delete Pod ────────────────────────────────────────

router.delete('/pod', async (req: AuthRequest, res: Response) => {
  try {
    const { podId } = req.query;

    if (!podId) {
      // Find active pod
      const podsResult = await runpodGraphQL(`{ myself { pods { id name desiredStatus } } }`);
      const pod = (podsResult?.data?.myself?.pods || []).find((p: any) =>
        p.name?.includes('gaestefotos') || p.name?.includes('comfyui')
      );
      if (!pod) {
        return res.status(404).json({ error: 'Kein aktiver Pod gefunden' });
      }
      // Terminate it
      const result = await runpodGraphQL(`mutation { podTerminate(input: { podId: "${pod.id}" }) }`);
      logger.info(`Admin terminated ComfyUI pod: ${pod.id}`, { userId: req.userId });
      return res.json({ success: true, message: `Pod ${pod.id} wird beendet...` });
    }

    const result = await runpodGraphQL(`mutation { podTerminate(input: { podId: "${podId}" }) }`);
    logger.info(`Admin terminated ComfyUI pod: ${podId}`, { userId: req.userId });
    res.json({ success: true, message: `Pod ${podId} wird beendet...` });
  } catch (error) {
    logger.error('Failed to delete pod', { error });
    res.status(500).json({ error: 'Pod-Löschung fehlgeschlagen' });
  }
});

// ─── GET /workflows — List all ComfyUI API-format workflows ─────────────────

const ALL_EFFECTS = [
  'ai_oldify', 'ai_cartoon', 'ai_style_pop', 'time_machine', 'pet_me',
  'yearbook', 'emoji_me', 'miniature', 'anime', 'watercolor',
  'oil_painting', 'sketch', 'neon_noir', 'renaissance', 'comic_book',
  'pixel_art', 'trading_card', 'face_swap',
];

const EFFECT_LABELS: Record<string, string> = {
  ai_oldify: 'Oldify (+40 Jahre)',
  ai_cartoon: 'Pixar Cartoon',
  ai_style_pop: 'Pop Art',
  time_machine: '80s Time Machine',
  pet_me: 'Tier-Avatar',
  yearbook: '90s Yearbook',
  emoji_me: 'Emoji Avatar',
  miniature: 'Tilt-Shift Miniatur',
  anime: 'Anime / Manga',
  watercolor: 'Aquarell',
  oil_painting: 'Ölgemälde',
  sketch: 'Bleistift-Sketch',
  neon_noir: 'Cyberpunk Neon Noir',
  renaissance: 'Renaissance',
  comic_book: 'Comic Book',
  pixel_art: 'Pixel Art',
  trading_card: 'Trading Card',
  face_swap: 'Face / Head Swap',
};

const EFFECT_ICONS: Record<string, string> = {
  ai_oldify: '👴', ai_cartoon: '🎬', ai_style_pop: '🎨', time_machine: '📼',
  pet_me: '🐶', yearbook: '📸', emoji_me: '😀', miniature: '🔍',
  anime: '⛩️', watercolor: '💧', oil_painting: '🖼️', sketch: '✏️',
  neon_noir: '🌃', renaissance: '🏛️', comic_book: '💥', pixel_art: '👾',
  trading_card: '🃏', face_swap: '🔄',
};

router.get('/workflows', async (_req: AuthRequest, res: Response) => {
  try {
    const available = listAvailableWorkflows();

    const workflows = ALL_EFFECTS.map(effect => {
      const workflow = getWorkflowForEffect(effect);
      return {
        effect,
        label: EFFECT_LABELS[effect] || effect,
        icon: EFFECT_ICONS[effect] || '🎯',
        hasWorkflow: available.includes(effect),
        nodeCount: workflow ? Object.keys(workflow).length : 0,
      };
    });

    res.json({ workflows, total: ALL_EFFECTS.length, available: available.length });
  } catch (error) {
    logger.error('Failed to list ComfyUI workflows', { error });
    res.status(500).json({ error: 'Fehler beim Laden der Workflows' });
  }
});

// ─── GET /workflows/:effect — Get workflow JSON ─────────────────────────────

router.get('/workflows/:effect', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;
    const workflow = getWorkflowForEffect(effect);

    if (!workflow) {
      return res.status(404).json({ error: `Kein Workflow für "${effect}"` });
    }

    res.json({ effect, workflow, nodeCount: Object.keys(workflow).length });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

// ─── PUT /workflows/:effect — Update workflow JSON ──────────────────────────

router.put('/workflows/:effect', async (req: AuthRequest, res: Response) => {
  try {
    const { effect } = req.params;
    const workflow = req.body?.workflow || req.body;

    if (!workflow || typeof workflow !== 'object' || !Object.keys(workflow).length) {
      return res.status(400).json({ error: 'Ungültiges Workflow JSON' });
    }

    saveWorkflowForEffect(effect, workflow);
    logger.info(`Admin updated ComfyUI workflow: ${effect}`, { userId: req.userId });

    res.json({
      success: true,
      effect,
      nodeCount: Object.keys(workflow).length,
      message: `Workflow "${EFFECT_LABELS[effect] || effect}" gespeichert — sofort aktiv!`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern' });
  }
});

export default router;
