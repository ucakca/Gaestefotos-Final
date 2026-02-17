import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getJwtSecrets, signJwt, verifyJwt } from '../../services/jwtKeys';

describe('jwtKeys', () => {
  const CURRENT_SECRET = 'current-secret-key-2026';
  const PREVIOUS_SECRET = 'old-secret-key-2025';

  beforeEach(() => {
    process.env.JWT_SECRET = CURRENT_SECRET;
    delete process.env.JWT_SECRET_PREVIOUS;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_SECRET_PREVIOUS;
  });

  describe('getJwtSecrets', () => {
    it('returns only current key when no previous is set', () => {
      const secrets = getJwtSecrets();
      expect(secrets).toEqual([CURRENT_SECRET]);
    });

    it('returns both keys when previous is set', () => {
      process.env.JWT_SECRET_PREVIOUS = PREVIOUS_SECRET;
      const secrets = getJwtSecrets();
      expect(secrets).toEqual([CURRENT_SECRET, PREVIOUS_SECRET]);
    });

    it('deduplicates if previous equals current', () => {
      process.env.JWT_SECRET_PREVIOUS = CURRENT_SECRET;
      const secrets = getJwtSecrets();
      expect(secrets).toEqual([CURRENT_SECRET]);
    });

    it('returns empty array when no keys set', () => {
      delete process.env.JWT_SECRET;
      const secrets = getJwtSecrets();
      expect(secrets).toEqual([]);
    });
  });

  describe('signJwt', () => {
    it('signs a token with the current key', () => {
      const token = signJwt({ userId: 'u1' }, { expiresIn: '1h' });
      const decoded = jwt.verify(token, CURRENT_SECRET) as any;
      expect(decoded.userId).toBe('u1');
    });

    it('throws when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => signJwt({ userId: 'u1' })).toThrow('JWT_SECRET');
    });
  });

  describe('verifyJwt', () => {
    it('verifies token signed with current key', () => {
      const token = jwt.sign({ userId: 'u1' }, CURRENT_SECRET, { expiresIn: '1h' });
      const decoded = verifyJwt<{ userId: string }>(token);
      expect(decoded.userId).toBe('u1');
    });

    it('verifies token signed with previous key during rotation', () => {
      process.env.JWT_SECRET_PREVIOUS = PREVIOUS_SECRET;
      const token = jwt.sign({ userId: 'u2' }, PREVIOUS_SECRET, { expiresIn: '1h' });
      const decoded = verifyJwt<{ userId: string }>(token);
      expect(decoded.userId).toBe('u2');
    });

    it('throws for token signed with unknown key', () => {
      const token = jwt.sign({ userId: 'u3' }, 'unknown-key', { expiresIn: '1h' });
      expect(() => verifyJwt(token)).toThrow();
    });

    it('throws for expired token even with valid key', () => {
      const token = jwt.sign({ userId: 'u4' }, CURRENT_SECRET, { expiresIn: '-1s' });
      expect(() => verifyJwt(token)).toThrow('expired');
    });

    it('does not retry previous key for expired tokens', () => {
      process.env.JWT_SECRET_PREVIOUS = PREVIOUS_SECRET;
      const token = jwt.sign({ userId: 'u5' }, CURRENT_SECRET, { expiresIn: '-1s' });
      expect(() => verifyJwt(token)).toThrow('expired');
    });
  });
});
