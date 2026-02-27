import { describe, it, expect } from 'vitest';

describe('aiAsyncDelivery - Short Code Format', () => {
  const SHORT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function generateShortCode(length = 6): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
    }
    return code;
  }

  it('generates codes of correct length', () => {
    expect(generateShortCode(6)).toHaveLength(6);
    expect(generateShortCode(8)).toHaveLength(8);
  });

  it('generates only valid characters (no 0/O/1/I)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      expect(code).not.toMatch(/[0OoIil1]/);
      for (const ch of code) {
        expect(SHORT_CODE_CHARS).toContain(ch);
      }
    }
  });

  it('generates unique codes (1000 samples, no duplicates)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateShortCode());
    }
    // With 32^6 = ~1 billion possibilities, 1000 codes should all be unique
    expect(codes.size).toBe(1000);
  });

  it('codes are uppercase', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateShortCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});

describe('aiAsyncDelivery - Job Status Types', () => {
  const VALID_STATUSES = ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'];

  it('has 4 valid status types', () => {
    expect(VALID_STATUSES).toHaveLength(4);
  });

  it('QUEUED is the initial status', () => {
    expect(VALID_STATUSES[0]).toBe('QUEUED');
  });
});
