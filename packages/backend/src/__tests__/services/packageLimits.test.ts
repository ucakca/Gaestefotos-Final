import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirst = vi.fn();
const mockAggregate = vi.fn();
const mockEventFindUnique = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    event: {
      findUnique: (...args: any[]) => mockEventFindUnique(...args),
    },
    eventEntitlement: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    photo: {
      aggregate: (...args: any[]) => mockAggregate(...args),
    },
  },
}));

vi.mock('../../services/cache/redis', () => ({
  getRedis: () => ({
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    eval: vi.fn().mockResolvedValue(1),
  }),
  cacheGet: vi.fn().mockResolvedValue(null),
  cacheSet: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { getActiveEventEntitlement } from '../../services/packageLimits';

describe('packageLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENFORCE_STORAGE_LIMITS = 'false';
  });

  describe('getActiveEventEntitlement', () => {
    it('returns the active entitlement for an event', async () => {
      mockEventFindUnique.mockResolvedValue({ host: { wordpressUserId: 42 } });
      const entitlement = {
        id: 'ent-1',
        eventId: 'evt-1',
        status: 'ACTIVE',
        storageLimitBytes: BigInt(10_000_000_000),
        wcSku: 'pro-package',
      };
      mockFindFirst.mockResolvedValue(entitlement);

      const result = await getActiveEventEntitlement('evt-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('ent-1');
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'evt-1',
            wpUserId: 42,
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('returns null when no active entitlement exists', async () => {
      mockEventFindUnique.mockResolvedValue({ host: { wordpressUserId: null } });
      mockFindFirst.mockResolvedValue(null);

      const result = await getActiveEventEntitlement('evt-no-ent');
      expect(result).toBeNull();
    });
  });
});
