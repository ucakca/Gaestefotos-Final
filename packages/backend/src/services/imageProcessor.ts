// Sharp import - fallback if not available
let sharp: any;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available, image processing will be limited');
}

export interface ProcessedImage {
  original: Buffer;    // Volle Qualität (nur EXIF stripped, keine Komprimierung)
  thumbnail: Buffer;   // 300x300 für Previews
  optimized: Buffer;   // 1920px für Galerie-Ansicht
}

export class ImageProcessor {
  /**
   * Process uploaded image
   * - Original: Full quality, only EXIF stripped (for Host download)
   * - Optimized: max 1920px, 85% quality (for guest gallery view)
   * - Thumbnail: 300x300 (for previews)
   */
  async processImage(buffer: Buffer): Promise<ProcessedImage> {
    if (!sharp) {
      // Fallback: return original if sharp not available
      return {
        original: buffer,
        thumbnail: buffer,
        optimized: buffer,
      };
    }

    // Original: Full quality, only rotate and strip EXIF/GPS for privacy
    const original = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .withMetadata({ orientation: undefined }) // Strip all EXIF including GPS
      .toBuffer();

    // Optimized: Resize for gallery view (1920px max, good quality)
    const optimized = await sharp(buffer)
      .rotate()
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .withMetadata({ orientation: undefined })
      .toBuffer();

    // Thumbnail: Small preview (300px)
    const thumbnail = await sharp(buffer)
      .rotate()
      .resize(300, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 75 })
      .withMetadata({ orientation: undefined })
      .toBuffer();

    return {
      original,
      thumbnail,
      optimized,
    };
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer: Buffer) {
    if (!sharp) {
      return {
        width: 0,
        height: 0,
        format: 'unknown',
        size: buffer.length,
      };
    }

    const metadata = await sharp(buffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    };
  }
}

export const imageProcessor = new ImageProcessor();

