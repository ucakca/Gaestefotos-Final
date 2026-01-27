import ExifParser from 'exif-parser';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { readFile } from 'fs/promises';

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: Date;
  gps?: {
    latitude: number;
    longitude: number;
  };
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  focalLength?: number;
  flash?: number;
}

/**
 * Extract EXIF data from image file
 */
export async function extractExifData(filePath: string): Promise<ExifData | null> {
  try {
    const buffer = await readFile(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();

    const exif: ExifData = {};

    if (result.tags) {
      exif.make = result.tags.Make;
      exif.model = result.tags.Model;
      exif.fNumber = result.tags.FNumber;
      exif.exposureTime = result.tags.ExposureTime;
      exif.iso = result.tags.ISO;
      exif.focalLength = result.tags.FocalLength;
      exif.flash = result.tags.Flash;

      if (result.tags.DateTimeOriginal) {
        exif.dateTime = new Date(result.tags.DateTimeOriginal * 1000);
      }

      if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
        exif.gps = {
          latitude: result.tags.GPSLatitude,
          longitude: result.tags.GPSLongitude,
        };
      }
    }

    return exif;
  } catch (error) {
    logger.error('[photoCategories] EXIF extraction failed', {
      error: (error as Error).message,
      filePath,
    });
    return null;
  }
}

/**
 * Smart category assignment based on EXIF data
 */
export async function assignSmartCategory(
  eventId: string,
  photoId: string,
  exifData: ExifData
): Promise<string | null> {
  try {
    // Check if event has auto-categorization enabled
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        featuresConfig: true,
        dateTime: true,
      },
    });

    if (!event) return null;

    const featuresConfig = event.featuresConfig as any;
    if (!featuresConfig?.autoCategories) return null;

    // Get or create categories based on EXIF data
    let categoryId: string | null = null;

    // 1. Time-based categorization
    if (exifData.dateTime && event.dateTime) {
      const eventDate = new Date(event.dateTime);
      const photoDate = exifData.dateTime;
      
      const hoursDiff = Math.abs(photoDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60);

      let categoryName: string | null = null;

      if (hoursDiff < 2) {
        categoryName = 'Während der Feier';
      } else if (hoursDiff < 12 && photoDate < eventDate) {
        categoryName = 'Vorbereitung';
      } else if (hoursDiff < 12 && photoDate > eventDate) {
        categoryName = 'Nach der Feier';
      }

      if (categoryName) {
        categoryId = await getOrCreateCategory(eventId, categoryName, 'time');
      }
    }

    // 2. Camera-based categorization (professional vs. casual)
    if (!categoryId && exifData.make) {
      const professionalBrands = ['Canon', 'Nikon', 'Sony', 'Fujifilm'];
      const isProfessional = professionalBrands.some(brand => 
        exifData.make?.includes(brand)
      );

      if (isProfessional && exifData.model?.match(/EOS|Z\d+|Alpha|X-T/)) {
        categoryId = await getOrCreateCategory(eventId, 'Professionelle Fotos', 'camera');
      } else {
        categoryId = await getOrCreateCategory(eventId, 'Gäste-Fotos', 'camera');
      }
    }

    // 3. Flash usage (indoor vs. outdoor)
    if (!categoryId && exifData.flash !== undefined) {
      const flashUsed = exifData.flash > 0;
      const categoryName = flashUsed ? 'Indoor-Fotos' : 'Outdoor-Fotos';
      categoryId = await getOrCreateCategory(eventId, categoryName, 'lighting');
    }

    // Update photo with assigned category
    if (categoryId) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { categoryId },
      });

      logger.info('[photoCategories] Smart category assigned', {
        photoId,
        categoryId,
        eventId,
      });
    }

    return categoryId;
  } catch (error) {
    logger.error('[photoCategories] Smart category assignment failed', {
      error: (error as Error).message,
      photoId,
      eventId,
    });
    return null;
  }
}

/**
 * Get or create category by name and type
 */
async function getOrCreateCategory(
  eventId: string,
  name: string,
  type: string
): Promise<string> {
  // Check if category exists
  let category = await prisma.category.findFirst({
    where: {
      eventId,
      name,
    },
  });

  if (!category) {
    // Get current max sort order
    const maxSort = await prisma.category.findFirst({
      where: { eventId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const nextSortOrder = (maxSort?.order || 0) + 1;

    // Create new category
    category = await prisma.category.create({
      data: {
        eventId,
        name,
        order: nextSortOrder,
      },
    });

    logger.info('[photoCategories] Auto-category created', {
      eventId,
      categoryId: category.id,
      name,
      type,
    });
  }

  return category.id;
}

/**
 * Batch process photos for smart categorization
 */
export async function batchProcessPhotoCategories(
  eventId: string,
  photoIds?: string[]
): Promise<{ processed: number; categorized: number; errors: number }> {
  const stats = {
    processed: 0,
    categorized: 0,
    errors: 0,
  };

  try {
    // Get photos to process
    const photos = await prisma.photo.findMany({
      where: {
        eventId,
        ...(photoIds ? { id: { in: photoIds } } : {}),
        categoryId: null, // Only process uncategorized photos
      },
      select: {
        id: true,
        storagePath: true,
      },
    });

    logger.info('[photoCategories] Batch processing started', {
      eventId,
      photoCount: photos.length,
    });

    for (const photo of photos) {
      stats.processed++;

      try {
        // Note: EXIF data would need to be extracted from file
        // This is a placeholder for future implementation
        // For now, we skip batch processing
        continue;
      } catch (error) {
        stats.errors++;
        logger.error('[photoCategories] Failed to process photo', {
          photoId: photo.id,
          error: (error as Error).message,
        });
      }
    }

    logger.info('[photoCategories] Batch processing completed', {
      eventId,
      stats,
    });

    return stats;
  } catch (error) {
    logger.error('[photoCategories] Batch processing failed', {
      eventId,
      error: (error as Error).message,
    });
    return stats;
  }
}

/**
 * Suggest category names based on existing photos
 */
export async function suggestCategories(eventId: string): Promise<string[]> {
  const suggestions: string[] = [];

  try {
    const photos = await prisma.photo.findMany({
      where: { eventId },
      select: { createdAt: true },
      take: 100, // Sample
    });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { dateTime: true },
    });

    // Analyze photo times
    const timeBuckets = {
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
    };

    photos.forEach(photo => {
      if (photo.createdAt) {
        const hour = new Date(photo.createdAt).getHours();
        if (hour >= 6 && hour < 12) timeBuckets.morning++;
        else if (hour >= 12 && hour < 17) timeBuckets.afternoon++;
        else if (hour >= 17 && hour < 21) timeBuckets.evening++;
        else timeBuckets.night++;
      }
    });

    // Suggest based on time distribution
    if (timeBuckets.morning > 5) suggestions.push('Vormittag');
    if (timeBuckets.afternoon > 5) suggestions.push('Nachmittag');
    if (timeBuckets.evening > 10) suggestions.push('Abend');
    if (timeBuckets.night > 5) suggestions.push('Nacht');

    // Common event categories
    suggestions.push(
      'Zeremonie',
      'Empfang',
      'Dinner',
      'Tanz',
      'Gruppenfotos',
      'Candid Momente',
      'Location'
    );

    return suggestions;
  } catch (error) {
    logger.error('[photoCategories] Failed to suggest categories', {
      eventId,
      error: (error as Error).message,
    });
    return [];
  }
}
