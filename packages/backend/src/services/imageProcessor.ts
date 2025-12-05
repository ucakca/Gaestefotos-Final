// Sharp import - fallback if not available
let sharp: any;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available, image processing will be limited');
}

export interface ProcessedImage {
  original: Buffer;
  thumbnail: Buffer;
  optimized: Buffer;
}

export class ImageProcessor {
  /**
   * Process uploaded image
   * - Create thumbnail (300x300)
   * - Optimize original (max 1920px, 80% quality)
   */
  async processImage(buffer: Buffer): Promise<ProcessedImage> {
    if (!sharp) {
      // Fallback: return original if sharp not available
      return {
        original: buffer,
        thumbnail: buffer, // No thumbnail processing
        optimized: buffer,
      };
    }

    const original = await sharp(buffer)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnail = await sharp(buffer)
      .resize(300, 300, {
        fit: 'cover',
      })
      .jpeg({ quality: 75 })
      .toBuffer();

    return {
      original: buffer, // Keep original for now
      thumbnail,
      optimized: original,
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

