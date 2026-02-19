/**
 * Image-to-Prompt Service
 * 
 * Analyzes an image and reconstructs the most likely generation prompt.
 * Uses CLIP Interrogator (Replicate) for technical tags + LLM (Groq) for synthesis.
 * 
 * Flow: Image → CLIP Interrogator → technical tags → LLM synthesis → optimized prompt
 * Cost: ~$0.02-0.03 per image
 */

import axios from 'axios';
import prisma from '../config/database';
import { decryptValue } from '../utils/encryption';
import { generateCompletion } from '../lib/groq';
import { logger } from '../utils/logger';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ImageToPromptResult {
  clipTags: string;
  synthesizedPrompt: string;
  negativePrompt: string;
  suggestedStyle: string;
  suggestedStrength: number;
  metadata: {
    clipModel: string;
    llmModel: string;
    durationMs: number;
    costEstimateCents: number;
  };
}

// ─── REPLICATE PROVIDER ─────────────────────────────────────────────────────

/**
 * Get Replicate API key from configured providers.
 */
async function getReplicateApiKey(): Promise<string> {
  const provider = await prisma.aiProvider.findFirst({
    where: {
      slug: { contains: 'replicate', mode: 'insensitive' },
      isActive: true,
    },
  });

  if (!provider?.apiKeyEncrypted || !provider?.apiKeyIv || !provider?.apiKeyTag) {
    throw new Error('Replicate Provider nicht konfiguriert. Bitte in Admin > AI Provider einrichten.');
  }

  return decryptValue({
    encrypted: provider.apiKeyEncrypted,
    iv: provider.apiKeyIv,
    tag: provider.apiKeyTag,
  });
}

// ─── CLIP INTERROGATOR ──────────────────────────────────────────────────────

/**
 * Run CLIP Interrogator on Replicate to extract technical tags from an image.
 * Uses pharmapsychotic/clip-interrogator for detailed CLIP+BLIP analysis.
 */
async function runClipInterrogator(imageBase64: string, apiKey: string): Promise<string> {
  const dataUri = `data:image/jpeg;base64,${imageBase64}`;

  // CLIP Interrogator model on Replicate
  const response = await axios.post(
    'https://api.replicate.com/v1/predictions',
    {
      version: 'a4a8bafd6089e1716b06057c42b19378250d008b80fe87caa5cd36d40c1eda90', // clip-interrogator
      input: {
        image: dataUri,
        mode: 'best', // 'best' = most detailed, 'fast' = quicker but less detail
        clip_model_name: 'ViT-L-14/openai',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait', // Wait for result (up to 60s)
      },
      timeout: 120000,
    },
  );

  // If Replicate returns immediately with a prediction ID, poll for result
  if (response.data.status === 'succeeded') {
    return response.data.output || '';
  }

  const predictionId = response.data.id;
  if (!predictionId) {
    throw new Error('CLIP Interrogator: Keine Prediction-ID erhalten');
  }

  logger.info('[img2prompt] CLIP Interrogator prediction started', { predictionId });

  // Poll for result (max 480s / 8min — Replicate cold start can take 6+ min)
  for (let i = 0; i < 480; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollRes = await axios.get(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 10000 },
    );

    if (pollRes.data.status === 'succeeded') {
      return pollRes.data.output || '';
    }
    if (pollRes.data.status === 'failed' || pollRes.data.status === 'canceled') {
      throw new Error(`CLIP Interrogator failed: ${pollRes.data.error || 'Unknown'}`);
    }
  }

  throw new Error('CLIP Interrogator Timeout (480s). Replicate-Server antwortet nicht. Bitte später erneut versuchen.');
}

// ─── LLM SYNTHESIS ──────────────────────────────────────────────────────────

/**
 * Use LLM (Groq) to synthesize CLIP tags into an optimized, usable prompt.
 */
async function synthesizePrompt(clipOutput: string): Promise<{
  prompt: string;
  negativePrompt: string;
  suggestedStyle: string;
  suggestedStrength: number;
}> {
  const systemPrompt = `Du bist ein Experte für AI-Bild-Generierung und Prompt Engineering.
Du erhältst die Ausgabe eines CLIP Interrogators — technische Tags und Beschreibungen eines Bildes.

Deine Aufgabe:
1. Formuliere einen optimierten Prompt für Stable Diffusion XL (img2img), der diesen Stil reproduziert
2. Erstelle einen passenden Negative Prompt
3. Erkenne den Kunststil und schlage einen Style-Namen vor
4. Empfehle eine img2img Strength (0.3-0.9)

Antworte NUR mit einem JSON-Objekt:
{
  "prompt": "der optimierte Prompt",
  "negativePrompt": "der negative Prompt", 
  "suggestedStyle": "stil-name-in-kebab-case",
  "suggestedStrength": 0.65
}

Regeln für den Prompt:
- Verwende englische Begriffe
- Füge Quality-Booster hinzu: "masterpiece, best quality, highly detailed"
- Strukturiere: Subject → Medium → Style → Quality → Details
- Face-Preservation bei Portraits: "same person, preserve facial features"

Regeln für Negative Prompt:
- Immer: "deformed, blurry, bad anatomy, disfigured, poorly drawn, watermark"
- Bei Portraits: "mutation, extra limb, ugly, missing fingers"`;

  const userPrompt = `CLIP Interrogator Output:\n${clipOutput}\n\nBitte analysiere und erstelle den optimierten Prompt.`;

  const response = await generateCompletion(userPrompt, systemPrompt, {
    maxTokens: 500,
    temperature: 0.3,
  });

  try {
    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in LLM response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      prompt: parsed.prompt || clipOutput,
      negativePrompt: parsed.negativePrompt || 'deformed, blurry, bad anatomy, watermark',
      suggestedStyle: parsed.suggestedStyle || 'custom',
      suggestedStrength: parsed.suggestedStrength || 0.65,
    };
  } catch (error) {
    logger.warn('[img2prompt] LLM JSON parse failed, using CLIP output directly', { error: (error as Error).message });
    return {
      prompt: clipOutput,
      negativePrompt: 'deformed, blurry, bad anatomy, disfigured, watermark',
      suggestedStyle: 'custom',
      suggestedStrength: 0.65,
    };
  }
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────

/**
 * Analyze an image and reconstruct the most likely generation prompt.
 * 
 * @param imageBuffer - The image to analyze (JPEG/PNG buffer)
 * @returns Structured prompt analysis result
 */
export async function analyzeImageToPrompt(imageBuffer: Buffer): Promise<ImageToPromptResult> {
  const startTime = Date.now();

  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error('Leerer Bild-Buffer empfangen');
  }

  // Detect image format from magic bytes
  const magic = imageBuffer.slice(0, 4);
  const magicHex = magic.toString('hex');
  logger.info('[img2prompt] Buffer received', {
    size: imageBuffer.length,
    magicHex,
    isJpeg: magicHex.startsWith('ffd8'),
    isPng: magicHex.startsWith('89504e47'),
    isWebp: imageBuffer.length > 12 && imageBuffer.slice(8, 12).toString('ascii') === 'WEBP',
    isGif: magicHex.startsWith('47494638'),
  });

  // 1. Resize image for analysis (save bandwidth)
  let sharp: any;
  try { sharp = require('sharp'); } catch { /* */ }

  let processedBase64: string;
  if (sharp) {
    try {
      const resized = await sharp(imageBuffer)
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      processedBase64 = resized.toString('base64');
    } catch (sharpError: any) {
      logger.warn('[img2prompt] Sharp resize failed, using raw buffer', {
        error: sharpError.message,
        bufferSize: imageBuffer.length,
        magicHex,
      });
      // Fallback: send raw image without resizing
      processedBase64 = imageBuffer.toString('base64');
    }
  } else {
    processedBase64 = imageBuffer.toString('base64');
  }

  // 2. Get Replicate API key
  const apiKey = await getReplicateApiKey();

  // 3. Run CLIP Interrogator
  const clipStartTime = Date.now();
  const clipTags = await runClipInterrogator(processedBase64, apiKey);
  const clipDuration = Date.now() - clipStartTime;

  logger.info('[img2prompt] CLIP Interrogator complete', {
    clipDuration,
    tagLength: clipTags.length,
    tags: clipTags.substring(0, 200),
  });

  // 4. LLM Synthesis
  const llmStartTime = Date.now();
  const synthesis = await synthesizePrompt(clipTags);
  const llmDuration = Date.now() - llmStartTime;

  const totalDuration = Date.now() - startTime;

  // 5. Log usage (non-blocking)
  const provider = await prisma.aiProvider.findFirst({
    where: { slug: { contains: 'replicate', mode: 'insensitive' }, isActive: true },
    select: { id: true },
  });

  if (provider) {
    prisma.aiUsageLog.create({
      data: {
        providerId: provider.id,
        feature: 'img2prompt',
        model: 'clip-interrogator',
        durationMs: totalDuration,
        success: true,
        costCents: 2, // ~$0.02
      },
    }).catch(() => {});
  }

  logger.info('[img2prompt] Analysis complete', {
    totalDuration,
    clipDuration,
    llmDuration,
    suggestedStyle: synthesis.suggestedStyle,
  });

  return {
    clipTags,
    synthesizedPrompt: synthesis.prompt,
    negativePrompt: synthesis.negativePrompt,
    suggestedStyle: synthesis.suggestedStyle,
    suggestedStrength: synthesis.suggestedStrength,
    metadata: {
      clipModel: 'clip-interrogator (ViT-L-14/openai)',
      llmModel: 'groq',
      durationMs: totalDuration,
      costEstimateCents: 2,
    },
  };
}
