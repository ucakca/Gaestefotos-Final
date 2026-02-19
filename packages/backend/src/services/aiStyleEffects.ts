/**
 * AI Style Effects Service
 * 
 * Applies artistic style effects to photos using AI:
 * - Oldify: Ages a face/photo to look older
 * - Cartoon: Converts photo to cartoon style
 * - Style Pop: Applies vibrant artistic filters
 * 
 * Uses configured AI providers (Stability AI, Replicate, etc.)
 */

import sharp from 'sharp';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { prepareAiExecution, logAiUsage, AiFeature } from './aiExecution';

export type StyleEffect = 'ai_oldify' | 'ai_cartoon' | 'ai_style_pop' | 'time_machine' | 'pet_me' | 'yearbook' | 'emoji_me' | 'miniature';

interface StyleEffectResult {
  outputBuffer: Buffer;
  effect: StyleEffect;
  format: 'jpeg' | 'png';
}

interface StyleEffectOptions {
  intensity?: number;       // 0.0 - 1.0, default 0.8
  outputFormat?: 'jpeg' | 'png';
  quality?: number;
  variant?: string;         // e.g. decade for time_machine: '60s', '70s', '80s', '90s', '2000s'
}

// Style prompts for different effects (used with image-to-image APIs)
const STYLE_PROMPTS: Record<StyleEffect, { prompt: string; negativePrompt: string; strength: number }> = {
  ai_oldify: {
    prompt: 'aged elderly version of the person, wrinkles, grey hair, realistic aging effect, same person but 40 years older, photorealistic',
    negativePrompt: 'young, smooth skin, child, cartoon, unrealistic',
    strength: 0.65,
  },
  ai_cartoon: {
    prompt: 'pixar style 3d cartoon character, animated movie character, colorful, expressive, high quality cartoon rendering',
    negativePrompt: 'realistic, photograph, blurry, low quality, dark',
    strength: 0.75,
  },
  ai_style_pop: {
    prompt: 'vibrant pop art style, bold colors, andy warhol inspired, high contrast, artistic, modern pop art portrait',
    negativePrompt: 'dull, muted colors, black and white, boring, plain',
    strength: 0.7,
  },
  time_machine: {
    prompt: '1980s retro photo, big hair, neon colors, vintage 80s fashion, synthesizer era, VHS aesthetic, film grain',
    negativePrompt: 'modern, contemporary, high resolution, digital, clean',
    strength: 0.65,
  },
  pet_me: {
    prompt: 'adorable anthropomorphic animal version of the person, same facial expression and pose, cute furry animal character, pixar style, high quality, detailed fur texture',
    negativePrompt: 'human, realistic person, scary, horror, ugly',
    strength: 0.75,
  },
  yearbook: {
    prompt: '1990s yearbook photo, school portrait, blue gradient background, soft lighting, retro 90s hairstyle, vintage school photo, slightly overexposed, warm tones',
    negativePrompt: 'modern, selfie, outdoor, artistic, cartoon',
    strength: 0.6,
  },
  emoji_me: {
    prompt: 'emoji avatar version of the person, round face emoji style, simple cute cartoon, apple emoji aesthetic, big eyes, minimal features, flat design, same hair color and style',
    negativePrompt: 'realistic, photograph, detailed, complex, 3d render, scary',
    strength: 0.8,
  },
  miniature: {
    prompt: 'tilt-shift miniature effect, selective focus, toy-like scene, vibrant saturated colors, tiny world effect, diorama photography style',
    negativePrompt: 'normal perspective, flat, dull colors, blurry everywhere',
    strength: 0.5,
  },
};

// Decade variants for Time Machine (overrides base prompt)
const TIME_MACHINE_DECADES: Record<string, { prompt: string; negativePrompt: string }> = {
  '60s': {
    prompt: '1960s mod style photo, beehive hair, go-go fashion, psychedelic colors, groovy vintage, flower power era, kodachrome film look',
    negativePrompt: 'modern, digital, contemporary, high resolution',
  },
  '70s': {
    prompt: '1970s disco era photo, big collar shirt, bell-bottoms fashion, warm earth tones, film grain, polaroid aesthetic, retro 70s style',
    negativePrompt: 'modern, digital, contemporary, clean, minimalist',
  },
  '80s': {
    prompt: '1980s retro photo, big hair, neon colors, vintage 80s fashion, synthesizer era, VHS aesthetic, film grain, mullet or perm hairstyle',
    negativePrompt: 'modern, contemporary, high resolution, digital, clean',
  },
  '90s': {
    prompt: '1990s photo, grunge aesthetic, flannel shirt, frosted tips, disposable camera quality, 90s teen magazine style, slightly washed out colors',
    negativePrompt: 'modern, HD, sharp, professional, polished',
  },
  '2000s': {
    prompt: '2000s Y2K style photo, low-rise fashion, butterfly clips, early digital camera quality, flash photography, MySpace era aesthetic, chunky highlights',
    negativePrompt: 'modern, vintage, old, black and white, film',
  },
};

/**
 * Apply a style effect to an image using the configured AI provider.
 */
export async function applyStyleEffect(
  imageBuffer: Buffer,
  effect: StyleEffect,
  userId: string,
  options: StyleEffectOptions = {},
  eventId?: string,
): Promise<StyleEffectResult> {
  const startTime = Date.now();
  const { intensity = 0.8, outputFormat = 'jpeg', quality = 90 } = options;

  // Prepare AI execution (resolve provider + consume credits)
  const execution = await prepareAiExecution(userId, effect as AiFeature, eventId);

  if (!execution.success || !execution.provider) {
    logger.warn(`Style effect ${effect}: No provider available`, { error: execution.error });
    // Fallback: apply basic sharp filter
    return fallbackStyleEffect(imageBuffer, effect, options);
  }

  const provider = execution.provider;
  let styleConfig = { ...STYLE_PROMPTS[effect] };

  // Override prompt for Time Machine decade variants
  if (effect === 'time_machine' && options.variant && TIME_MACHINE_DECADES[options.variant]) {
    const decade = TIME_MACHINE_DECADES[options.variant];
    styleConfig.prompt = decade.prompt;
    styleConfig.negativePrompt = decade.negativePrompt;
  }

  const strength = styleConfig.strength * intensity;

  try {
    let resultBuffer: Buffer;

    if (provider.slug.includes('stability') || provider.slug.includes('stable')) {
      resultBuffer = await callStabilityImg2Img(imageBuffer, provider, styleConfig.prompt, styleConfig.negativePrompt, strength);
    } else if (provider.slug.includes('replicate')) {
      resultBuffer = await callReplicateImg2Img(imageBuffer, provider, effect, styleConfig.prompt, strength);
    } else {
      resultBuffer = await callGenericImg2Img(imageBuffer, provider, styleConfig.prompt, strength);
    }

    // Convert to desired format
    let finalBuffer: Buffer;
    if (outputFormat === 'jpeg') {
      finalBuffer = await sharp(resultBuffer).jpeg({ quality }).toBuffer();
    } else {
      finalBuffer = await sharp(resultBuffer).png().toBuffer();
    }

    const durationMs = Date.now() - startTime;
    await logAiUsage(provider.id, effect as AiFeature, {
      providerType: provider.type,
      model: provider.model || undefined,
      durationMs,
      success: true,
    });

    logger.info(`Style effect ${effect} completed`, { durationMs, providerId: provider.id });

    return { outputBuffer: finalBuffer, effect, format: outputFormat };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    await logAiUsage(provider.id, effect as AiFeature, {
      providerType: provider.type,
      durationMs,
      success: false,
      errorMessage: err.message,
    });

    logger.error(`Style effect ${effect} failed`, { err, providerId: provider.id });
    throw new Error(`Style-Effekt ${effect} fehlgeschlagen: ${err.message}`);
  }
}

/**
 * Call Stability AI image-to-image endpoint
 */
async function callStabilityImg2Img(
  imageBuffer: Buffer,
  provider: any,
  prompt: string,
  negativePrompt: string,
  strength: number,
): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.stability.ai';
  const url = `${baseUrl}/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image`;

  const formData = new FormData();
  formData.append('init_image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
  formData.append('text_prompts[0][text]', prompt);
  formData.append('text_prompts[0][weight]', '1');
  formData.append('text_prompts[1][text]', negativePrompt);
  formData.append('text_prompts[1][weight]', '-1');
  formData.append('image_strength', String(1 - strength));
  formData.append('cfg_scale', '7');
  formData.append('samples', '1');
  formData.append('steps', '20');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Accept': 'application/json',
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stability API error ${response.status}: ${errText}`);
  }

  const data: any = await response.json();
  if (!data.artifacts || data.artifacts.length === 0) {
    throw new Error('No output image from Stability API');
  }

  return Buffer.from(data.artifacts[0].base64, 'base64');
}

/**
 * Call Replicate image-to-image endpoint
 */
async function callReplicateImg2Img(
  imageBuffer: Buffer,
  provider: any,
  effect: StyleEffect,
  prompt: string,
  strength: number,
): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.replicate.com';

  // Use different models for different effects
  const modelVersions: Record<StyleEffect, string> = {
    ai_oldify: 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
    ai_cartoon: 'cjwbw/anything-v3-better-vae:09a5805203f4c12da649ec1923bb7729517ca25fcac790e640eaa9ed66573b65',
    ai_style_pop: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    time_machine: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    pet_me: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    yearbook: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    emoji_me: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    miniature: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
  };

  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;
  const model = provider.model || modelVersions[effect];
  const version = model.includes(':') ? model.split(':')[1] : model;

  const createRes = await fetch(`${baseUrl}/v1/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version,
      input: {
        image: dataUri,
        prompt,
        strength,
        num_inference_steps: 20,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate create error ${createRes.status}: ${errText}`);
  }

  const prediction: any = await createRes.json();

  // Poll for result
  let result: any = prediction;
  for (let i = 0; i < 60; i++) {
    if (result.status === 'succeeded') break;
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Replicate prediction ${result.status}: ${result.error || 'unknown'}`);
    }
    await new Promise(r => setTimeout(r, 1000));
    const pollRes = await fetch(result.urls.get, {
      headers: { 'Authorization': `Token ${provider.apiKey}` },
    });
    result = await pollRes.json();
  }

  if (result.status !== 'succeeded') {
    throw new Error('Replicate prediction timed out');
  }

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imgRes = await fetch(outputUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generic image-to-image API call
 */
async function callGenericImg2Img(
  imageBuffer: Buffer,
  provider: any,
  prompt: string,
  strength: number,
): Promise<Buffer> {
  if (!provider.baseUrl) {
    throw new Error('No base URL configured for generic style effect provider');
  }

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
  formData.append('prompt', prompt);
  formData.append('strength', String(strength));

  const response = await fetch(`${provider.baseUrl}/image-to-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Generic API error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Fallback: apply basic sharp filters when no AI provider is available
 */
async function fallbackStyleEffect(
  imageBuffer: Buffer,
  effect: StyleEffect,
  options: StyleEffectOptions,
): Promise<StyleEffectResult> {
  const { outputFormat = 'jpeg', quality = 90 } = options;
  let processed: sharp.Sharp;

  switch (effect) {
    case 'ai_oldify':
      // Sepia tone + slight blur to simulate aging
      processed = sharp(imageBuffer)
        .modulate({ saturation: 0.5, brightness: 0.9 })
        .tint({ r: 180, g: 140, b: 100 })
        .blur(0.5);
      break;

    case 'ai_cartoon':
      // Increase contrast + posterize for cartoon-like effect
      processed = sharp(imageBuffer)
        .modulate({ saturation: 1.5 })
        .sharpen(5, 1, 3)
        .median(3);
      break;

    case 'ai_style_pop':
      // Vivid colors + high contrast for pop art style
      processed = sharp(imageBuffer)
        .modulate({ saturation: 2.0, brightness: 1.1 })
        .sharpen(3);
      break;

    case 'time_machine':
      // Warm vintage tones
      processed = sharp(imageBuffer)
        .modulate({ saturation: 0.7, brightness: 0.95 })
        .tint({ r: 200, g: 160, b: 120 })
        .blur(0.3);
      break;

    case 'pet_me':
      // Soften + warm for animal-like feel
      processed = sharp(imageBuffer)
        .modulate({ saturation: 1.3, brightness: 1.05 })
        .blur(1.0);
      break;

    case 'yearbook':
      // Slightly overexposed, warm school photo
      processed = sharp(imageBuffer)
        .modulate({ saturation: 0.8, brightness: 1.1 })
        .tint({ r: 220, g: 200, b: 180 })
        .blur(0.3);
      break;

    case 'emoji_me':
      // Flat, bright, posterized emoji look
      processed = sharp(imageBuffer)
        .modulate({ saturation: 1.6, brightness: 1.15 })
        .median(5)
        .sharpen(2);
      break;

    case 'miniature':
      // Tilt-shift: saturate + selective blur simulation
      processed = sharp(imageBuffer)
        .modulate({ saturation: 1.4, brightness: 1.05 })
        .sharpen(4, 1, 2);
      break;

    default:
      processed = sharp(imageBuffer);
  }

  let outputBuffer: Buffer;
  if (outputFormat === 'jpeg') {
    outputBuffer = await processed.jpeg({ quality }).toBuffer();
  } else {
    outputBuffer = await processed.png().toBuffer();
  }

  logger.warn(`Using fallback style effect for ${effect}`);
  return { outputBuffer, effect, format: outputFormat };
}

/**
 * Process a style effect for a photo and save result
 */
export async function processStyleEffectForPhoto(
  photoId: string,
  userId: string,
  effect: StyleEffect,
  options: StyleEffectOptions = {},
): Promise<{ newPhotoPath: string }> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, eventId: true, storagePath: true },
  });

  if (!photo || !photo.storagePath) {
    throw new Error('Foto nicht gefunden');
  }

  const { storageService } = await import('./storage');
  const imageBuffer = await storageService.getFile(photo.storagePath);

  const result = await applyStyleEffect(imageBuffer, effect, userId, options, photo.eventId);

  const ext = result.format === 'png' ? 'png' : 'jpg';
  const mime = result.format === 'png' ? 'image/png' : 'image/jpeg';

  const newPath = await storageService.uploadFile(
    photo.eventId,
    `${effect}-${photoId}.${ext}`,
    result.outputBuffer,
    mime,
  );

  return { newPhotoPath: newPath };
}
