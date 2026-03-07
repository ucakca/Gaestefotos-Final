/**
 * AI Image-to-Video Service
 * 
 * Generates short video clips from a single photo using:
 * - Runway (gen4_turbo) — primary
 * - LumaAI (ray2) — fallback
 * 
 * Flow: Upload photo → Start generation → Poll for completion → Download & store result
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { resolveProvider, ResolvedProvider } from './aiExecution';
import { storageService } from './storage';
import prisma from '../config/database';

// ─── Types ──────────────────────────────────────────────────

export interface ImageToVideoRequest {
  photoId: string;
  eventId: string;
  prompt?: string;        // optional motion prompt (e.g. "camera slowly zooms in")
  duration?: number;       // 5 or 10 seconds (default: 5)
}

export interface ImageToVideoResult {
  videoUrl: string;
  provider: string;
  durationMs: number;
  videoDuration: number;
}

interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

// ─── In-memory job tracking ─────────────────────────────────

const videoJobs = new Map<string, VideoJob>();

export function getVideoJobStatus(jobId: string): VideoJob | null {
  return videoJobs.get(jobId) || null;
}

// ─── Main Function ──────────────────────────────────────────

export async function generateImageToVideo(request: ImageToVideoRequest): Promise<string> {
  const { photoId, eventId, prompt, duration = 5 } = request;
  const jobId = `ai-video-${photoId}-${Date.now()}`;

  videoJobs.set(jobId, { id: jobId, status: 'pending' });

  // Get photo and convert to base64 data URI (localhost URLs aren't accessible from external APIs)
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error('Foto nicht gefunden');

  const photoBuffer = await storageService.getFile(photo.storagePath || '');
  const imageUrl = `data:image/jpeg;base64,${photoBuffer.toString('base64')}`;

  // Try Runway first, then LumaAI
  const provider = await resolveProvider('ai_video');
  if (!provider) throw new Error('Kein Video-Provider konfiguriert');

  videoJobs.set(jobId, { id: jobId, status: 'processing' });

  try {
    let resultUrl: string;

    if (provider.slug.includes('runpod') || provider.slug.includes('comfyui')) {
      resultUrl = await generateWithRunPod(photoBuffer, prompt, duration);
    } else if (provider.slug.includes('fal')) {
      resultUrl = await generateWithFal(provider, imageUrl, prompt, duration);
    } else if (provider.slug.includes('runway') || provider.slug.includes('Runway')) {
      resultUrl = await generateWithRunway(provider, imageUrl, prompt, duration);
    } else if (provider.slug.includes('luma') || provider.slug.includes('Luma')) {
      resultUrl = await generateWithLuma(provider, imageUrl, prompt, duration);
    } else {
      // Default: try Runway
      resultUrl = await generateWithRunway(provider, imageUrl, prompt, duration);
    }

    // Download and store in our storage
    const videoBuffer = await downloadVideo(resultUrl);
    const storageKey = await storageService.uploadFile(
      eventId,
      `ai-video-${photoId}.mp4`,
      videoBuffer,
      'video/mp4',
    );
    const finalUrl = await storageService.getFileUrl(storageKey);

    videoJobs.set(jobId, { id: jobId, status: 'completed', videoUrl: finalUrl });
    return jobId;

  } catch (error) {
    const msg = (error as Error).message;
    logger.error('[AiVideoGen] Failed', { jobId, error: msg });
    videoJobs.set(jobId, { id: jobId, status: 'failed', error: msg });
    throw error;
  }
}

// ─── Runway API ─────────────────────────────────────────────

async function generateWithRunway(
  provider: ResolvedProvider,
  imageUrl: string,
  prompt?: string,
  duration: number = 5,
): Promise<string> {
  const baseUrl = provider.baseUrl || 'https://api.dev.runwayml.com/v1';
  const model = provider.model || 'gen4_turbo';

  logger.info('[AiVideoGen] Starting Runway generation', { model, duration });

  // 1. Start generation task
  const createRes = await axios.post(
    `${baseUrl}/image_to_video`,
    {
      model,
      promptImage: imageUrl,
      promptText: prompt || 'gentle camera movement, cinematic',
      duration,
      watermark: false,
    },
    {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      timeout: 30000,
    }
  );

  const taskId = createRes.data?.id;
  if (!taskId) throw new Error('Runway: Keine Task-ID erhalten');

  logger.info('[AiVideoGen] Runway task created', { taskId });

  // 2. Poll for completion (max 5 min)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const statusRes = await axios.get(
      `${baseUrl}/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
        timeout: 10000,
      }
    );

    const status = statusRes.data?.status;
    logger.info('[AiVideoGen] Runway poll', { taskId, status, attempt: i + 1 });

    if (status === 'SUCCEEDED') {
      const outputUrl = statusRes.data?.output?.[0];
      if (!outputUrl) throw new Error('Runway: Kein Output-Video');
      return outputUrl;
    }

    if (status === 'FAILED') {
      throw new Error(`Runway: Task fehlgeschlagen — ${statusRes.data?.failure || 'Unbekannt'}`);
    }

    // THROTTLED, RUNNING, PENDING → continue polling
  }

  throw new Error('Runway: Timeout nach 5 Minuten');
}

// ─── LumaAI API ─────────────────────────────────────────────

async function generateWithLuma(
  provider: ResolvedProvider,
  imageUrl: string,
  prompt?: string,
  duration: number = 5,
): Promise<string> {
  const baseUrl = provider.baseUrl || 'https://api.lumalabs.ai/dream-machine/v1';
  const model = provider.model || 'ray2';

  logger.info('[AiVideoGen] Starting LumaAI generation', { model, duration });

  // 1. Create generation
  const createRes = await axios.post(
    `${baseUrl}/generations`,
    {
      prompt: prompt || 'gentle camera movement, cinematic lighting',
      model,
      image_ref: {
        url: imageUrl,
        weight: 0.85,
      },
      duration: `${duration}s`,
      aspect_ratio: '16:9',
    },
    {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const generationId = createRes.data?.id;
  if (!generationId) throw new Error('LumaAI: Keine Generation-ID erhalten');

  logger.info('[AiVideoGen] LumaAI generation created', { generationId });

  // 2. Poll for completion (max 5 min)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000);

    const statusRes = await axios.get(
      `${baseUrl}/generations/${generationId}`,
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        timeout: 10000,
      }
    );

    const state = statusRes.data?.state;
    logger.info('[AiVideoGen] LumaAI poll', { generationId, state, attempt: i + 1 });

    if (state === 'completed') {
      const videoUrl = statusRes.data?.assets?.video;
      if (!videoUrl) throw new Error('LumaAI: Kein Output-Video');
      return videoUrl;
    }

    if (state === 'failed') {
      throw new Error(`LumaAI: Generation fehlgeschlagen — ${statusRes.data?.failure_reason || 'Unbekannt'}`);
    }
  }

  throw new Error('LumaAI: Timeout nach 5 Minuten');
}


// ─── RunPod EU: WAN 2.1 via ComfyUI (DSGVO-compliant) ──────────────────────

async function generateWithRunPod(
  imageBuffer: Buffer, prompt?: string, duration: number = 5,
): Promise<string> {
  const { runWanI2V } = await import('./comfyuiWorkflows');
  logger.info('[AiVideoGen] Starting RunPod EU WAN 2.1 video', { duration });
  const videoBuffer = await runWanI2V(imageBuffer, {
    prompt: prompt || 'gentle cinematic camera movement, subtle animation, high quality',
    duration,
  });
  // Save to temp storage and return URL
  const storageKey = await storageService.uploadFile(
    'ai-temp',
    `wan-video-${Date.now()}.webp`,
    videoBuffer,
    'video/webp',
  );
  const url = await storageService.getFileUrl(storageKey, 7200);
  logger.info('[AiVideoGen] RunPod EU WAN 2.1 completed', { size: videoBuffer.length });
  return url;
}

// ─── FAL.ai Video Models (Seedance, Kling, Wan, Vidu, Hailuo) ──────────────

const FAL_VIDEO_MODELS: Record<string, { model: string; label: string; tier: 'fast' | 'standard' | 'premium' }> = {
  seedance: { model: 'fal-ai/seedance/image-to-video', label: 'Seedance (schnell)', tier: 'fast' },
  kling:    { model: 'fal-ai/kling-video/v2.1/image-to-video', label: 'Kling 2.1 (Premium)', tier: 'premium' },
  wan:      { model: 'fal-ai/wan/v2.1/image-to-video', label: 'Wan 2.1', tier: 'standard' },
  vidu:     { model: 'fal-ai/vidu/image-to-video', label: 'Vidu (schnell)', tier: 'fast' },
  hailuo:   { model: 'fal-ai/hailuo/image-to-video', label: 'Hailuo MiniMax', tier: 'standard' },
};

export function getAvailableVideoModels() {
  return Object.entries(FAL_VIDEO_MODELS).map(([key, val]) => ({
    key, model: val.model, label: val.label, tier: val.tier,
  }));
}

async function generateWithFal(
  provider: ResolvedProvider, imageUrl: string, prompt?: string, duration: number = 5,
): Promise<string> {
  const apiKey = provider.apiKey;
  if (!apiKey) throw new Error('FAL.ai: Kein API-Key');
  let model = provider.model || 'fal-ai/wan-i2v';
  const shortcut = Object.keys(FAL_VIDEO_MODELS).find(k => model.toLowerCase().includes(k));
  if (shortcut && !model.includes('/')) model = FAL_VIDEO_MODELS[shortcut].model;
  const motionPrompt = prompt || 'gentle cinematic camera movement, subtle animation';
  logger.info('[AiVideoGen] Starting FAL.ai video', { model, duration });
  const queueUrl = `https://queue.fal.run/${model}`;
  const submitRes = await fetch(queueUrl, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, prompt: motionPrompt, duration: String(duration), aspect_ratio: '16:9' }),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text();
    throw new Error(`FAL video submit error ${submitRes.status}: ${errBody.slice(0, 200)}`);
  }
  const submitData = await submitRes.json() as any;
  const request_id = submitData.request_id;
  const statusUrl = submitData.status_url;
  const responseUrl = submitData.response_url;
  if (!request_id || !statusUrl) throw new Error('FAL: Keine request_id oder status_url');
  logger.info('[AiVideoGen] FAL queued', { request_id, model, statusUrl });
  const maxWait = 600000; const pollStart = Date.now();
  while (Date.now() - pollStart < maxWait) {
    await sleep(5000);
    const sRes = await fetch(statusUrl, { headers: { Authorization: `Key ${apiKey}` } });
    const sText = await sRes.text();
    let sData: any;
    try { sData = JSON.parse(sText); } catch {
      logger.warn('[AiVideoGen] FAL status non-JSON', { body: sText.slice(0, 200) });
      continue;
    }
    logger.info('[AiVideoGen] FAL poll', { request_id, status: sData.status });
    if (sData.status === 'COMPLETED') break;
    if (sData.status === 'FAILED') throw new Error(`FAL video failed: ${JSON.stringify(sData.error || sData).slice(0, 200)}`);
  }
  if (Date.now() - pollStart >= maxWait) throw new Error('FAL video timeout');
  const rRes = await fetch(responseUrl || `https://queue.fal.run/fal-ai/wan/requests/${request_id}`, {
    headers: { Authorization: `Key ${apiKey}` },
  });
  const rText = await rRes.text();
  let rData: any;
  try { rData = JSON.parse(rText); } catch {
    throw new Error(`FAL result parse error: ${rText.slice(0, 200)}`);
  }
  const videoUrl = rData?.video?.url || rData?.output?.video?.url || (Array.isArray(rData?.videos) && rData.videos[0]?.url) || '';
  if (!videoUrl) {
    logger.warn('[AiVideoGen] FAL no video URL', { keys: Object.keys(rData || {}), data: JSON.stringify(rData).slice(0, 300) });
    throw new Error('FAL: Kein Video-URL');
  }
  logger.info('[AiVideoGen] FAL completed', { model, sec: Math.round((Date.now() - pollStart) / 1000) });
  return videoUrl;
}
// ─── Helpers ────────────────────────────────────────────────

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(res.data);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
