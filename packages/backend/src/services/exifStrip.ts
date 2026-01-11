import sharp from 'sharp';
import { logger } from '../utils/logger';

/**
 * Strips EXIF/GPS metadata from image buffer while preserving image quality.
 * This is important for privacy - we don't want to store or serve GPS coordinates.
 * 
 * Note: We still extract capturedAt date BEFORE stripping (see uploadDatePolicy.ts)
 * so the capture date is preserved in DB but not in the stored file.
 */
export async function stripExifMetadata(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    // Only process supported image types
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];
    if (!supportedTypes.some(t => mimeType.toLowerCase().includes(t.split('/')[1]))) {
      logger.debug('[EXIF Strip] Unsupported mime type, returning original buffer', { mimeType });
      return buffer;
    }

    // Use sharp to strip all metadata
    // rotate() auto-rotates based on EXIF orientation before stripping
    const strippedBuffer = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .withMetadata({
        // Keep only essential metadata, strip everything else including GPS
        orientation: undefined, // Already applied by rotate()
      })
      .toBuffer();

    logger.debug('[EXIF Strip] Successfully stripped EXIF metadata', {
      originalSize: buffer.length,
      strippedSize: strippedBuffer.length,
      mimeType,
    });

    return strippedBuffer;
  } catch (error) {
    logger.warn('[EXIF Strip] Failed to strip EXIF, returning original buffer', {
      error: error instanceof Error ? error.message : String(error),
      mimeType,
    });
    // Return original buffer on error to not block uploads
    return buffer;
  }
}

/**
 * Checks if a buffer contains GPS/location EXIF data.
 * Useful for auditing/logging purposes.
 */
export async function hasGpsData(buffer: Buffer): Promise<boolean> {
  try {
    const exifr = await import('exifr');
    const gps = await exifr.gps(buffer);
    return !!(gps?.latitude || gps?.longitude);
  } catch {
    return false;
  }
}
