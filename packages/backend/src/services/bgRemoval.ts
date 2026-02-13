/**
 * Background Removal Service
 * 
 * Removes or replaces the background of a photo using AI.
 * Supports multiple backends:
 * 1. External API (remove.bg, Stability AI, etc.) via configured AI provider
 * 2. Local processing via sharp (basic green-screen style)
 * 
 * Flow:
 * 1. Resolve AI provider for 'bg_removal' feature
 * 2. Consume credits
 * 3. Call API to get mask/transparent image
 * 4. Optionally composite with replacement background
 * 5. Save result
 */

import sharp from 'sharp';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { prepareAiExecution, logAiUsage } from './aiExecution';

interface BgRemovalResult {
  outputBuffer: Buffer;
  maskBuffer?: Buffer;
  format: 'png' | 'jpeg';
}

interface BgRemovalOptions {
  replacementColor?: string;       // hex color e.g. '#ffffff'
  replacementImageBuffer?: Buffer; // custom background image
  outputFormat?: 'png' | 'jpeg';   // png for transparency, jpeg with replacement
  quality?: number;
}

/**
 * Remove background from an image using the configured AI provider.
 * Falls back to a simple chroma-key approach if no provider is available.
 */
export async function removeBackground(
  imageBuffer: Buffer,
  userId: string,
  options: BgRemovalOptions = {},
  eventId?: string,
): Promise<BgRemovalResult> {
  const startTime = Date.now();
  const { replacementColor, replacementImageBuffer, outputFormat = 'png', quality = 90 } = options;

  // Prepare AI execution (resolve provider + consume credits)
  const execution = await prepareAiExecution(userId, 'bg_removal', eventId);

  if (!execution.success || !execution.provider) {
    // Fallback: return original with white background composite
    logger.warn('BG Removal: No provider available, using fallback', { error: execution.error });
    return fallbackBgRemoval(imageBuffer, options);
  }

  const provider = execution.provider;

  try {
    let resultBuffer: Buffer;

    // Route to the correct API based on provider slug
    if (provider.slug.includes('stability') || provider.slug.includes('stable')) {
      resultBuffer = await callStabilityBgRemoval(imageBuffer, provider);
    } else if (provider.slug.includes('remove-bg') || provider.slug.includes('removebg')) {
      resultBuffer = await callRemoveBgApi(imageBuffer, provider);
    } else if (provider.slug.includes('replicate')) {
      resultBuffer = await callReplicateBgRemoval(imageBuffer, provider);
    } else {
      // Generic API call
      resultBuffer = await callGenericBgRemovalApi(imageBuffer, provider);
    }

    // Apply replacement background if specified
    let finalBuffer: Buffer;
    if (replacementColor || replacementImageBuffer) {
      finalBuffer = await compositeWithBackground(resultBuffer, {
        color: replacementColor,
        backgroundBuffer: replacementImageBuffer,
        format: outputFormat,
        quality,
      });
    } else if (outputFormat === 'jpeg') {
      // JPEG doesn't support transparency, composite on white
      finalBuffer = await compositeWithBackground(resultBuffer, {
        color: '#ffffff',
        format: 'jpeg',
        quality,
      });
    } else {
      finalBuffer = resultBuffer;
    }

    const durationMs = Date.now() - startTime;

    await logAiUsage(provider.id, 'bg_removal', {
      model: provider.model || undefined,
      durationMs,
      success: true,
    });

    logger.info('Background removal completed', { durationMs, providerId: provider.id });

    return {
      outputBuffer: finalBuffer,
      maskBuffer: resultBuffer,
      format: outputFormat,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    
    await logAiUsage(provider.id, 'bg_removal', {
      durationMs,
      success: false,
      errorMessage: err.message,
    });

    logger.error('Background removal failed', { err, providerId: provider.id });
    throw new Error(`Hintergrund-Entfernung fehlgeschlagen: ${err.message}`);
  }
}

/**
 * Call Stability AI background removal API
 */
async function callStabilityBgRemoval(imageBuffer: Buffer, provider: any): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.stability.ai';
  const url = `${baseUrl}/v2beta/stable-image/edit/remove-background`;

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
  formData.append('output_format', 'png');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${provider.apiKey}`,
      'Accept': 'image/*',
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stability API error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Call remove.bg API
 */
async function callRemoveBgApi(imageBuffer: Buffer, provider: any): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.remove.bg';
  const url = `${baseUrl}/v1.0/removebg`;

  const formData = new FormData();
  formData.append('image_file', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
  formData.append('size', 'auto');
  formData.append('format', 'png');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Api-Key': provider.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`remove.bg API error ${response.status}: ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Call Replicate API for background removal (e.g. rembg model)
 */
async function callReplicateBgRemoval(imageBuffer: Buffer, provider: any): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.replicate.com';
  const model = provider.model || 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

  // Convert to base64 data URI
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  // Create prediction
  const createRes = await fetch(`${baseUrl}/v1/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : model,
      input: { image: dataUri },
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
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(result.urls.get, {
      headers: { 'Authorization': `Token ${provider.apiKey}` },
    });
    result = await pollRes.json();
  }

  if (result.status !== 'succeeded') {
    throw new Error('Replicate prediction timed out');
  }

  // Download result image
  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imgRes = await fetch(outputUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generic background removal API call
 */
async function callGenericBgRemovalApi(imageBuffer: Buffer, provider: any): Promise<Buffer> {
  if (!provider.baseUrl) {
    throw new Error('No base URL configured for generic BG removal provider');
  }

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');

  const response = await fetch(`${provider.baseUrl}/remove-background`, {
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
 * Composite a transparent image onto a background
 */
async function compositeWithBackground(
  transparentBuffer: Buffer,
  opts: { color?: string; backgroundBuffer?: Buffer; format: 'png' | 'jpeg'; quality: number },
): Promise<Buffer> {
  const metadata = await sharp(transparentBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  let background: sharp.Sharp;

  if (opts.backgroundBuffer) {
    background = sharp(opts.backgroundBuffer).resize(width, height, { fit: 'cover' });
  } else {
    const hex = opts.color || '#ffffff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    background = sharp({
      create: { width, height, channels: 4, background: { r, g, b, alpha: 1 } },
    });
  }

  const bgBuffer = await background.png().toBuffer();

  const result = sharp(bgBuffer).composite([{ input: transparentBuffer, blend: 'over' }]);

  if (opts.format === 'jpeg') {
    return result.jpeg({ quality: opts.quality }).toBuffer();
  }
  return result.png().toBuffer();
}

/**
 * Fallback BG removal: returns original image (no AI available)
 */
async function fallbackBgRemoval(imageBuffer: Buffer, options: BgRemovalOptions): Promise<BgRemovalResult> {
  logger.warn('Using fallback BG removal (no AI provider)');
  return {
    outputBuffer: imageBuffer,
    format: options.outputFormat || 'png',
  };
}

/**
 * Process background removal for a photo and save as new version.
 */
export async function processBgRemovalForPhoto(
  photoId: string,
  userId: string,
  options: BgRemovalOptions = {},
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

  const result = await removeBackground(imageBuffer, userId, options, photo.eventId);

  const ext = result.format === 'png' ? 'png' : 'jpg';
  const mime = result.format === 'png' ? 'image/png' : 'image/jpeg';

  const newPath = await storageService.uploadFile(
    photo.eventId,
    `bg-removed-${photoId}.${ext}`,
    result.outputBuffer,
    mime,
  );

  return { newPhotoPath: newPath };
}
