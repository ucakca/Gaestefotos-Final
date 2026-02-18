import { describe, it, expect } from 'vitest';
import { imageProcessor } from '../services/imageProcessor';
import sharp from 'sharp';

describe('imageProcessor', () => {
  // Create a minimal valid JPEG for testing
  async function createTestImage(width = 800, height = 600): Promise<Buffer> {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  describe('processImage', () => {
    it('returns all 4 variants (original, optimized, thumbnail, webp)', async () => {
      const input = await createTestImage();
      const result = await imageProcessor.processImage(input);

      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('optimized');
      expect(result).toHaveProperty('thumbnail');
      expect(result).toHaveProperty('webp');
      expect(Buffer.isBuffer(result.original)).toBe(true);
      expect(Buffer.isBuffer(result.optimized)).toBe(true);
      expect(Buffer.isBuffer(result.thumbnail)).toBe(true);
      expect(Buffer.isBuffer(result.webp)).toBe(true);
    });

    it('thumbnail is smaller than optimized', async () => {
      const input = await createTestImage(2000, 1500);
      const result = await imageProcessor.processImage(input);

      expect(result.thumbnail.length).toBeLessThan(result.optimized.length);
    });

    it('webp is smaller than optimized JPEG', async () => {
      const input = await createTestImage(1920, 1080);
      const result = await imageProcessor.processImage(input);

      // WebP should generally be smaller than JPEG at similar quality
      expect(result.webp.length).toBeLessThan(result.optimized.length);
    });

    it('optimized image does not exceed 1920px', async () => {
      const input = await createTestImage(4000, 3000);
      const result = await imageProcessor.processImage(input);

      const meta = await sharp(result.optimized).metadata();
      expect(meta.width).toBeLessThanOrEqual(1920);
      expect(meta.height).toBeLessThanOrEqual(1920);
    });

    it('thumbnail is 300x300', async () => {
      const input = await createTestImage(1600, 900);
      const result = await imageProcessor.processImage(input);

      const meta = await sharp(result.thumbnail).metadata();
      expect(meta.width).toBe(300);
      expect(meta.height).toBe(300);
    });

    it('optimized is progressive JPEG', async () => {
      const input = await createTestImage();
      const result = await imageProcessor.processImage(input);

      const meta = await sharp(result.optimized).metadata();
      expect(meta.format).toBe('jpeg');
      expect(meta.isProgressive).toBe(true);
    });

    it('webp variant has webp format', async () => {
      const input = await createTestImage();
      const result = await imageProcessor.processImage(input);

      const meta = await sharp(result.webp).metadata();
      expect(meta.format).toBe('webp');
    });

    it('does not upscale small images', async () => {
      const input = await createTestImage(400, 300);
      const result = await imageProcessor.processImage(input);

      const meta = await sharp(result.optimized).metadata();
      expect(meta.width).toBeLessThanOrEqual(400);
    });
  });

  describe('getMetadata', () => {
    it('returns width, height, format, size', async () => {
      const input = await createTestImage(1024, 768);
      const meta = await imageProcessor.getMetadata(input);

      expect(meta.width).toBe(1024);
      expect(meta.height).toBe(768);
      expect(meta.format).toBe('jpeg');
      expect(meta.size).toBeGreaterThan(0);
    });

    it('size matches buffer length', async () => {
      const input = await createTestImage(500, 500);
      const meta = await imageProcessor.getMetadata(input);

      expect(meta.size).toBe(input.length);
    });
  });
});
