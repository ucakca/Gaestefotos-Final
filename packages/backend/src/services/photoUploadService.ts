/**
 * Shared Photo Upload Service
 * 
 * Consolidates duplicate photo processing logic from:
 * - routes/uploads.ts (TUS uploads)
 * - routes/photos.ts (Multipart uploads)
 * 
 * Single source of truth for: image processing → storage upload → DB record creation
 */

import prisma from '../config/database';
import { imageProcessor } from './imageProcessor';
import { storageService } from './storage';
import { assertUploadWithinLimit, releaseStorageReservation } from './packageLimits';
import { extractCapturedAtFromImage } from './uploadDatePolicy';
import { selectSmartCategoryId } from './smartAlbum';
import { resolveSmartCategoryId } from './photoCategories';
import { logger } from '../utils/logger';

export interface PhotoUploadInput {
  eventId: string;
  buffer: Buffer;
  filename: string;
  mimetype: string;
  uploadedBy?: string | null;
  categoryId?: string | null;
  isGuest?: boolean;
  status?: 'PENDING' | 'APPROVED';
  progressivePhotoId?: string | null;
}

export interface PhotoUploadResult {
  photoId: string;
  photo: any;
  storagePath: string;
  uploadBytes: bigint;
  isProgressiveUpdate: boolean;
}

/**
 * Process and store an uploaded photo.
 * Handles: image variants, smart album categorization, storage limit check,
 * SeaweedFS upload, and DB record creation.
 */
export async function processUploadedPhoto(input: PhotoUploadInput): Promise<PhotoUploadResult> {
  const {
    eventId,
    buffer,
    filename,
    mimetype,
    uploadedBy = null,
    categoryId = null,
    isGuest = true,
    status = 'PENDING',
    progressivePhotoId = null,
  } = input;

  // 1. Process image into variants
  const processed = await imageProcessor.processImage(buffer);

  // 2. Calculate total size and check storage limit
  const uploadBytes = BigInt(
    processed.original.length +
    processed.optimized.length +
    processed.thumbnail.length +
    processed.webp.length
  );
  await assertUploadWithinLimit(eventId, uploadBytes);

  // 3. Extract EXIF data for smart categorization
  const uploadTime = new Date();
  const capturedAtResult = await extractCapturedAtFromImage(buffer, uploadTime);

  // 4. Resolve category via Smart Album Chain
  let resolvedCategoryId = categoryId || null;
  if (!resolvedCategoryId) {
    resolvedCategoryId = await selectSmartCategoryId({
      eventId,
      capturedAt: capturedAtResult.capturedAt,
      isGuest,
    });
  }
  if (!resolvedCategoryId && !categoryId) {
    resolvedCategoryId = await resolveSmartCategoryId(eventId, {
      dateTime: capturedAtResult.capturedAt,
    });
  }

  // 5. Upload all variants to SeaweedFS in parallel
  const baseFilename = filename.replace(/\.[^/.]+$/, '');
  const ext = filename.match(/\.[^/.]+$/)?.[0] || '.jpg';

  const [storagePath, storagePathOriginal, storagePathThumb, storagePathWebp] = await Promise.all([
    storageService.uploadFile(eventId, `${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
    storageService.uploadFile(eventId, `${baseFilename}_orig${ext}`, processed.original, mimetype),
    storageService.uploadFile(eventId, `${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
    storageService.uploadFile(eventId, `${baseFilename}_webp.webp`, processed.webp, 'image/webp'),
  ]);

  // 6. Create or update DB record
  let photoId: string;
  let photo: any;
  let isProgressiveUpdate = false;

  // Check progressive upload record existence
  const progressiveExists = progressivePhotoId
    ? await prisma.photo.findUnique({ where: { id: progressivePhotoId } })
    : null;

  if (progressivePhotoId && !progressiveExists) {
    logger.warn('[PhotoUploadService] Progressive Phase 1 record not found, falling back to standard', { progressivePhotoId, eventId });
  }

  if (progressivePhotoId && progressiveExists) {
    // Progressive Upload Phase 2: Update existing record
    photo = await prisma.photo.update({
      where: { id: progressivePhotoId },
      data: {
        storagePath,
        storagePathOriginal,
        storagePathThumb,
        storagePathWebp,
        categoryId: resolvedCategoryId,
        sizeBytes: uploadBytes,
        tags: [],
      },
    });
    photoId = photo.id;
    isProgressiveUpdate = true;
    logger.info('[PhotoUploadService] Progressive upload completed', { eventId, photoId });
  } else {
    // Standard upload: Create new record
    photo = await prisma.photo.create({
      data: {
        eventId,
        storagePath,
        storagePathOriginal,
        storagePathThumb,
        storagePathWebp,
        categoryId: resolvedCategoryId,
        url: '',
        status,
        sizeBytes: uploadBytes,
        uploadedBy: uploadedBy || null,
      },
    });
    photoId = photo.id;

    // Update URL to point to the proxy endpoint
    await prisma.photo.update({
      where: { id: photoId },
      data: { url: `/cdn/${photoId}` },
    });
    photo.url = `/cdn/${photoId}`;
  }

  // 7. Release storage reservation (from Redis lock)
  await releaseStorageReservation(eventId, uploadBytes);

  return {
    photoId,
    photo,
    storagePath,
    uploadBytes,
    isProgressiveUpdate,
  };
}
