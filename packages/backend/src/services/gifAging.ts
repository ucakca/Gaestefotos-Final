/**
 * Aging GIF Service
 * 
 * Generates a 4-frame animated GIF showing aging progression:
 * Frame 1: ~30 years (subtle aging)
 * Frame 2: ~50 years (moderate aging)
 * Frame 3: ~70 years (significant aging)
 * Frame 4: ~90 years (heavy aging)
 * 
 * Uses style transfer with aging-specific prompts at increasing strengths.
 */

import { logger } from '../utils/logger';
import { storageService } from './storage';
import axios from 'axios';

// Graceful imports
let sharp: any;
let GIFEncoder: any;
let createCanvas: any;
let loadImage: any;

try { sharp = require('sharp'); } catch { /* sharp not available */ }
try {
  GIFEncoder = require('gif-encoder-2');
  const canvasMod = require('canvas');
  createCanvas = canvasMod.createCanvas;
  loadImage = canvasMod.loadImage;
} catch { /* canvas/gif not available */ }

// ─── Types ──────────────────────────────────────────────────

export interface GifAgingRequest {
  photoId: string;
  eventId: string;
  frameDelay?: number;     // ms per frame (default: 1200)
  width?: number;          // output width (default: 512)
}

export interface GifAgingResult {
  gifUrl: string;
  frames: number;
  durationMs: number;
}

// ─── Aging Frame Definitions ────────────────────────────────

const AGING_FRAMES = [
  {
    label: '~30 Jahre',
    prompt: 'same person aged to 30 years old, subtle aging, slight smile lines, youthful but mature, photorealistic portrait',
    negativePrompt: 'cartoon, painting, distorted, deformed, blurry',
    strength: 0.40,
  },
  {
    label: '~50 Jahre',
    prompt: 'same person aged to 50 years old, visible wrinkles around eyes and forehead, greying hair, mature face, photorealistic portrait',
    negativePrompt: 'cartoon, painting, distorted, deformed, blurry, young',
    strength: 0.55,
  },
  {
    label: '~70 Jahre',
    prompt: 'same person aged to 70 years old, deep wrinkles, grey white hair, age spots, wise elderly face, photorealistic portrait',
    negativePrompt: 'cartoon, painting, distorted, deformed, blurry, young, smooth skin',
    strength: 0.65,
  },
  {
    label: '~90 Jahre',
    prompt: 'same person aged to 90 years old, very elderly, heavily wrinkled skin, white thin hair, age spots, very old face, photorealistic portrait',
    negativePrompt: 'cartoon, painting, distorted, deformed, blurry, young, middle aged',
    strength: 0.75,
  },
];

// ─── Core ───────────────────────────────────────────────────

export async function createGifAging(request: GifAgingRequest): Promise<GifAgingResult> {
  const t0 = Date.now();

  if (!GIFEncoder || !createCanvas || !loadImage) {
    throw new Error('GIF-Encoder oder Canvas nicht verfügbar');
  }
  if (!sharp) {
    throw new Error('Sharp nicht verfügbar');
  }

  const { photoId, eventId, frameDelay = 1200, width = 512 } = request;

  logger.info('[GifAging] Starting', { photoId, width, frames: AGING_FRAMES.length });

  // Import executeStyleTransfer dynamically to avoid circular deps
  const { executeStyleTransfer } = await import('./styleTransfer');

  // Generate all 4 aging frames in parallel (2 at a time to avoid overloading)
  const agingResults: Array<{ outputUrl: string }> = [];

  // Batch 1: frames 0+1
  const [frame0, frame1] = await Promise.all([
    executeStyleTransfer({
      photoId,
      eventId,
      style: 'oil-painting', // placeholder style key — prompt override below
      prompt: AGING_FRAMES[0].prompt,
      strength: AGING_FRAMES[0].strength,
    }).catch(err => {
      logger.warn('[GifAging] Frame 0 failed, using fallback', { error: err.message });
      return null;
    }),
    executeStyleTransfer({
      photoId,
      eventId,
      style: 'oil-painting',
      prompt: AGING_FRAMES[1].prompt,
      strength: AGING_FRAMES[1].strength,
    }).catch(err => {
      logger.warn('[GifAging] Frame 1 failed, using fallback', { error: err.message });
      return null;
    }),
  ]);

  // Batch 2: frames 2+3
  const [frame2, frame3] = await Promise.all([
    executeStyleTransfer({
      photoId,
      eventId,
      style: 'oil-painting',
      prompt: AGING_FRAMES[2].prompt,
      strength: AGING_FRAMES[2].strength,
    }).catch(err => {
      logger.warn('[GifAging] Frame 2 failed, using fallback', { error: err.message });
      return null;
    }),
    executeStyleTransfer({
      photoId,
      eventId,
      style: 'oil-painting',
      prompt: AGING_FRAMES[3].prompt,
      strength: AGING_FRAMES[3].strength,
    }).catch(err => {
      logger.warn('[GifAging] Frame 3 failed, using fallback', { error: err.message });
      return null;
    }),
  ]);

  const allFrames = [frame0, frame1, frame2, frame3];
  const validFrames = allFrames.filter(f => f !== null) as Array<{ outputUrl: string }>;

  if (validFrames.length < 2) {
    throw new Error('Zu wenige Frames generiert — mindestens 2 benötigt');
  }

  logger.info('[GifAging] Style transfers complete', { validFrames: validFrames.length });

  // Fetch original photo for the first frame
  const prisma = (await import('../config/database')).default;
  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) throw new Error('Foto nicht gefunden');

  const originalUrl = await storageService.getFileUrl(photo.storagePathThumb || photo.storagePath || '');

  // Fetch and resize all images: original + aging frames
  const urls = [originalUrl, ...validFrames.map(f => f.outputUrl)];
  const imageBuffers = await Promise.all(
    urls.map(url => fetchAndResize(url, width))
  );

  // Load images into canvas
  const images = await Promise.all(imageBuffers.map(buf => loadImage(buf)));

  // Use consistent dimensions
  const height = Math.round(width * (images[0].height / images[0].width));

  // Encode as animated GIF: original → age30 → age50 → age70 → age90 → age70 → age50 → age30 → original (bounce)
  const encoder = new GIFEncoder(width, height, 'neuquant', true);
  encoder.setDelay(frameDelay);
  encoder.setRepeat(0); // loop forever
  encoder.setQuality(10);
  encoder.start();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Forward + reverse (bounce effect)
  const frameSequence = [...images, ...images.slice(1, -1).reverse()];

  for (const img of frameSequence) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();

  logger.info('[GifAging] GIF encoded', {
    frames: frameSequence.length,
    size: `${Math.round(gifBuffer.length / 1024)}KB`,
  });

  // Upload GIF to storage
  const storageKey = await storageService.uploadFile(
    eventId,
    `gif-aging-${photoId}.gif`,
    gifBuffer,
    'image/gif',
  );
  const gifUrl = await storageService.getFileUrl(storageKey);

  const durationMs = Date.now() - t0;
  logger.info('[GifAging] Complete', { durationMs, gifUrl });

  return {
    gifUrl,
    frames: frameSequence.length,
    durationMs,
  };
}

// ─── Helpers ────────────────────────────────────────────────

async function fetchAndResize(url: string, targetWidth: number): Promise<Buffer> {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
  const raw = Buffer.from(res.data);

  if (!sharp) return raw;

  return sharp(raw)
    .resize(targetWidth, null, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}
