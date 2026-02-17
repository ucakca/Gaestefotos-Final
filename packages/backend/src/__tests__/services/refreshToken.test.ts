import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockSetex = vi.fn();
const mockSadd = vi.fn();
const mockExpire = vi.fn();
const mockGet = vi.fn();
const mockDel = vi.fn();
const mockSrem = vi.fn();
const mockSmembers = vi.fn();
const mockPipelineExec = vi.fn();
const mockPipelineDel = vi.fn();

vi.mock('../../services/cache/redis', () => ({
  getRedis: () => ({
    setex: (...args: any[]) => mockSetex(...args),
    sadd: (...args: any[]) => mockSadd(...args),
    expire: (...args: any[]) => mockExpire(...args),
    get: (...args: any[]) => mockGet(...args),
    del: (...args: any[]) => mockDel(...args),
    srem: (...args: any[]) => mockSrem(...args),
    smembers: (...args: any[]) => mockSmembers(...args),
    pipeline: () => ({
      del: (...args: any[]) => mockPipelineDel(...args),
      exec: (...args: any[]) => mockPipelineExec(...args),
    }),
  }),
}));

import { createRefreshToken, consumeRefreshToken, revokeAllRefreshTokens } from '../../services/refreshToken';

describe('refreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('returns a non-empty token string', async () => {
      const token = await createRefreshToken('user-1');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('stores token in Redis with TTL', async () => {
      await createRefreshToken('user-1');
      expect(mockSetex).toHaveBeenCalledWith(
        expect.stringContaining('refresh:'),
        expect.any(Number),
        'user-1'
      );
    });

    it('tracks token in user set', async () => {
      await createRefreshToken('user-1');
      expect(mockSadd).toHaveBeenCalledWith(
        expect.stringContaining('user-refresh:user-1'),
        expect.any(String)
      );
    });
  });

  describe('consumeRefreshToken', () => {
    it('returns userId for valid token', async () => {
      mockGet.mockResolvedValue('user-1');
      const userId = await consumeRefreshToken('valid-token');
      expect(userId).toBe('user-1');
    });

    it('deletes consumed token (one-time use)', async () => {
      mockGet.mockResolvedValue('user-1');
      await consumeRefreshToken('valid-token');
      expect(mockDel).toHaveBeenCalledWith(expect.stringContaining('valid-token'));
    });

    it('returns null for invalid token', async () => {
      mockGet.mockResolvedValue(null);
      const userId = await consumeRefreshToken('invalid-token');
      expect(userId).toBeNull();
    });
  });

  describe('revokeAllRefreshTokens', () => {
    it('deletes all tokens for a user', async () => {
      mockSmembers.mockResolvedValue(['token-1', 'token-2']);
      mockPipelineExec.mockResolvedValue([]);

      await revokeAllRefreshTokens('user-1');

      expect(mockSmembers).toHaveBeenCalledWith(expect.stringContaining('user-1'));
      expect(mockPipelineDel).toHaveBeenCalledTimes(3); // 2 tokens + user set
    });

    it('handles user with no tokens', async () => {
      mockSmembers.mockResolvedValue([]);
      await revokeAllRefreshTokens('user-no-tokens');
      expect(mockPipelineDel).not.toHaveBeenCalled();
    });
  });
});
