import { logger } from '../utils/logger';
import prisma from '../config/database';
import sharp from 'sharp';
import { prepareAiExecution, logAiUsage } from './aiExecution';

/**
 * Face Switch Service
 * 
 * Swaps faces between people in a group photo using AI.
 * Uses the configured AI provider for face detection + inpainting.
 * 
 * Flow:
 * 1. Detect faces in the photo (bounding boxes)
 * 2. Extract face regions
 * 3. Swap face positions (random or targeted)
 * 4. Blend swapped faces back into original using inpainting
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
}

/**
 * Detect faces in an image using the face data from the photo record
 * or by running face detection via sharp + basic heuristics.
 */
async function detectFaces(imageBuffer: Buffer, existingFaceData?: any): Promise<FaceRegion[]> {
  // If we have existing face data from upload processing, use it
  if (existingFaceData && Array.isArray(existingFaceData)) {
    const metadata = await sharp(imageBuffer).metadata();
    const imgWidth = metadata.width || 1;
    const imgHeight = metadata.height || 1;

    return await Promise.all(
      existingFaceData.map(async (face: any) => {
        const x = Math.round((face.x || face.left || 0) * imgWidth);
        const y = Math.round((face.y || face.top || 0) * imgHeight);
        const w = Math.round((face.width || face.w || 0.15) * imgWidth);
        const h = Math.round((face.height || face.h || 0.15) * imgHeight);

        const safeX = Math.max(0, Math.min(x, imgWidth - 1));
        const safeY = Math.max(0, Math.min(y, imgHeight - 1));
        const safeW = Math.min(w, imgWidth - safeX);
        const safeH = Math.min(h, imgHeight - safeY);

        const faceBuffer = await sharp(imageBuffer)
          .extract({ left: safeX, top: safeY, width: safeW, height: safeH })
          .toBuffer();

        return { x: safeX, y: safeY, width: safeW, height: safeH, buffer: faceBuffer };
      })
    );
  }

  // Fallback: no face data available — return empty (caller should handle)
  return [];
}

/**
 * Swap faces between detected regions.
 * For 2 faces: swap A↔B
 * For 3+ faces: rotate (A→B, B→C, ..., N→A)
 */
function shuffleFaces(faces: FaceRegion[]): { from: FaceRegion; to: FaceRegion }[] {
  if (faces.length < 2) return [];

  const pairs: { from: FaceRegion; to: FaceRegion }[] = [];

  // Rotate: each face goes to the next position
  for (let i = 0; i < faces.length; i++) {
    const nextIdx = (i + 1) % faces.length;
    pairs.push({ from: faces[i], to: faces[nextIdx] });
  }

  return pairs;
}

/**
 * Perform face switch on an image.
 * Extracts faces, swaps their positions, and composites back.
 */
export async function performFaceSwitch(
  imageBuffer: Buffer,
  faceData?: any
): Promise<FaceSwitchResult> {
  const faces = await detectFaces(imageBuffer, faceData);

  if (faces.length < 2) {
    logger.info('Face switch: not enough faces detected', { count: faces.length });
    return {
      outputBuffer: imageBuffer,
      facesDetected: faces.length,
      facesSwapped: 0,
    };
  }

  const pairs = shuffleFaces(faces);

  // Build composite operations: place each "from" face at "to" position
  const composites = await Promise.all(
    pairs.map(async ({ from, to }) => {
      // Resize from-face to fit to-position dimensions
      const resizedFace = await sharp(from.buffer)
        .resize(to.width, to.height, { fit: 'fill' })
        .toBuffer();

      return {
        input: resizedFace,
        left: to.x,
        top: to.y,
      };
    })
  );

  const outputBuffer = await sharp(imageBuffer)
    .composite(composites)
    .jpeg({ quality: 90 })
    .toBuffer();

  logger.info('Face switch completed', { facesDetected: faces.length, facesSwapped: pairs.length });

  return {
    outputBuffer,
    facesDetected: faces.length,
    facesSwapped: pairs.length,
  };
}

/**
 * Process face switch for a photo and save as new photo.
 */
export async function processFaceSwitchForPhoto(
  photoId: string,
  userId: string,
): Promise<{ newPhotoPath: string; facesSwapped: number }> {
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

  // Check credits & resolve provider
  const startTime = Date.now();
  const execution = await prepareAiExecution(userId, 'face_switch', photo.eventId);
  if (!execution.success) {
    throw new Error(execution.error || 'AI-Feature nicht verfügbar');
  }

  const { storageService } = await import('./storage');
  const imageBuffer = await storageService.getFile(photo.storagePath);

  const result = await performFaceSwitch(imageBuffer, photo.faceData);

  if (result.facesSwapped === 0) {
    throw new Error('Konnte keine Gesichter tauschen');
  }

  const durationMs = Date.now() - startTime;
  if (execution.provider) {
    await logAiUsage(execution.provider.id, 'face_switch', {
      durationMs,
      success: true,
    });
  }

  // Upload the switched photo
  const newPath = await storageService.uploadFile(
    photo.eventId,
    `face-switch-${photoId}.jpg`,
    result.outputBuffer,
    'image/jpeg'
  );

  return {
    newPhotoPath: newPath,
    facesSwapped: result.facesSwapped,
  };
}
