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

export type StyleEffect = 'ai_oldify' | 'ai_cartoon' | 'ai_style_pop' | 'time_machine' | 'pet_me' | 'yearbook' | 'emoji_me' | 'miniature' | 'anime' | 'watercolor' | 'oil_painting' | 'sketch' | 'neon_noir' | 'renaissance' | 'comic_book' | 'pixel_art' | 'gif_morph' | 'gif_aging' | 'trading_card';

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
    prompt: 'pixar style 3d cartoon character, same person as the original, animated movie character, identical facial features, colorful, expressive, high quality cartoon rendering',
    negativePrompt: 'realistic, photograph, blurry, low quality, dark, different person',
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
    prompt: 'same person as the original, 1990s yearbook photo, school portrait, blue gradient background, soft lighting, retro 90s hairstyle, vintage school photo, identical face and features, slightly overexposed, warm tones',
    negativePrompt: 'modern, selfie, outdoor, artistic, cartoon, different person, changed face',
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
  anime: {
    prompt: 'anime manga art style, Studio Ghibli inspired, clean cel-shaded lines, vibrant anime colors, expressive big eyes, detailed anime illustration, high quality digital anime art',
    negativePrompt: 'realistic, photograph, 3d render, western cartoon, dark, horror',
    strength: 0.78,
  },
  watercolor: {
    prompt: 'watercolor painting style, soft wet-on-wet technique, delicate color washes, visible paper texture, loose brushstrokes, impressionistic, fine art watercolor portrait',
    negativePrompt: 'digital, sharp, crisp, photograph, oil paint, acrylic, vector',
    strength: 0.72,
  },
  oil_painting: {
    prompt: 'classical oil painting portrait, rich textured brushstrokes, Rembrandt lighting, old masters style, warm golden tones, museum quality fine art, detailed impasto technique',
    negativePrompt: 'photograph, digital, flat, modern, cartoon, anime',
    strength: 0.68,
  },
  sketch: {
    prompt: 'detailed pencil sketch portrait, graphite drawing, fine hatching and cross-hatching, professional illustrator style, high contrast black and white, artistic sketch',
    negativePrompt: 'color, photograph, painting, digital, flat shading',
    strength: 0.75,
  },
  neon_noir: {
    prompt: 'cyberpunk neon noir style, vivid neon lights, rain-slicked streets reflection, dark atmospheric moody lighting, synthwave aesthetic, blade runner inspired, purple and cyan neon glow',
    negativePrompt: 'bright daylight, natural, pastoral, cheerful, clean, white background',
    strength: 0.72,
  },
  renaissance: {
    prompt: 'Italian Renaissance portrait painting, Leonardo da Vinci style, sfumato technique, warm amber tones, classical composition, detailed fabric and jewelry, museum masterpiece quality',
    negativePrompt: 'modern, digital, cartoon, anime, photograph, contemporary',
    strength: 0.65,
  },
  comic_book: {
    prompt: 'Marvel DC comic book art style, bold ink outlines, halftone dots, dynamic shading, vibrant saturated comic colors, action hero poster style, professional comic illustration',
    negativePrompt: 'photograph, subtle, muted, realistic, anime, soft',
    strength: 0.78,
  },
  pixel_art: {
    prompt: '16-bit pixel art portrait, retro video game sprite style, limited color palette, chunky pixels, SNES era game art, detailed pixel illustration, nostalgic retro gaming aesthetic',
    negativePrompt: 'smooth, anti-aliased, photograph, realistic, 3d render, modern',
    strength: 0.82,
  },
  gif_morph: {
    prompt: 'smooth morphing transformation, sequential animation frames, dynamic motion, fluid transition effect',
    negativePrompt: 'static, still, blurry, low quality',
    strength: 0.6,
  },
  gif_aging: {
    prompt: 'progressive aging transformation, from young to old, realistic aging sequence, wrinkles developing, grey hair',
    negativePrompt: 'static, unchanged, smooth skin only, young only',
    strength: 0.65,
  },
  trading_card: {
    prompt: 'collectible trading card portrait, same person as the original, identical face, holographic foil border, dramatic lighting, epic hero card art, premium card game illustration, detailed character art',
    negativePrompt: 'plain, simple, no border, casual, snapshot, different person, changed face',
    strength: 0.72,
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

    const useInstantId = (provider.model || '').toLowerCase().includes('instantid');

    if (useInstantId) {
      // Identity-preserving path: FAL.ai InstantID keeps the person's face recognizable
      const identityPrompt = buildIdentityPrompt(effect, styleConfig.prompt, options.variant);
      resultBuffer = await callFalInstantId(imageBuffer, provider, identityPrompt.prompt, identityPrompt.negativePrompt);
    } else if (provider.slug.includes('stability') || provider.slug.includes('stable')) {
      logger.warn('[StyleEffects] Stability AI v1 API is deprecated — consider switching to fal.ai provider');
      resultBuffer = await callStabilityImg2Img(imageBuffer, provider, styleConfig.prompt, styleConfig.negativePrompt, strength);
    } else if (provider.slug.includes('replicate')) {
      resultBuffer = await callReplicateImg2Img(imageBuffer, provider, effect, styleConfig.prompt, strength);
    } else if (provider.slug.includes('fal')) {
      resultBuffer = await callFalAiImg2Img(imageBuffer, provider, styleConfig.prompt, styleConfig.negativePrompt, strength);
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
    anime: 'cjwbw/anything-v3-better-vae:09a5805203f4c12da649ec1923bb7729517ca25fcac790e640eaa9ed66573b65',
    watercolor: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    oil_painting: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    sketch: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    neon_noir: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    renaissance: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    comic_book: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    pixel_art: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    gif_morph: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    gif_aging: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    trading_card: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
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
        num_inference_steps: 35,
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

// ─── Identity-Anchored Prompts (für InstantID) ────────────────────────────────

const IDENTITY_PROMPTS: Partial<Record<StyleEffect, { prompt: string; negativePrompt: string }>> = {
  yearbook: {
    prompt: 'same person, identical face, identical eyes and features, 1990s school yearbook portrait photo, blue gradient background, soft studio lighting, retro 90s hairstyle, warm vintage tones',
    negativePrompt: 'different person, changed face, different identity, modern, selfie, outdoor, cartoon',
  },
  ai_oldify: {
    prompt: 'same person aged 40 years older, identical face structure and bone shape, realistic aging, deep wrinkles, grey hair, photorealistic portrait',
    negativePrompt: 'different person, different face, cartoon, smooth skin, young',
  },
  ai_cartoon: {
    prompt: 'same person as Pixar 3D animated character, identical facial features and hair color, expressive cartoon, studio lighting, high quality 3D render',
    negativePrompt: 'different person, changed face, 2D flat, realistic photograph',
  },
  pet_me: {
    prompt: 'same person as adorable anthropomorphic animal character, identical expression and pose, Pixar style, detailed fur, same hair color',
    negativePrompt: 'human, different person, realistic, horror',
  },
  ai_style_pop: {
    prompt: 'same person in vibrant pop art style, Andy Warhol inspired, bold colors, high contrast, identical face and features',
    negativePrompt: 'different person, dull, muted, different face',
  },
  time_machine: {
    prompt: 'same person in 1980s retro photo, identical face, big hair, neon colors, VHS aesthetic',
    negativePrompt: 'different person, modern, changed face',
  },
};

/**
 * Build identity-anchored prompt for InstantID.
 * Falls back to standard STYLE_PROMPTS if no specific identity prompt exists.
 */
function buildIdentityPrompt(effect: StyleEffect, fallbackPrompt: string, variant?: string): { prompt: string; negativePrompt: string } {
  if (effect === 'time_machine' && variant && TIME_MACHINE_DECADES[variant]) {
    const decade = TIME_MACHINE_DECADES[variant];
    return {
      prompt: `same person, identical face, ${decade.prompt}`,
      negativePrompt: `different person, different face, ${decade.negativePrompt}`,
    };
  }
  return IDENTITY_PROMPTS[effect] ?? { prompt: fallbackPrompt, negativePrompt: 'different person, changed face, blurry' };
}

/**
 * Call FAL.ai InstantID endpoint for identity-preserving style transfer.
 * InstantID preserves facial identity much better than standard img2img.
 * Requires provider with model = 'fal-ai/instantid'
 */
async function callFalInstantId(
  imageBuffer: Buffer,
  provider: any,
  prompt: string,
  negativePrompt: string,
): Promise<Buffer> {
  const model = provider.model || 'fal-ai/instantid';
  const apiUrl = `https://fal.run/${model}`;

  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      face_image_url: dataUri,
      prompt,
      negative_prompt: negativePrompt,
      num_inference_steps: 30,
      guidance_scale: 5.0,
      controlnet_conditioning_scale: 0.8,
      ip_adapter_scale: 0.8,
      num_images: 1,
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FAL.ai InstantID error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const outputUrl: string | undefined =
    data?.images?.[0]?.url ||
    data?.image?.url ||
    (typeof data?.image === 'string' ? data.image : undefined);

  if (!outputUrl) throw new Error('No output image from FAL.ai InstantID');

  if (outputUrl.startsWith('data:')) {
    return Buffer.from(outputUrl.split(',')[1], 'base64');
  }

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) throw new Error(`FAL.ai InstantID result fetch failed: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/**
 * Call fal.ai image-to-image endpoint
 * Uses fal-ai/flux/dev/image-to-image or fal-ai/stable-diffusion-v3-medium
 */
async function callFalAiImg2Img(
  imageBuffer: Buffer,
  provider: any,
  prompt: string,
  negativePrompt: string,
  strength: number,
): Promise<Buffer> {
  const model = provider.model || 'fal-ai/flux/dev/image-to-image';
  const apiUrl = `https://fal.run/${model}`;

  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: dataUri,
      prompt,
      negative_prompt: negativePrompt,
      strength,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: 'jpeg',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`fal.ai error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const outputUrl: string | undefined =
    data?.images?.[0]?.url ||
    data?.image?.url ||
    (typeof data?.image === 'string' ? data.image : undefined);

  if (!outputUrl) {
    throw new Error('No output image from fal.ai');
  }

  if (outputUrl.startsWith('data:')) {
    const b64 = outputUrl.split(',')[1];
    return Buffer.from(b64, 'base64');
  }

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) throw new Error(`fal.ai image fetch failed: ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
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

    case 'anime':
      processed = sharp(imageBuffer).modulate({ saturation: 1.8, brightness: 1.05 }).sharpen(3, 1, 2);
      break;
    case 'watercolor':
      processed = sharp(imageBuffer).modulate({ saturation: 0.9, brightness: 1.05 }).blur(0.8);
      break;
    case 'oil_painting':
      processed = sharp(imageBuffer).modulate({ saturation: 1.1, brightness: 0.95 }).sharpen(2, 1, 1);
      break;
    case 'sketch':
      processed = sharp(imageBuffer).grayscale().sharpen(8, 2, 4).modulate({ brightness: 1.1 });
      break;
    case 'neon_noir':
      processed = sharp(imageBuffer).modulate({ saturation: 2.5, brightness: 0.8 }).tint({ r: 80, g: 20, b: 160 });
      break;
    case 'renaissance':
      processed = sharp(imageBuffer).modulate({ saturation: 0.8, brightness: 0.9 }).tint({ r: 200, g: 170, b: 120 });
      break;
    case 'comic_book':
      processed = sharp(imageBuffer).modulate({ saturation: 2.0, brightness: 1.1 }).sharpen(6, 2, 3).median(2);
      break;
    case 'pixel_art':
      processed = sharp(imageBuffer).resize(64, 64, { fit: 'inside' }).resize(512, 512, { kernel: 'nearest' }).modulate({ saturation: 1.5 });
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
