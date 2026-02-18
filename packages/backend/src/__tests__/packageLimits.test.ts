import { describe, it, expect } from 'vitest';
import { bigintToString } from '../services/packageLimits';

describe('packageLimits', () => {
  describe('bigintToString', () => {
    it('converts bigint to string', () => {
      expect(bigintToString(1024n)).toBe('1024');
    });

    it('converts zero', () => {
      expect(bigintToString(0n)).toBe('0');
    });

    it('converts large bigint', () => {
      expect(bigintToString(10737418240n)).toBe('10737418240'); // 10GB
    });

    it('returns null for null', () => {
      expect(bigintToString(null)).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(bigintToString(undefined)).toBeNull();
    });

    it('handles negative bigint', () => {
      expect(bigintToString(-500n)).toBe('-500');
    });
  });
});
