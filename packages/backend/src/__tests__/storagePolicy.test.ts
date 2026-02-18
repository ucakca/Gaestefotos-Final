import { describe, it, expect } from 'vitest';
import { addDays, tierToDefaultDurationDays, DEFAULT_FREE_STORAGE_DAYS } from '../services/storagePolicy';

describe('storagePolicy', () => {
  describe('DEFAULT_FREE_STORAGE_DAYS', () => {
    it('should be 14', () => {
      expect(DEFAULT_FREE_STORAGE_DAYS).toBe(14);
    });
  });

  describe('addDays', () => {
    it('adds positive days correctly', () => {
      const base = new Date('2026-01-01T00:00:00Z');
      const result = addDays(base, 7);
      expect(result.toISOString()).toBe('2026-01-08T00:00:00.000Z');
    });

    it('adds zero days returns same date', () => {
      const base = new Date('2026-06-15T12:30:00Z');
      const result = addDays(base, 0);
      expect(result.toISOString()).toBe('2026-06-15T12:30:00.000Z');
    });

    it('handles month boundary', () => {
      const base = new Date('2026-01-28T00:00:00Z');
      const result = addDays(base, 5);
      expect(result.toISOString()).toBe('2026-02-02T00:00:00.000Z');
    });

    it('handles year boundary', () => {
      const base = new Date('2025-12-30T00:00:00Z');
      const result = addDays(base, 3);
      expect(result.toISOString()).toBe('2026-01-02T00:00:00.000Z');
    });

    it('does not mutate original date', () => {
      const base = new Date('2026-01-01T00:00:00Z');
      const original = base.toISOString();
      addDays(base, 30);
      expect(base.toISOString()).toBe(original);
    });

    it('handles large day values (365)', () => {
      const base = new Date('2026-01-01T00:00:00Z');
      const result = addDays(base, 365);
      expect(result.toISOString()).toBe('2027-01-01T00:00:00.000Z');
    });
  });

  describe('tierToDefaultDurationDays', () => {
    it('returns 365 for PREMIUM', () => {
      expect(tierToDefaultDurationDays('PREMIUM')).toBe(365);
    });

    it('returns 180 for SMART', () => {
      expect(tierToDefaultDurationDays('SMART')).toBe(180);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for FREE', () => {
      expect(tierToDefaultDurationDays('FREE')).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for BASIC', () => {
      expect(tierToDefaultDurationDays('BASIC')).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });

    it('is case-insensitive', () => {
      expect(tierToDefaultDurationDays('premium')).toBe(365);
      expect(tierToDefaultDurationDays('Smart')).toBe(180);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for null', () => {
      expect(tierToDefaultDurationDays(null)).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for undefined', () => {
      expect(tierToDefaultDurationDays(undefined)).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for empty string', () => {
      expect(tierToDefaultDurationDays('')).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });

    it('returns DEFAULT_FREE_STORAGE_DAYS for unknown tier', () => {
      expect(tierToDefaultDurationDays('ENTERPRISE')).toBe(DEFAULT_FREE_STORAGE_DAYS);
    });
  });
});
