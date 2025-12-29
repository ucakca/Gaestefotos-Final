import { extractFaceDescriptor } from './faceRecognition';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { Prisma } from '@prisma/client';

/**
 * Extract face descriptor from reference image
 * This creates a "fingerprint" of the face that can be used for comparison
 */
export interface FaceDescriptor {
  descriptor: number[]; // Face embedding vector (128 dimensions)
  confidence: number;
}

/**
 * Extract face descriptor from reference image
 */
export async function extractFaceDescriptorFromImage(buffer: Buffer): Promise<FaceDescriptor | null> {
  try {
    // Use the face recognition service to extract descriptor
    const result = await extractFaceDescriptor(buffer);
    
    if (!result) {
      logger.warn('No face descriptor extracted from reference image');
      return null;
    }

    return {
      descriptor: result.descriptor,
      confidence: result.confidence,
    };
  } catch (error) {
    logger.error('Error extracting face descriptor:', error);
    return null;
  }
}

/**
 * Calculate similarity between two face descriptors using cosine similarity
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export function calculateFaceSimilarity(
  descriptor1: number[],
  descriptor2: number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    logger.warn('Face descriptors have different lengths');
    return 0;
  }

  // Cosine similarity (better for face recognition than Euclidean distance)
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < descriptor1.length; i++) {
    dotProduct += descriptor1[i] * descriptor2[i];
    norm1 += descriptor1[i] * descriptor1[i];
    norm2 += descriptor2[i] * descriptor2[i];
  }

  const magnitude1 = Math.sqrt(norm1);
  const magnitude2 = Math.sqrt(norm2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }

  // Cosine similarity: ranges from -1 to 1, but for normalized face descriptors it's 0 to 1
  const similarity = dotProduct / (magnitude1 * magnitude2);
  
  // Normalize to 0-1 range (face descriptors are usually already normalized, but ensure it)
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Search for photos containing a specific face
 */
export interface FaceSearchResult {
  photoId: string;
  photoUrl: string;
  similarity: number;
  facePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function searchPhotosByFace(
  eventId: string,
  referenceDescriptor: FaceDescriptor,
  minSimilarity: number = 0.6
): Promise<FaceSearchResult[]> {
  try {
    // Get all photos with face detection data
    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        deletedAt: null,
        faceCount: {
          gt: 0, // Only photos with detected faces
        },
        status: 'APPROVED', // Only approved photos
        faceData: {
          not: Prisma.DbNull,
        },
      },
      select: {
        id: true,
        url: true,
        faceData: true,
        storagePath: true,
      },
    });

    const results: FaceSearchResult[] = [];

    for (const photo of photos) {
      const faceData = photo.faceData as any;
      
      if (!faceData || !faceData.faces || faceData.faces.length === 0) {
        continue;
      }

      // Get stored descriptors from faceData
      const photoDescriptors = faceData.descriptors || [];
      
      if (photoDescriptors.length === 0) {
        // No descriptors stored - skip this photo
        // This happens if the photo was uploaded before face descriptors were implemented
        continue;
      }

      // Compare each detected face in the photo with the reference
      for (let i = 0; i < photoDescriptors.length; i++) {
        const photoDescriptor = photoDescriptors[i];
        const face = faceData.faces[i];

        if (!photoDescriptor || photoDescriptor.length !== referenceDescriptor.descriptor.length) {
          continue;
        }

        const similarity = calculateFaceSimilarity(
          referenceDescriptor.descriptor,
          photoDescriptor
        );

        if (similarity >= minSimilarity) {
          results.push({
            photoId: photo.id,
            photoUrl: photo.url || `/api/photos/${photo.id}/file`,
            similarity,
            facePosition: {
              x: face.x,
              y: face.y,
              width: face.width,
              height: face.height,
            },
          });
        }
      }
    }

    // Sort by similarity (highest first)
    results.sort((a, b) => b.similarity - a.similarity);

    logger.info(`Face search found ${results.length} matching photos`, {
      eventId,
      minSimilarity,
      searchedPhotos: photos.length,
    });

    return results;
  } catch (error) {
    logger.error('Error searching photos by face:', error);
    return [];
  }
}

/**
 * Store face descriptors for a photo (called during upload)
 * This ensures descriptors are available for future searches
 */
export async function storeFaceDescriptors(
  photoId: string,
  faceData: any
): Promise<void> {
  try {
    // Extract and store face descriptors for future search
    // This is called after face detection during upload
    
    if (!faceData || !faceData.faces || faceData.faces.length === 0) {
      return;
    }

    // Descriptors should already be in faceData.descriptors from getFaceDetectionMetadata
    // Just ensure they're stored properly
    if (faceData.descriptors && faceData.descriptors.length > 0) {
      await prisma.photo.update({
        where: { id: photoId },
        data: {
          faceData: {
            ...faceData,
            descriptors: faceData.descriptors, // Store 128-dimensional descriptors
          },
        },
      });
      
      logger.debug(`Stored ${faceData.descriptors.length} face descriptor(s) for photo ${photoId}`);
    }
  } catch (error) {
    logger.error('Error storing face descriptors:', error);
  }
}
