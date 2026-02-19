import { logger } from '../utils/logger';
import { executeStyleTransfer, AI_STYLES } from './styleTransfer';
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

export interface GifMorphRequest {
  photoId: string;
  eventId: string;
  styles?: string[];       // 2 style keys (default: random)
  frameDelay?: number;     // ms per frame (default: 800)
  width?: number;          // output width (default: 512)
}

export interface GifMorphResult {
  gifUrl: string;
  styles: string[];
  frames: number;
  durationMs: number;
}

// ─── Default style pairs for morph ──────────────────────────

const MORPH_PAIRS: string[][] = [
  ['cartoon', 'anime'],
  ['pop-art', 'neon-glow'],
  ['oil-painting', 'watercolor'],
  ['sketch', 'renaissance'],
  ['cyberpunk', 'neon-portrait'],
  ['ghibli', 'claymation'],
  ['comic-hero', 'pixel-art'],
  ['barbie', 'lego'],
  ['caricature', 'cartoon'],
  ['vintage', 'film-noir'],
];

function getRandomPair(): string[] {
  return MORPH_PAIRS[Math.floor(Math.random() * MORPH_PAIRS.length)];
}

// ─── Core ───────────────────────────────────────────────────

export async function createGifMorph(request: GifMorphRequest): Promise<GifMorphResult> {
  const t0 = Date.now();

  if (!GIFEncoder || !createCanvas || !loadImage) {
    throw new Error('GIF-Encoder oder Canvas nicht verfügbar');
  }
  if (!sharp) {
    throw new Error('Sharp nicht verfügbar');
  }

  const { photoId, eventId, frameDelay = 800, width = 512 } = request;
  const styles = request.styles?.length === 2 ? request.styles : getRandomPair();

  // Validate styles exist
  for (const s of styles) {
    if (!AI_STYLES[s]) throw new Error(`Unbekannter Style: ${s}`);
  }

  logger.info('[GifMorph] Starting', { photoId, styles, width });

  // 1. Generate style transfer frames in parallel
  const [frame1, frame2] = await Promise.all(
    styles.map(style =>
      executeStyleTransfer({ photoId, eventId, style })
    )
  );

  logger.info('[GifMorph] Style transfers complete', {
    frame1: frame1.durationMs,
    frame2: frame2.durationMs,
  });

  // 2. Fetch all 3 images: original + 2 styled
  const prisma = (await import('../config/database')).default;
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });
  if (!photo) throw new Error('Foto nicht gefunden');

  const originalUrl = photo.url || await storageService.getFileUrl(photo.storagePathThumb || photo.storagePath);

  const [originalBuf, frame1Buf, frame2Buf] = await Promise.all([
    fetchAndResize(originalUrl, width),
    fetchAndResize(frame1.outputUrl, width),
    fetchAndResize(frame2.outputUrl, width),
  ]);

  // 3. Load images into canvas
  const [img0, img1, img2] = await Promise.all([
    loadImage(originalBuf),
    loadImage(frame1Buf),
    loadImage(frame2Buf),
  ]);

  // Use consistent dimensions
  const height = Math.round(width * (img0.height / img0.width));

  // 4. Encode as animated GIF (5 frames: orig → style1 → style2 → style1 → orig)
  const encoder = new GIFEncoder(width, height, 'neuquant', true);
  encoder.setDelay(frameDelay);
  encoder.setRepeat(0); // loop forever
  encoder.setQuality(10);
  encoder.start();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const frames = [img0, img1, img2, img1, img0];
  for (const img of frames) {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    encoder.addFrame(ctx);
  }

  encoder.finish();
  const gifBuffer = encoder.out.getData();

  logger.info('[GifMorph] GIF encoded', {
    frames: frames.length,
    size: `${Math.round(gifBuffer.length / 1024)}KB`,
  });

  // 5. Upload GIF to storage
  const storageKey = await storageService.uploadFile(
    eventId,
    `gif-morph-${photoId}.gif`,
    gifBuffer,
    'image/gif',
  );
  const gifUrl = await storageService.getFileUrl(storageKey);

  const durationMs = Date.now() - t0;
  logger.info('[GifMorph] Complete', { durationMs, gifUrl });

  return {
    gifUrl,
    styles,
    frames: frames.length,
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
    .png()  // PNG for canvas compatibility
    .toBuffer();
}
