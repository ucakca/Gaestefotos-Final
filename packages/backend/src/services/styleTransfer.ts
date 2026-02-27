import prisma from '../config/database';
import { logger } from '../utils/logger';
import { decryptValue } from '../utils/encryption';
import { resolvePrompt } from './promptTemplates';
import axios from 'axios';
import FormData from 'form-data';
import { storageService } from './storage';
import { spawn } from 'child_process';

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
export const AI_STYLES: Record<string, { name: string; prompt: string; negativePrompt?: string; strength: number; editPrompt?: string }> = {
  'oil-painting': {
    name: 'Ölgemälde',
    prompt: 'oil painting style, thick brushstrokes, rich colors, classic art, museum quality',
    negativePrompt: 'photo, realistic, modern',
    strength: 0.65,
    editPrompt: 'Transform this photo into a classic oil painting with thick visible brushstrokes, rich earthy colors, and museum-quality depth. Preserve the exact facial features, identity, and expression of every person in the image. Keep the composition identical.',
  },
  'watercolor': {
    name: 'Aquarell',
    prompt: 'watercolor painting, soft washes, flowing colors, delicate, artistic',
    negativePrompt: 'photo, sharp, digital',
    strength: 0.6,
    editPrompt: 'Transform this image into a delicate watercolor painting. Use soft color washes, gentle blending, and light brushwork. Preserve the facial features and identity of all people exactly. Maintain the original composition and poses.',
  },
  'pop-art': {
    name: 'Pop Art',
    prompt: 'pop art style, bold colors, halftone dots, andy warhol inspired, comic book',
    negativePrompt: 'realistic, muted colors',
    strength: 0.7,
    editPrompt: 'Transform this photo into a bold Andy Warhol-style pop art image. Use vibrant flat colors, halftone dot patterns, strong black outlines, and high contrast. Maintain the exact likeness of every person in the photo.',
  },
  'sketch': {
    name: 'Bleistiftzeichnung',
    prompt: 'pencil sketch, detailed line drawing, crosshatching, black and white, artistic',
    negativePrompt: 'color, photo, digital',
    strength: 0.6,
    editPrompt: 'Convert this photo into a detailed pencil sketch with fine line work, crosshatching for shadows, and a white paper background. Preserve the exact facial structure and identity of all people shown. Use subtle shading to create depth.',
  },
  'cartoon': {
    name: 'Cartoon',
    prompt: 'cartoon style, animated, bright colors, clean lines, pixar style, fun',
    negativePrompt: 'realistic, photo, dark',
    strength: 0.65,
    editPrompt: 'Transform this photo into a Pixar-style 3D cartoon. Use bright cheerful colors, smooth surfaces, large expressive eyes, and clean outlines. Preserve the recognizable features and personality of each person. Make it fun and family-friendly.',
  },
  'vintage': {
    name: 'Vintage Retro',
    prompt: 'vintage photograph, sepia tones, film grain, 1970s aesthetic, warm tones, nostalgic',
    negativePrompt: 'modern, digital, sharp',
    strength: 0.5,
    editPrompt: 'Apply a vintage 1970s film photography look to this image. Add sepia tones, visible film grain, slight vignetting, and warm nostalgic colors. Preserve all people\'s appearances and identity. Keep the composition intact.',
  },
  'cyberpunk': {
    name: 'Cyberpunk',
    prompt: 'cyberpunk style, neon lights, futuristic, dark background, glowing edges, sci-fi',
    negativePrompt: 'natural, daylight, classic',
    strength: 0.7,
    editPrompt: 'Transform this photo into a futuristic cyberpunk scene. Add neon lighting (cyan, magenta, purple), dark urban backgrounds, holographic elements, and sci-fi details. Preserve the identity and facial features of all people in the image.',
  },
  'renaissance': {
    name: 'Renaissance',
    prompt: 'renaissance painting style, classical composition, chiaroscuro lighting, da vinci inspired',
    negativePrompt: 'modern, digital, photo',
    strength: 0.65,
    editPrompt: 'Recreate this photo as a Renaissance oil painting in the style of Leonardo da Vinci. Use dramatic chiaroscuro lighting, classical composition, rich earth tones, and sfumato technique. Preserve the exact facial likeness of all people.',
  },
  'anime': {
    name: 'Anime',
    prompt: 'anime style, japanese animation, big eyes, colorful, detailed background, studio ghibli',
    negativePrompt: 'realistic, photo, western',
    strength: 0.7,
    editPrompt: 'Transform this photo into a high-quality anime illustration. Use large expressive eyes, clean linework, vibrant colors, and an anime art style. Preserve the age, hair color, and distinguishing features of every person while adapting them to anime aesthetics.',
  },
  'neon-glow': {
    name: 'Neon Glow',
    prompt: 'neon glow effect, dark background, vibrant neon outlines, ultraviolet, glowing',
    negativePrompt: 'daylight, natural, muted',
    strength: 0.65,
    editPrompt: 'Apply a dramatic neon glow effect to this image. Add vibrant glowing outlines in neon colors (pink, cyan, yellow), a dark background, and a UV/blacklight atmosphere. Preserve the identity of all people while making the image pop with luminous neon energy.',
  },
  'caricature': {
    name: 'Karikatur',
    prompt: 'exaggerated caricature drawing, big head, small body, humorous, colorful, professional caricature artist style',
    negativePrompt: 'realistic, photograph, normal proportions',
    strength: 0.75,
    editPrompt: 'Create a fun professional caricature of the person(s) in this photo. Exaggerate the most distinctive facial features (eyes, nose, smile, hair) in a humorous and flattering way. Keep the person clearly recognizable. Use colorful cartoon style with a clean background.',
  },
  'magazine-cover': {
    name: 'Magazine Cover',
    prompt: 'professional magazine cover photo, glamorous lighting, high fashion, vogue style, dramatic pose, editorial photography',
    negativePrompt: 'amateur, casual, low quality',
    strength: 0.55,
    editPrompt: 'Transform this photo into a glamorous Vogue magazine cover. Enhance the lighting to be dramatic and editorial, add subtle professional retouching, elegant styling, and a high-fashion atmosphere. Preserve the person\'s identity and natural beauty.',
  },
  'comic-hero': {
    name: 'Comic Hero',
    prompt: 'marvel comic book style, bold outlines, halftone dots, dynamic pose, superhero comic panel, vibrant colors',
    negativePrompt: 'photograph, realistic, muted',
    strength: 0.70,
    editPrompt: 'Transform the person(s) in this photo into a Marvel/DC superhero comic book panel. Add a superhero costume, bold black outlines, dynamic action pose, halftone dot shading, and vibrant primary colors. Preserve their facial features so they\'re recognizable as the hero version of themselves.',
  },
  'lego': {
    name: 'Lego',
    prompt: 'lego minifigure version of person, plastic toy, yellow skin, simple features, lego world background',
    negativePrompt: 'realistic, photograph, detailed skin',
    strength: 0.80,
    editPrompt: 'Transform all people in this photo into Lego minifigures. Use the classic yellow Lego skin tone, blocky plastic body, simple face details (dot eyes, curved smile), and a colorful Lego world background. Match their hair color and any distinctive accessories.',
  },
  'claymation': {
    name: 'Claymation',
    prompt: 'stop motion claymation character, wallace and gromit style, plasticine texture, warm lighting',
    negativePrompt: 'photograph, realistic, digital',
    strength: 0.75,
    editPrompt: 'Transform the people in this photo into stop-motion claymation characters in the style of Wallace and Gromit. Use plasticine texture, visible fingerprints in the clay, warm studio lighting, and a handmade quality. Match each person\'s hair color and distinctive features.',
  },
  'neon-portrait': {
    name: 'Neon Portrait',
    prompt: 'cyberpunk neon portrait, dark background, vibrant neon lights reflecting on skin, futuristic, blade runner aesthetic',
    negativePrompt: 'daylight, natural, flat lighting',
    strength: 0.65,
    editPrompt: 'Create a dramatic Blade Runner-style neon portrait. Use a dark background with vibrant neon reflections (pink/cyan/purple) casting colored light on the subject\'s face. Preserve the exact identity and facial features of every person. Create a cinematic, moody atmosphere.',
  },
  'barbie': {
    name: 'Barbie / Ken',
    prompt: 'barbie doll version, perfect plastic skin, glossy, pink background, toy box aesthetic, fashion doll',
    negativePrompt: 'realistic, wrinkles, natural skin',
    strength: 0.75,
    editPrompt: 'Transform the person(s) in this photo into Barbie/Ken dolls. Give them perfect plastic doll skin, glossy hair, bright fashionable clothing, and a pink Barbie-box background. Preserve their hair color and facial structure while adapting them to the iconic Mattel doll aesthetic.',
  },
  'ghibli': {
    name: 'Studio Ghibli',
    prompt: 'studio ghibli anime style, miyazaki inspired, soft watercolor, dreamy atmosphere, detailed background, spirited away aesthetic',
    negativePrompt: 'realistic, photograph, dark, gritty',
    strength: 0.70,
    editPrompt: 'Transform this photo into a Studio Ghibli film still by Hayao Miyazaki. Use soft watercolor backgrounds, warm atmospheric lighting, gentle character designs with large kind eyes, and a dreamy magical atmosphere. Preserve each person\'s age, hair color, and emotional expression.',
  },
  'headshot': {
    name: 'AI Headshot',
    prompt: 'professional linkedin headshot, studio lighting, clean background, business attire, confident expression',
    negativePrompt: 'casual, blurry, dark, amateur',
    strength: 0.50,
    editPrompt: 'Enhance this photo into a professional LinkedIn headshot. Apply studio-quality lighting, a clean neutral background, subtle professional retouching, and a polished business look. Preserve the person\'s natural appearance, identity, and confidence.',
  },
  'stained-glass': {
    name: 'Kirchenfenster',
    prompt: 'stained glass window art style, vibrant colored glass pieces, black lead lines, church window, backlit',
    negativePrompt: 'photograph, realistic, modern',
    strength: 0.75,
    editPrompt: 'Transform this image into a medieval stained glass church window. Use vibrant jewel-toned glass pieces (ruby, sapphire, emerald, amber) separated by thick black lead lines. Backlit glowing effect. Preserve the recognizable appearance of all people as saints or figures in the window.',
  },
  'ukiyo-e': {
    name: 'Ukiyo-e',
    prompt: 'ukiyo-e japanese woodblock print style, flat colors, wave patterns, traditional japanese art',
    negativePrompt: 'photograph, 3d, modern, digital',
    strength: 0.70,
    editPrompt: 'Transform this image into a traditional Japanese ukiyo-e woodblock print. Use flat bold colors (red, black, indigo, cream), fine outline work, stylized nature patterns, and the aesthetic of Hokusai or Hiroshige. Adapt all people to the traditional Japanese art style while preserving their distinctive features.',
  },
  'film-noir': {
    name: 'Film Noir',
    prompt: 'film noir style, black and white, dramatic shadows, 1940s detective movie, high contrast, venetian blinds lighting',
    negativePrompt: 'color, bright, modern, casual',
    strength: 0.60,
    editPrompt: 'Transform this photo into a classic 1940s film noir scene. Convert to high-contrast black and white, add dramatic venetian blind shadow patterns, moody atmospheric lighting, and a detective movie aesthetic. Preserve the exact identity of all people while giving them a noir mystery look.',
  },
  'pixel-art': {
    name: 'Pixel Art',
    prompt: '16-bit pixel art portrait, retro video game style, limited color palette, blocky pixels, nostalgic gaming aesthetic',
    negativePrompt: 'realistic, smooth, high resolution, photograph',
    strength: 0.75,
    editPrompt: 'Transform this photo into a retro 16-bit pixel art sprite. Use a limited color palette, visible square pixels, and the aesthetic of classic SNES/Mega Drive games. Preserve the hair color and recognizable features of all people in pixel form. Add a game UI border around the image.',
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
async function preprocessImage(imageUrlOrBuffer: string | Buffer, asPng = false): Promise<Buffer> {
  let raw: Buffer;
  let dlMs = 0;
  if (Buffer.isBuffer(imageUrlOrBuffer)) {
    raw = imageUrlOrBuffer;
  } else {
    const t0 = Date.now();
    const res = await axios.get(imageUrlOrBuffer, { responseType: 'arraybuffer', timeout: 15000 });
    dlMs = Date.now() - t0;
    raw = Buffer.from(res.data);
  };

  if (!sharp) {
    logger.warn('[StyleTransfer] sharp unavailable, sending full-res');
    return raw;
  }

  const t1 = Date.now();
  const pipeline = sharp(raw).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
  const buf = asPng
    ? await pipeline.png().toBuffer()          // PNG for OpenAI gpt-image-1
    : await pipeline.jpeg({ quality: 85 }).toBuffer(); // JPEG for Stability/Replicate
  const resizeMs = Date.now() - t1;

  logger.info('[StyleTransfer] Preprocessed', {
    from: raw.length, to: buf.length,
    format: asPng ? 'png' : 'jpeg',
    saved: `${Math.round((1 - buf.length / raw.length) * 100)}%`,
    dlMs, resizeMs,
  });
  return buf;
}

// ── OpenAI gpt-image-1 (images/edits) ───────────────────────────────────────
async function callOpenAIImageEdit(
  apiKey: string,
  imageBuffer: Buffer,
  prompt: string,
): Promise<Buffer> {
  const form = new FormData();
  form.append('model', 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('n', '1');
  form.append('size', '1024x1024');
  form.append('quality', 'medium');
  form.append('image', imageBuffer, { filename: 'photo.png', contentType: 'image/png' });

  const response = await axios.post(
    'https://api.openai.com/v1/images/edits',
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 90000, // gpt-image-1 can take up to ~30s
    },
  );

  const b64 = response.data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI gpt-image-1: Kein Bild in der Antwort erhalten');
  return Buffer.from(b64, 'base64');
}

// ── Shared Replicate polling ──────────────────────────────────────────────────
async function pollReplicateResult(apiKey: string, predictionId: string): Promise<Buffer> {
  for (let i = 0; i < 90; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const poll = await axios.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${apiKey}` } },
    );
    if (poll.data.status === 'succeeded') {
      const url = Array.isArray(poll.data.output) ? poll.data.output[0] : poll.data.output;
      const imgRes = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
      return Buffer.from(imgRes.data);
    }
    if (poll.data.status === 'failed') throw new Error(`Replicate: ${poll.data.error || 'unknown'}`);
  }
  throw new Error('Replicate timeout (90s)');
}

// ── PuLID — Flux.1 [dev] + face identity preservation ────────────────────────
async function callPuLID(apiKey: string, imageBuffer: Buffer, prompt: string, versionHash: string): Promise<Buffer> {
  const dataUri = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  const resp = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: versionHash,
      input: { main_face_image: dataUri, prompt, num_steps: 20, start_step: 4, guidance_scale: 4, true_cfg: 1, max_sequence_length: 128 },
    },
    { headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
  );
  logger.info('[StyleTransfer] PuLID prediction started', { id: resp.data.id });
  return pollReplicateResult(apiKey, resp.data.id);
}

// ── Flux.1 [dev] img2img — höhere Qualität als SDXL ──────────────────────────
async function callFlux1Dev(apiKey: string, imageBuffer: Buffer, prompt: string, strength: number, versionHash: string): Promise<Buffer> {
  const dataUri = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  const resp = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: versionHash,
      input: { image: dataUri, prompt, strength, num_inference_steps: 28, guidance: 3.5, output_format: 'jpeg', output_quality: 90 },
    },
    { headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
  );
  logger.info('[StyleTransfer] Flux.1-dev prediction started', { id: resp.data.id });
  return pollReplicateResult(apiKey, resp.data.id);
}

// ── Face Detection — OpenCV Haar Cascade (lokal, ~50-300ms, $0) ──────────────

const FACE_DETECTOR_SCRIPT = '/opt/gaestefotos/detect_faces.py';

async function countFacesLocal(photoUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('python3', [FACE_DETECTOR_SCRIPT, photoUrl], { timeout: 12000, stdio: ['ignore', 'pipe', 'ignore'] });
    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.on('close', (code) => {
      try {
        const result = JSON.parse(stdout.trim());
        if (typeof result.count === 'number' && result.count >= 0) {
          logger.info('[StyleTransfer] Face count via OpenCV', { count: result.count, ms: result.ms });
          resolve(result.count);
        } else {
          resolve(-1);
        }
      } catch {
        resolve(-1);
      }
    });
    proc.on('error', () => resolve(-1));
  });
}

async function countFaces(photoUrl: string): Promise<number> {
  // 1. OpenCV Haar Cascade — kostenlos, lokal, <300ms
  const localCount = await countFacesLocal(photoUrl);
  if (localCount >= 0) return localCount;

  // 2. Fallback: GPT-4o-mini Vision (~$0.001) — nur wenn Python-Script fehlschlägt
  try {
    const openAiProvider = await prisma.aiProvider.findFirst({
      where: { isActive: true, slug: { contains: 'openai' } },
    });
    if (!openAiProvider?.apiKeyEncrypted || !openAiProvider.apiKeyIv || !openAiProvider.apiKeyTag) return -1;
    const apiKey = decryptValue({
      encrypted: openAiProvider.apiKeyEncrypted,
      iv: openAiProvider.apiKeyIv,
      tag: openAiProvider.apiKeyTag,
    });
    const resp = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: photoUrl, detail: 'low' } },
            { type: 'text', text: 'Count the number of human faces clearly visible in this image. Reply with ONLY a single integer (0, 1, 2, 3...). No other text.' },
          ],
        }],
        max_tokens: 5,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 10000 },
    );
    const count = parseInt(resp.data.choices[0]?.message?.content?.trim() || '-1', 10);
    logger.info('[StyleTransfer] Face count via GPT-4o-mini (fallback)', { count });
    return isNaN(count) ? -1 : count;
  } catch (err: any) {
    logger.warn('[StyleTransfer] Face detection failed (non-fatal)', { err: err.message });
    return -1;
  }
}

// ── Provider Priority List — reads config from feature mapping ────────────────
interface ProviderConfig { provider: any; model: string | null; }

async function getStyleTransferProviderList(
  promptProviderId: string | null | undefined,
  photoUrl: string,
): Promise<ProviderConfig[]> {
  const results: ProviderConfig[] = [];

  if (promptProviderId) {
    const p = await prisma.aiProvider.findUnique({ where: { id: promptProviderId } });
    if (p?.isActive) results.push({ provider: p, model: null });
  }

  const mapping = await prisma.aiFeatureMapping.findUnique({
    where: { feature: 'style_transfer' },
    include: { provider: true },
  });

  const config = (mapping?.config as any) || {};
  const allProviders = await prisma.aiProvider.findMany({ where: { isActive: true } });
  const bySlug = Object.fromEntries(allProviders.map(p => [p.slug, p]));

  // ── Face-count-based routing (runs in parallel with nothing, adds ~1-2s) ──
  const faceRouting: Record<string, string> = config.faceRouting || {};
  const hasFaceRouting = Object.keys(faceRouting).length > 0;
  let faceCount = -1;
  if (hasFaceRouting) {
    faceCount = await countFaces(photoUrl);
  }

  // Determine face-routing slug
  let faceRoutingSlug: string | null = null;
  if (faceCount === 0 && faceRouting.none) faceRoutingSlug = faceRouting.none;
  else if (faceCount === 1 && faceRouting.single) faceRoutingSlug = faceRouting.single;
  else if (faceCount >= 2 && faceRouting.multi) faceRoutingSlug = faceRouting.multi;

  // Face-routing provider goes first (highest priority)
  if (faceRoutingSlug) {
    const p = bySlug[faceRoutingSlug];
    if (p && !results.find(r => r.provider.id === p.id)) {
      results.push({ provider: p, model: mapping?.model ?? null });
      logger.info(`[StyleTransfer] Face routing: ${faceCount} face(s) → ${faceRoutingSlug}`);
    }
  }

  // Then standard providerPriority as fallback chain
  const priority: string[] = config.providerPriority || [];
  for (const slug of priority) {
    const p = bySlug[slug];
    if (p && !results.find(r => r.provider.id === p.id)) results.push({ provider: p, model: mapping?.model ?? null });
  }

  // Always include the directly mapped provider as final fallback
  if (mapping?.isEnabled && mapping.provider?.isActive && !results.find(r => r.provider.id === mapping.provider.id)) {
    results.push({ provider: mapping.provider, model: mapping.model });
  }

  // Emergency fallback
  if (results.length === 0) {
    const p = await prisma.aiProvider.findFirst({ where: { type: 'IMAGE_GEN', isActive: true } });
    if (p) results.push({ provider: p, model: null });
  }

  return results;
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

  if (!photo || !photo.storagePath) throw new Error('Foto nicht gefunden');
  const { storageService: _ss } = await import('./storage');
  const _photoBuffer = await _ss.getFile(photo.storagePath);
  const providerList = await getStyleTransferProviderList((resolvedPrompt as any).providerId || null, photo.url || '');
  if (providerList.length === 0) throw new Error('Kein AI-Provider für Style Transfer konfiguriert.');

  logger.info('[StyleTransfer] Prompt resolved', { feature: promptFeature, source: resolvedPrompt.source, providers: providerList.map(p => p.provider.slug) });

  const strength = request.strength ?? style.strength;
  const finalPrompt = request.prompt ? `${request.prompt}, ${style.prompt}` : style.prompt;

  // ── 3. Preprocess image ──
  const t2 = Date.now();
  const firstSlug = providerList[0].provider.slug.toLowerCase();
  const imageBuffer = await preprocessImage(_photoBuffer, firstSlug.includes('openai'));
  timings.preprocess = Date.now() - t2;

  // ── 4. Call AI with priority fallback ──
  const t3 = Date.now();
  let resultBuffer: Buffer | null = null;
  let usedProvider = providerList[0].provider;
  let usedModel = '';
  let lastError: Error | null = null;

  for (const { provider, model } of providerList) {
    const slug = provider.slug.toLowerCase();
    let apiKey = '';
    if (provider.apiKeyEncrypted && provider.apiKeyIv && provider.apiKeyTag) {
      apiKey = decryptValue({ encrypted: provider.apiKeyEncrypted, iv: provider.apiKeyIv, tag: provider.apiKeyTag });
    }
    const effectiveModel = model || provider.defaultModel || 'stable-diffusion-xl-1024-v1-0';
    try {
      logger.info(`[StyleTransfer] Trying provider: ${provider.slug}`);
      if (slug.includes('openai')) {
        const pngBuf = slug === firstSlug ? imageBuffer : await preprocessImage(_photoBuffer, true);
        resultBuffer = await callOpenAIImageEdit(apiKey, pngBuf, style.editPrompt || finalPrompt);
      } else if (slug.includes('pulid')) {
        resultBuffer = await callPuLID(apiKey, imageBuffer, style.editPrompt || finalPrompt, effectiveModel);
      } else if (slug.includes('flux')) {
        resultBuffer = await callFlux1Dev(apiKey, imageBuffer, style.editPrompt || finalPrompt, strength, effectiveModel);
      } else if (slug.includes('stability') || slug.includes('stable')) {
        resultBuffer = await callStabilityAI(apiKey, imageBuffer, finalPrompt, style.negativePrompt, strength, effectiveModel);
      } else if (slug.includes('replicate')) {
        resultBuffer = await callReplicate(apiKey, imageBuffer, finalPrompt, style.negativePrompt, strength, effectiveModel);
      } else {
        throw new Error(`Provider "${provider.name}" für Style Transfer nicht unterstützt.`);
      }
      usedProvider = provider;
      usedModel = effectiveModel;
      break;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[StyleTransfer] ${provider.slug} failed → trying fallback`, { err: err.message });
    }
  }

  if (!resultBuffer) throw lastError || new Error('Alle Provider fehlgeschlagen.');
  timings.aiCall = Date.now() - t3;

  const provider = usedProvider;
  const effectiveModel = usedModel;

  // ── 5. Store result to SeaweedFS ──
  const t4 = Date.now();
  const storageKey = await storageService.uploadFile(
    request.eventId,
    `ai-style-${request.style}-${request.photoId}.jpg`,
    resultBuffer!,
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
      costCents: estimateCost(provider.slug),
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

// Replicate SDXL img2img — uses shared polling helper
async function callReplicate(
  apiKey: string, imageBuffer: Buffer, prompt: string,
  negativePrompt: string | undefined, strength: number, _model: string
): Promise<Buffer> {
  const dataUri = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b', // SDXL img2img
      input: { image: dataUri, prompt, negative_prompt: negativePrompt || '', prompt_strength: strength, num_inference_steps: 20, guidance_scale: 7.5 },
    },
    { headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 15000 },
  );
  logger.info('[StyleTransfer] SDXL prediction started', { id: response.data.id });
  return pollReplicateResult(apiKey, response.data.id);
}

function estimateCost(slug: string): number {
  if (slug.includes('openai')) return 12;     // ~$0.12 per gpt-image-1 medium
  if (slug.includes('pulid')) return 6;       // ~$0.05-0.08 per image (Flux+PuLID)
  if (slug.includes('flux')) return 4;        // ~$0.03-0.05 per image (Flux.1-dev)
  if (slug.includes('stability')) return 3;   // ~$0.03 per image
  if (slug.includes('replicate')) return 2;   // ~$0.02 per image (SDXL)
  return 5;
}
