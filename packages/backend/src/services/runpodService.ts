/**
 * RunPod Serverless Service
 * 
 * Submits ComfyUI workflow jobs to RunPod serverless endpoints
 * and polls for results. Used for GPU-intensive AI tasks like
 * Face Swap, Style Transfer, Upscaling, Video generation.
 * 
 * Requires:
 *   RUNPOD_API_KEY     — RunPod API key
 *   RUNPOD_ENDPOINT_ID — Serverless endpoint ID for ComfyUI worker
 */

import { logger } from '../utils/logger';

const RUNPOD_API_URL = 'https://api.runpod.ai/v2';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max

interface RunPodJobInput {
  workflow: Record<string, any>;
  images?: Record<string, string>; // name → base64 or URL
}

interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  output?: any;
  error?: string;
  executionTime?: number;
}

function getConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  return { apiKey, endpointId };
}

function isConfigured(): boolean {
  const { apiKey, endpointId } = getConfig();
  return !!(apiKey && endpointId);
}

/**
 * Submit a job to RunPod serverless endpoint
 */
async function submitJob(input: RunPodJobInput): Promise<{ jobId: string } | null> {
  const { apiKey, endpointId } = getConfig();
  if (!apiKey || !endpointId) {
    logger.warn('RunPod not configured (missing RUNPOD_API_KEY or RUNPOD_ENDPOINT_ID)');
    return null;
  }

  try {
    const res = await fetch(`${RUNPOD_API_URL}/${endpointId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error('RunPod submit failed', { status: res.status, body: text.slice(0, 500) });
      return null;
    }

    const data = (await res.json()) as { id: string; status: string };
    logger.info('RunPod job submitted', { jobId: data.id, status: data.status });
    return { jobId: data.id };
  } catch (err: any) {
    logger.error('RunPod submit error', { error: err.message });
    return null;
  }
}

/**
 * Check the status of a RunPod job
 */
async function checkJobStatus(jobId: string): Promise<RunPodJobResponse | null> {
  const { apiKey, endpointId } = getConfig();
  if (!apiKey || !endpointId) return null;

  try {
    const res = await fetch(`${RUNPOD_API_URL}/${endpointId}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error('RunPod status check failed', { jobId, status: res.status, body: text.slice(0, 500) });
      return null;
    }

    return (await res.json()) as RunPodJobResponse;
  } catch (err: any) {
    logger.error('RunPod status check error', { jobId, error: err.message });
    return null;
  }
}

/**
 * Cancel a RunPod job
 */
async function cancelJob(jobId: string): Promise<boolean> {
  const { apiKey, endpointId } = getConfig();
  if (!apiKey || !endpointId) return false;

  try {
    const res = await fetch(`${RUNPOD_API_URL}/${endpointId}/cancel/${jobId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return res.ok;
  } catch (err: any) {
    logger.error('RunPod cancel error', { jobId, error: err.message });
    return false;
  }
}

/**
 * Submit and poll until completion (blocking)
 * Use for synchronous flows where the caller can wait.
 */
async function submitAndWait(input: RunPodJobInput, timeoutMs = 360000): Promise<RunPodJobResponse | null> {
  const submitted = await submitJob(input);
  if (!submitted) return null;

  const deadline = Date.now() + timeoutMs;
  let attempts = 0;

  while (Date.now() < deadline && attempts < MAX_POLL_ATTEMPTS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    attempts++;

    const status = await checkJobStatus(submitted.jobId);
    if (!status) continue;

    if (status.status === 'COMPLETED' || status.status === 'FAILED' || status.status === 'TIMED_OUT' || status.status === 'CANCELLED') {
      return status;
    }
  }

  logger.warn('RunPod job timed out', { jobId: submitted.jobId, attempts });
  return { id: submitted.jobId, status: 'TIMED_OUT' };
}

export const runpodService = {
  isConfigured,
  submitJob,
  checkJobStatus,
  cancelJob,
  submitAndWait,
};
