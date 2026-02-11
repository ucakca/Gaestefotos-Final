import prisma from '../config/database';
import { logger } from '../utils/logger';
import { decryptValue } from '../utils/encryption';
import axios from 'axios';

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
};

// Get the configured AI provider for style transfer
async function getStyleTransferProvider() {
  // First check feature mapping
  const mapping = await prisma.aiFeatureMapping.findUnique({
    where: { feature: 'style_transfer' },
    include: { provider: true },
  });

  if (mapping?.isEnabled && mapping.provider.isActive) {
    return { provider: mapping.provider, model: mapping.model };
  }

  // Fallback: find any active IMAGE_GEN provider
  const provider = await prisma.aiProvider.findFirst({
    where: { type: 'IMAGE_GEN', isActive: true },
    orderBy: { isDefault: 'desc' },
  });

  return provider ? { provider, model: null } : null;
}

// Execute style transfer via the configured provider
export async function executeStyleTransfer(request: StyleTransferRequest): Promise<StyleTransferResult> {
  const startTime = Date.now();

  const config = await getStyleTransferProvider();
  if (!config) {
    throw new Error('Kein AI-Provider für Style Transfer konfiguriert. Bitte in Admin > AI Provider einrichten.');
  }

  const { provider, model } = config;
  const style = AI_STYLES[request.style];
  if (!style) {
    throw new Error(`Unbekannter Style: ${request.style}`);
  }

  // Get the photo
  const photo = await prisma.photo.findUnique({ where: { id: request.photoId } });
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

  let outputUrl: string;

  // Route to appropriate provider
  const slug = provider.slug.toLowerCase();
  if (slug.includes('stability') || slug.includes('stable')) {
    outputUrl = await callStabilityAI(apiKey, photo.url, finalPrompt, style.negativePrompt, strength, effectiveModel);
  } else if (slug.includes('replicate')) {
    outputUrl = await callReplicate(apiKey, photo.url, finalPrompt, style.negativePrompt, strength, effectiveModel);
  } else {
    throw new Error(`Style Transfer wird für Provider "${provider.name}" nicht unterstützt. Nutze Stability AI oder Replicate.`);
  }

  const durationMs = Date.now() - startTime;

  // Log usage
  await prisma.aiUsageLog.create({
    data: {
      providerId: provider.id,
      feature: 'style_transfer',
      model: effectiveModel,
      durationMs,
      success: true,
      costCents: estimateCost(slug),
    },
  });

  return {
    outputUrl,
    style: request.style,
    durationMs,
    providerId: provider.id,
    model: effectiveModel,
  };
}

// Stability AI Image-to-Image
async function callStabilityAI(
  apiKey: string, imageUrl: string, prompt: string,
  negativePrompt: string | undefined, strength: number, model: string
): Promise<string> {
  // Download the source image
  const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  const imageBuffer = Buffer.from(imgResponse.data);

  const FormData = (await import('form-data')).default;
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
  form.append('steps', '30');

  const response = await axios.post(
    `https://api.stability.ai/v1/generation/${model}/image-to-image`,
    form,
    {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      timeout: 120000,
    },
  );

  if (response.data?.artifacts?.[0]?.base64) {
    // Return as data URL — in production, upload to S3/storage
    return `data:image/png;base64,${response.data.artifacts[0].base64}`;
  }

  throw new Error('Stability AI: Keine Bilddaten in der Antwort');
}

// Replicate img2img
async function callReplicate(
  apiKey: string, imageUrl: string, prompt: string,
  negativePrompt: string | undefined, strength: number, _model: string
): Promise<string> {
  // Start prediction
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: 'db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf', // stable-diffusion img2img
      input: {
        image: imageUrl,
        prompt,
        negative_prompt: negativePrompt || '',
        prompt_strength: strength,
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    },
    {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    },
  );

  const predictionId = response.data.id;

  // Poll for completion (max 120s)
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pollRes = await axios.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${apiKey}` } },
    );

    if (pollRes.data.status === 'succeeded') {
      const output = pollRes.data.output;
      return Array.isArray(output) ? output[0] : output;
    }
    if (pollRes.data.status === 'failed') {
      throw new Error(`Replicate error: ${pollRes.data.error || 'Unknown'}`);
    }
  }

  throw new Error('Style Transfer Timeout (120s)');
}

function estimateCost(slug: string): number {
  if (slug.includes('stability')) return 3; // ~$0.03 per image
  if (slug.includes('replicate')) return 2; // ~$0.02 per image
  return 5;
}
