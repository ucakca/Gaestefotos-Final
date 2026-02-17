import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockTtl = vi.fn();
const mockIncr = vi.fn();
const mockExpire = vi.fn();
const mockSetex = vi.fn();
const mockDel = vi.fn();

vi.mock('../../services/cache/redis', () => ({
  getRedis: () => ({
    ttl: (...args: any[]) => mockTtl(...args),
    incr: (...args: any[]) => mockIncr(...args),
    expire: (...args: any[]) => mockExpire(...args),
    setex: (...args: any[]) => mockSetex(...args),
    del: (...args: any[]) => mockDel(...args),
  }),
}));

import { isAccountLocked, recordFailedAttempt, clearFailedAttempts } from '../../services/accountLockout';

describe('accountLockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAccountLocked', () => {
    it('returns not locked when TTL is 0 or negative', async () => {
      mockTtl.mockResolvedValue(-2); // key doesn't exist
      const result = await isAccountLocked('test@test.com');
      expect(result.locked).toBe(false);
      expect(result.remainingSeconds).toBe(0);
    });

    it('returns locked when TTL is positive', async () => {
      mockTtl.mockResolvedValue(300);
      const result = await isAccountLocked('locked@test.com');
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBe(300);
    });
  });

  describe('recordFailedAttempt', () => {
    it('increments attempt counter', async () => {
      mockIncr.mockResolvedValue(1);
      const result = await recordFailedAttempt('test@test.com');
      expect(result.attempts).toBe(1);
      expect(result.locked).toBe(false);
    });

    it('sets TTL on first attempt', async () => {
      mockIncr.mockResolvedValue(1);
      await recordFailedAttempt('test@test.com');
      expect(mockExpire).toHaveBeenCalled();
    });

    it('locks account after max attempts', async () => {
      mockIncr.mockResolvedValue(5);
      const result = await recordFailedAttempt('test@test.com');
      expect(result.locked).toBe(true);
      expect(mockSetex).toHaveBeenCalled();
      expect(mockDel).toHaveBeenCalled();
    });
  });

  describe('clearFailedAttempts', () => {
    it('deletes both attempt and locked keys', async () => {
      await clearFailedAttempts('test@test.com');
      expect(mockDel).toHaveBeenCalledWith(
        expect.stringContaining('test@test.com'),
        expect.stringContaining('test@test.com')
      );
    });
  });
});
