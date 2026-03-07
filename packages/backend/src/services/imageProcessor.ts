// Sharp import - fallback if not available
let sharp: any;
try {
  sharp = require('sharp');
} catch (error) {
  // Sharp not available warning handled silently - logger not available at module load time
}

export interface ProcessedImage {
  original: Buffer;    // Volle Qualität (nur EXIF stripped, keine Komprimierung)
  thumbnail: Buffer;   // 300x300 für Previews
  optimized: Buffer;   // 1920px für Galerie-Ansicht
  webp: Buffer;        // 1920px WebP für moderne Browser (30-50% kleiner)
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
      // Sharp is required for image processing - fail fast to avoid serving uncompressed 12MB images
      throw new Error('Sharp image processor not available - cannot process uploads');
    }

    // Decode buffer once, clone() for each variant (ARCH-05)
    const pipeline = sharp(buffer).rotate();

    // Original: Full quality, only rotate and strip EXIF/GPS for privacy
    const original = await pipeline.clone().toBuffer();

    // Optimized: Resize for gallery view (1920px max, good quality)
    const optimized = await pipeline
      .clone()
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Thumbnail: Small preview (300px)
    const thumbnail = await pipeline
      .clone()
      .resize(300, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer();

    // WebP: Same as optimized but WebP format (30-50% smaller)
    const webp = await pipeline
      .clone()
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      original,
      thumbnail,
      optimized,
      webp,
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

