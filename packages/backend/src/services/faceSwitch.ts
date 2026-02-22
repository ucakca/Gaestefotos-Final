// @ts-nocheck
import { logger } from '../utils/logger';
import prisma from '../config/database';
import sharp from 'sharp';
import { prepareAiExecution, logAiUsage } from './aiExecution';

/**
 * Face Switch Service
 *
 * Swaps faces between people in a group photo using AI (FAL.ai inswapper).
 *
 * Flow:
 * 1. Read face bounding boxes stored in photo.faceData (set during upload by face-api)
 * 2. Crop each face region from the original image
 * 3. For each swap pair (A→B): call FAL.ai inswapper with
 *    base_image=crop_at_B, swap_image=crop_from_A
 *    → AI blends face A into position B's lighting/background
 * 4. Composite all AI-processed face crops back into the original image
 *
 * Fallback (no AI provider / API error): resize+paste (original behaviour)
 */

interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  buffer: Buffer;
}

interface FaceSwitchResult {
  outputBuffer: Buffer;
  facesDetected: number;
  facesSwapped: number;
  usedAi: boolean;
}

// ─── Face Data Parser ────────────────────────────────────────────────────────

/**
 * Extract face regions from stored faceData.
 * Supports both raw array format and {faces:[]} object format.
 */
async function extractFaceRegions(imageBuffer: Buffer, faceData: any): Promise<FaceRegion[]> {
  // Normalise to a plain array regardless of stored format
  let faceArray: any[] = [];
  if (Array.isArray(faceData)) {
    faceArray = faceData;
  } else if (faceData && Array.isArray(faceData.faces)) {
    faceArray = faceData.faces;
  }

  if (faceArray.length === 0) return [];

  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 1;
  const imgHeight = metadata.height || 1;

  return Promise.all(
    faceArray.map(async (face: any) => {
      // Coordinates may be absolute pixels or normalised 0-1 floats
      const isNormalised = (face.x || 0) <= 1 && (face.y || 0) <= 1 && (face.width || 0) <= 1;
      const x = isNormalised ? Math.round((face.x || 0) * imgWidth)  : Math.round(face.x || 0);
      const y = isNormalised ? Math.round((face.y || 0) * imgHeight) : Math.round(face.y || 0);
      const w = isNormalised ? Math.round((face.width  || 0.15) * imgWidth)  : Math.round(face.width  || 64);
      const h = isNormalised ? Math.round((face.height || 0.15) * imgHeight) : Math.round(face.height || 64);

      const safeX = Math.max(0, Math.min(x, imgWidth  - 2));
      const safeY = Math.max(0, Math.min(y, imgHeight - 2));
      const safeW = Math.max(2, Math.min(w, imgWidth  - safeX));
      const safeH = Math.max(2, Math.min(h, imgHeight - safeY));

      const buffer = await sharp(imageBuffer)
        .extract({ left: safeX, top: safeY, width: safeW, height: safeH })
        .jpeg({ quality: 95 })
        .toBuffer();

      return { x: safeX, y: safeY, width: safeW, height: safeH, buffer };
    })
  );
}

// ─── Swap Pair Builder ───────────────────────────────────────────────────────

/**
 * Build swap pairs. For 2 faces: A↔B. For 3+: rotate A→B→C→…→A.
 */
function buildSwapPairs(faces: FaceRegion[]): { from: FaceRegion; to: FaceRegion }[] {
  if (faces.length < 2) return [];
  return faces.map((face, i) => ({
    from: face,
    to: faces[(i + 1) % faces.length],
  }));
}

// ─── AI Provider Calls ───────────────────────────────────────────────────────

/**
 * Swap one face using FAL.ai inswapper.
 *
 * base_image  = the face crop at the TARGET position (defines lighting/context)
 * swap_image  = the face crop we want to INSERT
 * → returns the swapped face resized to target dimensions
 */
async function swapFaceWithFal(
  fromFaceBuffer: Buffer,
  toFaceBuffer:   Buffer,
  toWidth: number,
  toHeight: number,
  provider: any,
): Promise<Buffer> {
  const model = provider.model || 'fal-ai/inswapper';
  const apiUrl = `https://fal.run/${model}`;

  const baseB64 = toFaceBuffer.toString('base64');
  const swapB64 = fromFaceBuffer.toString('base64');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      base_image_url: `data:image/jpeg;base64,${baseB64}`,
      swap_image_url: `data:image/jpeg;base64,${swapB64}`,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`FAL.ai inswapper error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data: any = await response.json();
  const outputUrl: string | undefined =
    data?.image?.url ??
    data?.images?.[0]?.url ??
    (typeof data?.image === 'string' ? data.image : undefined);

  if (!outputUrl) throw new Error('No output image from FAL.ai inswapper');

  let resultBuf: Buffer;
  if (outputUrl.startsWith('data:')) {
    resultBuf = Buffer.from(outputUrl.split(',')[1], 'base64');
  } else {
    const imgRes = await fetch(outputUrl);
    if (!imgRes.ok) throw new Error(`FAL.ai result fetch failed: ${imgRes.status}`);
    resultBuf = Buffer.from(await imgRes.arrayBuffer());
  }

  return sharp(resultBuf).resize(toWidth, toHeight, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer();
}

/**
 * Swap one face using Replicate (zsxkib/ghost or similar).
 */
async function swapFaceWithReplicate(
  fromFaceBuffer: Buffer,
  toFaceBuffer:   Buffer,
  toWidth: number,
  toHeight: number,
  provider: any,
): Promise<Buffer> {
  const baseUrl = provider.baseUrl || 'https://api.replicate.com';
  const model = provider.model || 'deepinsight/insightface:35cfef47cf6a671d9a3b4e3ddd3bbd254e4956b35ecdca1d27578d987ae6feae';
  const version = model.includes(':') ? model.split(':')[1] : model;

  const baseB64 = `data:image/jpeg;base64,${toFaceBuffer.toString('base64')}`;
  const swapB64 = `data:image/jpeg;base64,${fromFaceBuffer.toString('base64')}`;

  const createRes = await fetch(`${baseUrl}/v1/predictions`, {
    method: 'POST',
    headers: { 'Authorization': `Token ${provider.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, input: { target_image: baseB64, source_image: swapB64 } }),
  });
  if (!createRes.ok) throw new Error(`Replicate face swap create error ${createRes.status}`);

  let result: any = await createRes.json();
  for (let i = 0; i < 60; i++) {
    if (result.status === 'succeeded') break;
    if (result.status === 'failed' || result.status === 'canceled') {
      throw new Error(`Replicate face swap ${result.status}: ${result.error || 'unknown'}`);
    }
    await new Promise(r => setTimeout(r, 1500));
    const pollRes = await fetch(result.urls.get, { headers: { 'Authorization': `Token ${provider.apiKey}` } });
    result = await pollRes.json();
  }
  if (result.status !== 'succeeded') throw new Error('Replicate face swap timed out');

  const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output;
  const imgRes = await fetch(outputUrl);
  const resultBuf = Buffer.from(await imgRes.arrayBuffer());

  return sharp(resultBuf).resize(toWidth, toHeight, { fit: 'fill' }).jpeg({ quality: 92 }).toBuffer();
}

// ─── Core Face Switch ────────────────────────────────────────────────────────

/**
 * Perform face switch on an image.
 * Uses AI provider if available, falls back to simple resize+paste.
 */
export async function performFaceSwitch(
  imageBuffer: Buffer,
  faceData?: any,
  provider?: any,
): Promise<FaceSwitchResult> {
  const faces = await extractFaceRegions(imageBuffer, faceData);

  if (faces.length < 2) {
    logger.info('Face switch: not enough faces', { count: faces.length });
    return { outputBuffer: imageBuffer, facesDetected: faces.length, facesSwapped: 0, usedAi: false };
  }

  const pairs = buildSwapPairs(faces);
  const isFal      = provider?.slug?.includes('fal') || provider?.baseUrl?.includes('fal.run');
  const isReplicate = provider?.slug?.includes('replicate') || provider?.baseUrl?.includes('replicate.com');
  const useAi = !!provider?.apiKey && (isFal || isReplicate);

  let usedAi = false;

  const composites = await Promise.all(
    pairs.map(async ({ from, to }) => {
      const fallback = () => sharp(from.buffer).resize(to.width, to.height, { fit: 'fill' }).toBuffer();

      let aiResult: Buffer | null = null;
      if (useAi) {
        try {
          aiResult = isFal
            ? await swapFaceWithFal(from.buffer, to.buffer, to.width, to.height, provider)
            : await swapFaceWithReplicate(from.buffer, to.buffer, to.width, to.height, provider);
        } catch (err: any) {
          logger.warn('AI face swap failed — falling back to resize+paste', { err: err.message });
        }
      }

      if (aiResult) usedAi = true;
      const swappedBuffer = aiResult ?? await fallback();

      return { input: swappedBuffer, left: to.x, top: to.y };
    })
  );

  const outputBuffer = await sharp(imageBuffer)
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  logger.info('Face switch completed', { facesDetected: faces.length, facesSwapped: pairs.length, usedAi });

  return { outputBuffer, facesDetected: faces.length, facesSwapped: pairs.length, usedAi };
}

// ─── Public Entry Point ──────────────────────────────────────────────────────

/**
 * Process face switch for a photo and save as new photo.
 */
export async function processFaceSwitchForPhoto(
  photoId: string,
  userId: string,
): Promise<{ newPhotoPath: string; facesSwapped: number; usedAi: boolean }> {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
    select: { id: true, eventId: true, storagePath: true, faceData: true, faceCount: true },
  });

  if (!photo || !photo.storagePath) {
    throw new Error('Foto nicht gefunden');
  }

  if ((photo.faceCount || 0) < 2) {
    throw new Error('Mindestens 2 Gesichter im Foto nötig');
  }

  const startTime = Date.now();
  const execution = await prepareAiExecution(userId, 'face_switch', photo.eventId);
  if (!execution.success) {
    throw new Error(execution.error || 'AI-Feature nicht verfügbar');
  }

  const { storageService } = await import('./storage');
  const imageBuffer = await storageService.getFile(photo.storagePath);

  // Pass provider so performFaceSwitch can use AI — this was the missing piece
  const result = await performFaceSwitch(imageBuffer, photo.faceData, execution.provider);

  if (result.facesSwapped === 0) {
    throw new Error('Konnte keine Gesichter tauschen');
  }

  const durationMs = Date.now() - startTime;
  if (execution.provider) {
    await logAiUsage(execution.provider.id, 'face_switch', {
      providerType: execution.provider.type,
      durationMs,
      success: true,
    });
  }

  const newPath = await storageService.uploadFile(
    photo.eventId,
    `face-switch-${photoId}.jpg`,
    result.outputBuffer,
    'image/jpeg'
  );

  return { newPhotoPath: newPath, facesSwapped: result.facesSwapped, usedAi: result.usedAi };
}
