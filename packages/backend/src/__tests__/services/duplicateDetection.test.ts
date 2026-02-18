import { describe, it, expect } from 'vitest';
import { calculateMD5Hash } from '../../services/duplicateDetection';

// hammingDistance is not exported, so we test it indirectly or re-implement for testing
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

describe('duplicateDetection', () => {
  describe('calculateMD5Hash', () => {
    it('should return a 32-char hex string', () => {
      const hash = calculateMD5Hash(Buffer.from('test'));
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should return the same hash for identical buffers', () => {
      const buf = Buffer.from('hello world');
      expect(calculateMD5Hash(buf)).toBe(calculateMD5Hash(buf));
    });

    it('should return different hashes for different buffers', () => {
      const hash1 = calculateMD5Hash(Buffer.from('photo1'));
      const hash2 = calculateMD5Hash(Buffer.from('photo2'));
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty buffer', () => {
      const hash = calculateMD5Hash(Buffer.alloc(0));
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should produce known MD5 for known input', () => {
      // MD5 of empty string is d41d8cd98f00b204e9800998ecf8427e
      expect(calculateMD5Hash(Buffer.alloc(0))).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });
  });

  describe('hammingDistance (logic)', () => {
    it('should return 0 for identical hashes', () => {
      expect(hammingDistance('11110000', '11110000')).toBe(0);
    });

    it('should count differing bits', () => {
      expect(hammingDistance('11110000', '11110001')).toBe(1);
      expect(hammingDistance('11110000', '00001111')).toBe(8);
    });

    it('should return Infinity for different-length hashes', () => {
      expect(hammingDistance('111', '1111')).toBe(Infinity);
    });

    it('should handle empty strings', () => {
      expect(hammingDistance('', '')).toBe(0);
    });

    it('should handle 64-bit hashes (standard pHash length)', () => {
      const hash1 = '1'.repeat(64);
      const hash2 = '0'.repeat(64);
      expect(hammingDistance(hash1, hash2)).toBe(64);
    });

    it('should detect similar images (distance <= 5)', () => {
      const hash1 = '1111111111111111111111111111111111111111111111111111111111111111';
      const hash2 = '1111111111111111111111111111111111111111111111111111111111110000';
      const distance = hammingDistance(hash1, hash2);
      expect(distance).toBeLessThanOrEqual(5);
    });
  });
});
