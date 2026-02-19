import prisma from '../config/database';
import { logger } from '../utils/logger';
import { decryptValue } from '../utils/encryption';
import { resolvePrompt } from './promptTemplates';
import axios from 'axios';
import FormData from 'form-data';
import { storageService } from './storage';

// Graceful sharp import
let sharp: any;
try { sharp = require('sharp'); } catch { /* sharp not available */ }

export interface StyleTransferRequest {
  photoId: string;
  eventId: string;
  style: string;
  prompt?: string;
  strength?: number;
}

export interface StyleTransferResult {
  outputUrl: string;
  style: string;
  durationMs: number;
  providerId: string;
  model: string;
}

// Predefined artistic styles
export const AI_STYLES: Record<string, { name: string; prompt: string; negativePrompt?: string; strength: number }> = {
  'oil-painting': {
    name: 'Ölgemälde',
    prompt: 'oil painting style, thick brushstrokes, rich colors, classic art, museum quality',
    negativePrompt: 'photo, realistic, modern',
    strength: 0.65,
  },
  'watercolor': {
    name: 'Aquarell',
    prompt: 'watercolor painting, soft washes, flowing colors, delicate, artistic',
    negativePrompt: 'photo, sharp, digital',
    strength: 0.6,
  },
  'pop-art': {
    name: 'Pop Art',
    prompt: 'pop art style, bold colors, halftone dots, andy warhol inspired, comic book',
    negativePrompt: 'realistic, muted colors',
    strength: 0.7,
  },
  'sketch': {
    name: 'Bleistiftzeichnung',
    prompt: 'pencil sketch, detailed line drawing, crosshatching, black and white, artistic',
    negativePrompt: 'color, photo, digital',
    strength: 0.6,
  },
  'cartoon': {
    name: 'Cartoon',
    prompt: 'cartoon style, animated, bright colors, clean lines, pixar style, fun',
    negativePrompt: 'realistic, photo, dark',
    strength: 0.65,
  },
  'vintage': {
    name: 'Vintage Retro',
    prompt: 'vintage photograph, sepia tones, film grain, 1970s aesthetic, warm tones, nostalgic',
    negativePrompt: 'modern, digital, sharp',
    strength: 0.5,
  },
  'cyberpunk': {
    name: 'Cyberpunk',
    prompt: 'cyberpunk style, neon lights, futuristic, dark background, glowing edges, sci-fi',
    negativePrompt: 'natural, daylight, classic',
    strength: 0.7,
  },
  'renaissance': {
    name: 'Renaissance',
    prompt: 'renaissance painting style, classical composition, chiaroscuro lighting, da vinci inspired',
    negativePrompt: 'modern, digital, photo',
    strength: 0.65,
  },
  'anime': {
    name: 'Anime',
    prompt: 'anime style, japanese animation, big eyes, colorful, detailed background, studio ghibli',
    negativePrompt: 'realistic, photo, western',
    strength: 0.7,
  },
  'neon-glow': {
    name: 'Neon Glow',
    prompt: 'neon glow effect, dark background, vibrant neon outlines, ultraviolet, glowing',
    negativePrompt: 'daylight, natural, muted',
    strength: 0.65,
  },
  'caricature': {
    name: 'Karikatur',
    prompt: 'exaggerated caricature drawing, big head, small body, humorous, colorful, professional caricature artist style',
    negativePrompt: 'realistic, photograph, normal proportions',
    strength: 0.75,
  },
  'magazine-cover': {
    name: 'Magazine Cover',
    prompt: 'professional magazine cover photo, glamorous lighting, high fashion, vogue style, dramatic pose, editorial photography',
    negativePrompt: 'amateur, casual, low quality',
    strength: 0.55,
  },
  'comic-hero': {
    name: 'Comic Hero',
    prompt: 'marvel comic book style, bold outlines, halftone dots, dynamic pose, superhero comic panel, vibrant colors',
    negativePrompt: 'photograph, realistic, muted',
    strength: 0.70,
  },
  'lego': {
    name: 'Lego',
    prompt: 'lego minifigure version of person, plastic toy, yellow skin, simple features, lego world background',
    negativePrompt: 'realistic, photograph, detailed skin',
    strength: 0.80,
  },
  'claymation': {
    name: 'Claymation',
    prompt: 'stop motion claymation character, wallace and gromit style, plasticine texture, warm lighting',
    negativePrompt: 'photograph, realistic, digital',
    strength: 0.75,
  },
  'neon-portrait': {
    name: 'Neon Portrait',
    prompt: 'cyberpunk neon portrait, dark background, vibrant neon lights reflecting on skin, futuristic, blade runner aesthetic',
    negativePrompt: 'daylight, natural, flat lighting',
    strength: 0.65,
  },
  'barbie': {
    name: 'Barbie / Ken',
    prompt: 'barbie doll version, perfect plastic skin, glossy, pink background, toy box aesthetic, fashion doll',
    negativePrompt: 'realistic, wrinkles, natural skin',
    strength: 0.75,
  },
  'ghibli': {
    name: 'Studio Ghibli',
    prompt: 'studio ghibli anime style, miyazaki inspired, soft watercolor, dreamy atmosphere, detailed background, spirited away aesthetic',
    negativePrompt: 'realistic, photograph, dark, gritty',
    strength: 0.70,
  },
  'headshot': {
    name: 'AI Headshot',
    prompt: 'professional linkedin headshot, studio lighting, clean background, business attire, confident expression',
    negativePrompt: 'casual, blurry, dark, amateur',
    strength: 0.50,
  },
  'stained-glass': {
    name: 'Kirchenfenster',
    prompt: 'stained glass window art style, vibrant colored glass pieces, black lead lines, church window, backlit',
    negativePrompt: 'photograph, realistic, modern',
    strength: 0.75,
  },
  'ukiyo-e': {
    name: 'Ukiyo-e',
    prompt: 'ukiyo-e japanese woodblock print style, flat colors, wave patterns, traditional japanese art',
    negativePrompt: 'photograph, 3d, modern, digital',
    strength: 0.70,
  },
  'film-noir': {
    name: 'Film Noir',
    prompt: 'film noir style, black and white, dramatic shadows, 1940s detective movie, high contrast, venetian blinds lighting',
    negativePrompt: 'color, bright, modern, casual',
    strength: 0.60,
  },
  'pixel-art': {
    name: 'Pixel Art',
    prompt: '16-bit pixel art portrait, retro video game style, limited color palette, blocky pixels, nostalgic gaming aesthetic',
    negativePrompt: 'realistic, smooth, high resolution, photograph',
    strength: 0.75,
  },
};

// ── In-memory result cache (30 min TTL) ─────────────────────────────────────
const resultCache = new Map<string, { storageKey: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

function cleanCache() {
  const now = Date.now();
  for (const [k, v] of resultCache) {
    if (now - v.ts > CACHE_TTL) resultCache.delete(k);
  }
}

// ── Image preprocessing: resize to max 1024px ──────────────────────────────
async function preprocessImage(imageUrl: string): Promise<Buffer> {
  const t0 = Date.now();
  const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const dlMs = Date.now() - t0;
  const raw = Buffer.from(res.data);

  if (!sharp) {
    logger.warn('[StyleTransfer] sharp unavailable, sending full-res');
    return raw;
  }

  const t1 = Date.now();
  const buf = await sharp(raw)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  const resizeMs = Date.now() - t1;

  logger.info('[StyleTransfer] Preprocessed', {
    from: raw.length, to: buf.length,
    saved: `${Math.round((1 - buf.length / raw.length) * 100)}%`,
    dlMs, resizeMs,
  });
  return buf;
}

// Get the configured AI provider for style transfer
// Priority: 1) PromptTemplate.providerId → 2) AiFeatureMapping → 3) any active IMAGE_GEN
async function getStyleTransferProvider(promptProviderId?: string | null) {
  // 1. If the prompt template specifies a provider, use it
  if (promptProviderId) {
    const provider = await prisma.aiProvider.findUnique({
      where: { id: promptProviderId },
    });
    if (provider?.isActive) {
      return { provider, model: null };
    }
  }

  // 2. Check feature mapping
  const mapping = await prisma.aiFeatureMapping.findUnique({
    where: { feature: 'style_transfer' },
    include: { provider: true },
  });

  if (mapping?.isEnabled && mapping.provider.isActive) {
    return { provider: mapping.provider, model: mapping.model };
  }

  // 3. Fallback: find any active IMAGE_GEN provider
  const provider = await prisma.aiProvider.findFirst({
    where: { type: 'IMAGE_GEN', isActive: true },
    orderBy: { isDefault: 'desc' },
  });

  return provider ? { provider, model: null } : null;
}

// Execute style transfer via the configured provider
export async function executeStyleTransfer(request: StyleTransferRequest): Promise<StyleTransferResult> {
  const startTime = Date.now();
  const timings: Record<string, number> = {};

  // ── 1. Check cache ──
  cleanCache();
  const cacheKey = `${request.photoId}_${request.style}`;
  const cached = resultCache.get(cacheKey);
  if (cached) {
    try {
      const outputUrl = await storageService.getFileUrl(cached.storageKey, 7200);
      logger.info('[StyleTransfer] Cache hit', { cacheKey, ms: Date.now() - startTime });
      return { outputUrl, style: request.style, durationMs: Date.now() - startTime, providerId: 'cache', model: 'cache' };
    } catch {
      resultCache.delete(cacheKey);
    }
  }

  // ── 2. Parallel: photo + prompt from DB ──
  const t1 = Date.now();
  const promptFeature = `style_transfer:${request.style}`;
  const [resolvedPrompt, photo] = await Promise.all([
    resolvePrompt(promptFeature),
    prisma.photo.findUnique({ where: { id: request.photoId } }),
  ]);
  timings.dbLookup = Date.now() - t1;

  // Build style from DB prompt or fallback to hardcoded AI_STYLES
  const hardcodedStyle = AI_STYLES[request.style];
  const style = resolvedPrompt.source === 'db'
    ? {
        name: request.style,
        prompt: resolvedPrompt.userPromptTpl || hardcodedStyle?.prompt || '',
        negativePrompt: resolvedPrompt.negativePrompt || hardcodedStyle?.negativePrompt,
        strength: resolvedPrompt.strength ?? hardcodedStyle?.strength ?? 0.65,
      }
    : hardcodedStyle;

  if (!style) {
    throw new Error(`Unbekannter Style: ${request.style}`);
  }

  // Get provider (prompt-level → feature-mapping → fallback)
  const config = await getStyleTransferProvider((resolvedPrompt as any).providerId || null);
  if (!config) {
    throw new Error('Kein AI-Provider für Style Transfer konfiguriert. Bitte in Admin > AI Provider einrichten.');
  }

  const { provider, model } = config;

  logger.info('[StyleTransfer] Prompt resolved', {
    feature: promptFeature,
    source: resolvedPrompt.source,
    provider: provider.slug,
  });

  if (!photo || !photo.url) {
    throw new Error('Foto nicht gefunden');
  }

  // Decrypt API key
  let apiKey = '';
  if (provider.apiKeyEncrypted && provider.apiKeyIv && provider.apiKeyTag) {
    apiKey = decryptValue({ encrypted: provider.apiKeyEncrypted, iv: provider.apiKeyIv, tag: provider.apiKeyTag });
  }

  const effectiveModel = model || provider.defaultModel || 'stable-diffusion-xl-1024-v1-0';
  const strength = request.strength ?? style.strength;
  const finalPrompt = request.prompt
    ? `${request.prompt}, ${style.prompt}`
    : style.prompt;

  // ── 3. Preprocess image (resize to 1024px max) ──
  const t2 = Date.now();
  const imageBuffer = await preprocessImage(photo.url);
  timings.preprocess = Date.now() - t2;

  // ── 4. Call AI provider ──
  const t3 = Date.now();
  let resultBuffer: Buffer;
  const slug = provider.slug.toLowerCase();
  if (slug.includes('stability') || slug.includes('stable')) {
    resultBuffer = await callStabilityAI(apiKey, imageBuffer, finalPrompt, style.negativePrompt, strength, effectiveModel);
  } else if (slug.includes('replicate')) {
    resultBuffer = await callReplicate(apiKey, imageBuffer, finalPrompt, style.negativePrompt, strength, effectiveModel);
  } else {
    throw new Error(`Style Transfer wird für Provider "${provider.name}" nicht unterstützt. Nutze Stability AI oder Replicate.`);
  }
  timings.aiCall = Date.now() - t3;

  // ── 5. Store result to SeaweedFS ──
  const t4 = Date.now();
  const storageKey = await storageService.uploadFile(
    request.eventId,
    `ai-style-${request.style}-${request.photoId}.jpg`,
    resultBuffer,
    'image/jpeg',
  );
  const outputUrl = await storageService.getFileUrl(storageKey, 7200);
  timings.storage = Date.now() - t4;

  // ── 6. Cache result ──
  resultCache.set(cacheKey, { storageKey, ts: Date.now() });

  const durationMs = Date.now() - startTime;

  logger.info('[StyleTransfer] Complete', {
    style: request.style, durationMs, timings,
    provider: provider.slug, model: effectiveModel,
    resultBytes: resultBuffer.length,
  });

  // Log usage (non-blocking)
  prisma.aiUsageLog.create({
    data: {
      providerId: provider.id,
      feature: 'style_transfer',
      model: effectiveModel,
      durationMs,
      success: true,
      costCents: estimateCost(slug),
    },
  }).catch(err => logger.error('[StyleTransfer] Failed to log usage', { err }));

  return {
    outputUrl,
    style: request.style,
    durationMs,
    providerId: provider.id,
    model: effectiveModel,
  };
}

// Stability AI Image-to-Image (accepts preprocessed Buffer, returns Buffer)
async function callStabilityAI(
  apiKey: string, imageBuffer: Buffer, prompt: string,
  negativePrompt: string | undefined, strength: number, model: string
): Promise<Buffer> {
  const form = new FormData();
  form.append('init_image', imageBuffer, { filename: 'photo.jpg', contentType: 'image/jpeg' });
  form.append('text_prompts[0][text]', prompt);
  form.append('text_prompts[0][weight]', '1');
  if (negativePrompt) {
    form.append('text_prompts[1][text]', negativePrompt);
    form.append('text_prompts[1][weight]', '-1');
  }
  form.append('image_strength', String(strength));
  form.append('cfg_scale', '7');
  form.append('samples', '1');
  form.append('steps', '20');

  const response = await axios.post(
    `https://api.stability.ai/v1/generation/${model}/image-to-image`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      timeout: 60000,
    },
  );

  if (response.data?.artifacts?.[0]?.base64) {
    return Buffer.from(response.data.artifacts[0].base64, 'base64');
  }

  throw new Error('Stability AI: Keine Bilddaten in der Antwort');
}

// Replicate img2img (accepts preprocessed Buffer, returns Buffer)
async function callReplicate(
  apiKey: string, imageBuffer: Buffer, prompt: string,
  negativePrompt: string | undefined, strength: number, _model: string
): Promise<Buffer> {
  // Convert buffer to data URI for Replicate API
  const dataUri = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  // Use SDXL instead of old SD 1.5 — faster cold-start, better quality, fewer steps needed
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b', // SDXL img2img
      input: {
        image: dataUri,
        prompt,
        negative_prompt: negativePrompt || '',
        prompt_strength: strength,
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    },
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    },
  );

  const predictionId = response.data.id;
  logger.info('[StyleTransfer] Replicate prediction started', { predictionId });

  // Poll every 1s (was 2s), max 60s (was 120s)
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollRes = await axios.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${apiKey}` } },
    );

    if (pollRes.data.status === 'succeeded') {
      const output = pollRes.data.output;
      const outputUrl = Array.isArray(output) ? output[0] : output;
      // Download result image as Buffer
      const imgRes = await axios.get(outputUrl, { responseType: 'arraybuffer', timeout: 15000 });
      return Buffer.from(imgRes.data);
    }
    if (pollRes.data.status === 'failed') {
      throw new Error(`Replicate error: ${pollRes.data.error || 'Unknown'}`);
    }
  }

  throw new Error('Style Transfer Timeout (60s)');
}

function estimateCost(slug: string): number {
  if (slug.includes('stability')) return 3; // ~$0.03 per image
  if (slug.includes('replicate')) return 2; // ~$0.02 per image
  return 5;
}
