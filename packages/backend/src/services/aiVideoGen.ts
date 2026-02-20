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

  // Get photo URL
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error('Foto nicht gefunden');

  const imageUrl = photo.url || await storageService.getFileUrl(photo.storagePath);

  // Try Runway first, then LumaAI
  const provider = await resolveProvider('ai_video');
  if (!provider) throw new Error('Kein Video-Provider konfiguriert');

  videoJobs.set(jobId, { id: jobId, status: 'processing' });

  try {
    let resultUrl: string;

    if (provider.slug.includes('runway') || provider.slug.includes('Runway')) {
      resultUrl = await generateWithRunway(provider, imageUrl, prompt, duration);
    } else if (provider.slug.includes('luma') || provider.slug.includes('Luma')) {
      resultUrl = await generateWithLuma(provider, imageUrl, prompt, duration);
    } else {
      // Try Runway-style API as default for VIDEO_GEN
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

// ─── Helpers ────────────────────────────────────────────────

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
  return Buffer.from(res.data);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
