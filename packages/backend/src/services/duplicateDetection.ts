import crypto from 'crypto';
import { imageProcessor } from './imageProcessor';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Threshold für ähnliche Bilder (0-64, niedriger = ähnlicher)
const SIMILARITY_THRESHOLD = 5; // Bilder mit Hamming-Distanz <= 5 gelten als ähnlich

export interface DuplicateResult {
  isDuplicate: boolean;
  duplicateGroupId?: string;
  isBestInGroup: boolean;
  similarPhotos?: Array<{ id: string; similarity: number }>;
}

/**
 * Calculate MD5 hash for exact duplicate detection
 */
export function calculateMD5Hash(buffer: Buffer): string {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

/**
 * Calculate perceptual hash (pHash) for similar image detection
 * Uses average hash algorithm (aHash)
 */
export async function calculatePerceptualHash(buffer: Buffer): Promise<string> {
  try {
    // Resize to 8x8 for hash calculation
    const sharp = require('sharp');
    const resized = await sharp(buffer)
      .resize(8, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();

    // Calculate average
    let sum = 0;
    for (let i = 0; i < resized.length; i++) {
      sum += resized[i];
    }
    const average = sum / resized.length;

    // Create hash: 1 if pixel > average, 0 otherwise
    let hash = '';
    for (let i = 0; i < resized.length; i++) {
      hash += resized[i] > average ? '1' : '0';
    }

    return hash;
  } catch (error) {
    logger.error('Error calculating perceptual hash:', error);
    // Fallback: use MD5 if sharp fails
    return calculateMD5Hash(buffer);
  }
}

/**
 * Calculate Hamming distance between two hashes
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Calculate quality score for a photo
 * Higher score = better photo
 */
export async function calculateQualityScore(buffer: Buffer, metadata?: any): Promise<number> {
  let score = 0;

  try {
    const sharp = require('sharp');
    const img = sharp(buffer);
    const meta = metadata || await img.metadata();

    // Resolution score (higher resolution = better)
    const resolution = (meta.width || 0) * (meta.height || 0);
    score += Math.min(resolution / 1000000, 10); // Max 10 points

    // File size (reasonable size = better, too small or too large = worse)
    const fileSize = buffer.length;
    if (fileSize > 50000 && fileSize < 5000000) {
      score += 5; // Good size
    } else if (fileSize < 10000) {
      score -= 5; // Too small
    }

    // Format score (WebP/JPEG = better)
    if (meta.format === 'webp' || meta.format === 'jpeg') {
      score += 2;
    }

    // Sharpness (basic check via variance)
    // This is simplified - in production you might want more sophisticated analysis
    score += 3; // Base score

  } catch (error) {
    logger.error('Error calculating quality score:', error);
    score = 5; // Default score
  }

  return Math.max(0, score); // Ensure non-negative
}

/**
 * Find duplicate photos in an event
 */
export async function findDuplicatePhotos(
  eventId: string,
  perceptualHash: string,
  md5Hash: string
): Promise<Array<{ id: string; perceptualHash: string; qualityScore: number | null }>> {
  // First check for exact duplicates (MD5)
  const exactDuplicates = await prisma.photo.findMany({
    where: {
      eventId,
      md5Hash,
      status: {
        not: 'DELETED',
      },
    },
    select: {
      id: true,
      perceptualHash: true,
      qualityScore: true,
    },
  });

  if (exactDuplicates.length > 0) {
    // Filter out null perceptualHash values and map to correct type
    return exactDuplicates
      .filter((p): p is { id: string; perceptualHash: string; qualityScore: number | null } => p.perceptualHash !== null)
      .map(p => ({
        id: p.id,
        perceptualHash: p.perceptualHash!,
        qualityScore: p.qualityScore,
      }));
  }

  // Then check for similar photos (perceptual hash)
  const allPhotos = await prisma.photo.findMany({
    where: {
      eventId,
      perceptualHash: {
        not: null,
      },
      status: {
        not: 'DELETED',
      },
    },
    select: {
      id: true,
      perceptualHash: true,
      qualityScore: true,
    },
  });

  const similarPhotos: Array<{ id: string; perceptualHash: string; qualityScore: number | null }> = [];

  for (const photo of allPhotos) {
    if (photo.perceptualHash) {
      const distance = hammingDistance(perceptualHash, photo.perceptualHash);
      if (distance <= SIMILARITY_THRESHOLD) {
        similarPhotos.push({
          id: photo.id,
          perceptualHash: photo.perceptualHash,
          qualityScore: photo.qualityScore,
        });
      }
    }
  }

  return similarPhotos;
}

/**
 * Determine best photo in a duplicate group
 */
export async function determineBestPhoto(
  photoIds: string[]
): Promise<string> {
  if (photoIds.length === 0) {
    throw new Error('No photos provided');
  }

  if (photoIds.length === 1) {
    return photoIds[0];
  }

  // Get all photos with their quality scores
  const photos = await prisma.photo.findMany({
    where: {
      id: {
        in: photoIds,
      },
    },
    select: {
      id: true,
      qualityScore: true,
      createdAt: true,
      views: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  // Calculate composite score
  const scores = photos.map(photo => {
    let score = photo.qualityScore || 0;
    
    // Bonus for newer photos
    const ageInHours = (Date.now() - new Date(photo.createdAt).getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 10 - ageInHours / 24); // Bonus decreases over time
    
    // Bonus for engagement
    score += (photo._count.likes || 0) * 0.5;
    score += (photo._count.comments || 0) * 1;
    score += (photo.views || 0) * 0.1;
    
    return { id: photo.id, score };
  });

  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  return scores[0].id;
}

/**
 * Process duplicate detection for a new photo
 */
export async function processDuplicateDetection(
  eventId: string,
  photoId: string,
  buffer: Buffer,
  metadata?: any
): Promise<DuplicateResult> {
  try {
    // Calculate hashes
    const md5Hash = calculateMD5Hash(buffer);
    const perceptualHash = await calculatePerceptualHash(buffer);
    const qualityScore = await calculateQualityScore(buffer, metadata);

    // Update photo with hashes and quality score
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        md5Hash,
        perceptualHash,
        qualityScore,
      },
    });

    // Find duplicates
    const duplicates = await findDuplicatePhotos(eventId, perceptualHash, md5Hash);

    if (duplicates.length === 0) {
      // No duplicates, this is a unique photo
      return {
        isDuplicate: false,
        isBestInGroup: true,
      };
    }

    // Found duplicates - create or use existing group
    const allPhotoIds = [photoId, ...duplicates.map(d => d.id)];
    const bestPhotoId = await determineBestPhoto(allPhotoIds);

    // Generate or get duplicate group ID
    let duplicateGroupId: string;
    if (duplicates.length > 0) {
      const existingGroup = await prisma.photo.findUnique({
        where: { id: duplicates[0].id },
        select: { duplicateGroupId: true },
      });
      duplicateGroupId = existingGroup?.duplicateGroupId || `group_${duplicates[0].id}`;
    } else {
      duplicateGroupId = `group_${photoId}`;
    }

    // Update all photos in the group
    await prisma.photo.updateMany({
      where: {
        id: {
          in: allPhotoIds,
        },
      },
      data: {
        duplicateGroupId,
        isBestInGroup: false, // Reset all first
      },
    });

    // Mark best photo
    await prisma.photo.update({
      where: { id: bestPhotoId },
      data: {
        isBestInGroup: true,
      },
    });

    return {
      isDuplicate: true,
      duplicateGroupId,
      isBestInGroup: bestPhotoId === photoId,
      similarPhotos: duplicates.map(d => ({
        id: d.id,
        similarity: 100 - (hammingDistance(perceptualHash, d.perceptualHash || '') * 10), // Percentage
      })),
    };
  } catch (error) {
    logger.error('Error in duplicate detection:', error);
    // Return safe default
    return {
      isDuplicate: false,
      isBestInGroup: true,
    };
  }
}

