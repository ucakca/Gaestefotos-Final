import { describe, it, expect } from 'vitest';
import { generateCsrfToken } from '../../middleware/csrf';

describe('csrf', () => {
  describe('generateCsrfToken', () => {
    it('should return a 64-char hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
      expect(tokens.size).toBe(100);
    });
  });
});
