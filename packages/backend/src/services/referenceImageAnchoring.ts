/**
 * Reference Image Anchoring Service
 * 
 * Allows event hosts to upload a brand/sponsor image that gets
 * composited onto all AI-generated outputs for their event.
 * 
 * Modes:
 * - overlay: Brand image composited as watermark on AI output
 * - prompt: Brand description injected into AI prompts
 * - both: overlay + prompt combined
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { storageService } from './storage';

let sharp: any;
try { sharp = require('sharp'); } catch { /* sharp not available */ }

export interface ReferenceImageConfig {
  referenceImageUrl: string | null;
  referenceImageMode: 'overlay' | 'prompt' | 'both';
  referenceImagePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  referenceImageOpacity: number;
  referenceImageScale: number;
}

const configCache = new Map<string, { config: ReferenceImageConfig; ts: number }>();
const CONFIG_TTL = 5 * 60 * 1000;

export async function getReferenceImageConfig(eventId: string): Promise<ReferenceImageConfig | null> {
  const cached = configCache.get(eventId);
  if (cached && Date.now() - cached.ts < CONFIG_TTL) {
    return cached.config.referenceImageUrl ? cached.config : null;
  }

  const aiConfig = await prisma.eventAiConfig.findUnique({
    where: { eventId },
    select: {
      referenceImageUrl: true,
      referenceImageMode: true,
      referenceImagePosition: true,
      referenceImageOpacity: true,
      referenceImageScale: true,
    },
  });

  if (!aiConfig?.referenceImageUrl) {
    configCache.set(eventId, {
      config: { referenceImageUrl: null, referenceImageMode: 'overlay', referenceImagePosition: 'bottom-right', referenceImageOpacity: 0.8, referenceImageScale: 0.15 },
      ts: Date.now(),
    });
    return null;
  }

  const config: ReferenceImageConfig = {
    referenceImageUrl: aiConfig.referenceImageUrl,
    referenceImageMode: (aiConfig.referenceImageMode as any) || 'overlay',
    referenceImagePosition: (aiConfig.referenceImagePosition as any) || 'bottom-right',
    referenceImageOpacity: aiConfig.referenceImageOpacity ?? 0.8,
    referenceImageScale: aiConfig.referenceImageScale ?? 0.15,
  };

  configCache.set(eventId, { config, ts: Date.now() });
  return config;
}

export function clearReferenceImageCache(eventId: string): void {
  configCache.delete(eventId);
}

const imageBufferCache = new Map<string, { buffer: Buffer; ts: number }>();
const IMAGE_TTL = 30 * 60 * 1000;

async function getRefImageBuffer(url: string): Promise<Buffer | null> {
  const cached = imageBufferCache.get(url);
  if (cached && Date.now() - cached.ts < IMAGE_TTL) return cached.buffer;

  try {
    let buffer: Buffer;
    if (url.startsWith('http')) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch reference image: ${response.status}`);
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      buffer = await storageService.getFile(url);
    }
    imageBufferCache.set(url, { buffer, ts: Date.now() });
    return buffer;
  } catch (err: any) {
    logger.warn('[RefImage] Failed to load reference image', { url: url.slice(0, 80), error: err.message });
    return null;
  }
}

export async function applyReferenceImageOverlay(
  outputBuffer: Buffer,
  eventId: string,
): Promise<Buffer> {
  const config = await getReferenceImageConfig(eventId);
  if (!config?.referenceImageUrl) return outputBuffer;
  if (config.referenceImageMode === 'prompt') return outputBuffer;
  if (!sharp) { logger.warn('[RefImage] sharp unavailable'); return outputBuffer; }

  try {
    const refBuffer = await getRefImageBuffer(config.referenceImageUrl);
    if (!refBuffer) return outputBuffer;

    const outputMeta = await sharp(outputBuffer).metadata();
    const outW = outputMeta.width || 1920;
    const outH = outputMeta.height || 1080;
    const targetW = Math.round(outW * config.referenceImageScale);

    const refResized = await sharp(refBuffer)
      .resize(targetW, null, { fit: 'inside', withoutEnlargement: true })
      .ensureAlpha()
      .toBuffer();

    const refMeta = await sharp(refResized).metadata();
    const refW = refMeta.width || targetW;
    const refH = refMeta.height || targetW;

    const margin = Math.round(Math.min(outW, outH) * 0.02);
    let top: number, left: number;

    switch (config.referenceImagePosition) {
      case 'top-left': top = margin; left = margin; break;
      case 'top-right': top = margin; left = outW - refW - margin; break;
      case 'bottom-left': top = outH - refH - margin; left = margin; break;
      case 'center': top = Math.round((outH - refH) / 2); left = Math.round((outW - refW) / 2); break;
      case 'bottom-right': default: top = outH - refH - margin; left = outW - refW - margin; break;
    }

    const result = await sharp(outputBuffer)
      .composite([{ input: refResized, top: Math.max(0, top), left: Math.max(0, left) }])
      .jpeg({ quality: 92 })
      .toBuffer();

    logger.info('[RefImage] Overlay applied', { eventId, position: config.referenceImagePosition, scale: config.referenceImageScale });
    return result;
  } catch (err: any) {
    logger.warn('[RefImage] Failed to apply overlay', { error: err.message });
    return outputBuffer;
  }
}

export async function getReferenceImagePromptAugment(eventId: string): Promise<string | null> {
  const config = await getReferenceImageConfig(eventId);
  if (!config?.referenceImageUrl) return null;
  if (config.referenceImageMode === 'overlay') return null;
  return 'Include a subtle brand watermark or logo element in the corner of the image, maintaining the artistic style.';
}

export async function uploadReferenceImage(
  eventId: string, buffer: Buffer, filename: string, mimeType: string,
): Promise<string> {
  if (sharp) {
    const meta = await sharp(buffer).metadata();
    if ((meta.width || 0) > 2048 || (meta.height || 0) > 2048) {
      buffer = await sharp(buffer).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
    }
  }
  const storagePath = await storageService.uploadFile(eventId, `reference-image/${filename}`, buffer, mimeType);
  const url = await storageService.getFileUrl(storagePath);

  await prisma.eventAiConfig.upsert({
    where: { eventId },
    create: { eventId, referenceImageUrl: url },
    update: { referenceImageUrl: url },
  });

  clearReferenceImageCache(eventId);
  logger.info('[RefImage] Uploaded', { eventId, storagePath });
  return url;
}

export async function updateReferenceImageSettings(
  eventId: string,
  settings: Partial<Pick<ReferenceImageConfig, 'referenceImageMode' | 'referenceImagePosition' | 'referenceImageOpacity' | 'referenceImageScale'>>,
): Promise<void> {
  await prisma.eventAiConfig.upsert({
    where: { eventId },
    create: { eventId, ...settings },
    update: settings,
  });
  clearReferenceImageCache(eventId);
}

export async function removeReferenceImage(eventId: string): Promise<void> {
  await prisma.eventAiConfig.update({
    where: { eventId },
    data: { referenceImageUrl: null, referenceImageMode: 'overlay', referenceImagePosition: 'bottom-right', referenceImageOpacity: 0.8, referenceImageScale: 0.15 },
  });
  clearReferenceImageCache(eventId);
  logger.info('[RefImage] Removed', { eventId });
}
