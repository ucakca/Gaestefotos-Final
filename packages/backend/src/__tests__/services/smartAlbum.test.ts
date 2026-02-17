import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    category: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

vi.mock('../../services/cache/redis', () => ({
  cacheGet: (...args: any[]) => mockCacheGet(...args),
  cacheSet: (...args: any[]) => mockCacheSet(...args),
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { selectSmartCategoryId } from '../../services/smartAlbum';

describe('selectSmartCategoryId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns matching category when capturedAt falls within time window', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      {
        id: 'cat-1',
        startAt: new Date('2026-03-01T14:00:00Z'),
        endAt: new Date('2026-03-01T18:00:00Z'),
        uploadLocked: false,
      },
    ]);

    const result = await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date('2026-03-01T15:30:00Z'),
      isGuest: false,
    });

    expect(result).toBe('cat-1');
  });

  it('returns null when no categories match', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      {
        id: 'cat-1',
        startAt: new Date('2026-03-01T14:00:00Z'),
        endAt: new Date('2026-03-01T18:00:00Z'),
        uploadLocked: false,
      },
    ]);

    const result = await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date('2026-03-01T20:00:00Z'),
      isGuest: false,
    });

    expect(result).toBeNull();
  });

  it('returns null for guest when category is upload-locked', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      {
        id: 'cat-locked',
        startAt: new Date('2026-03-01T14:00:00Z'),
        endAt: new Date('2026-03-01T18:00:00Z'),
        uploadLocked: true,
      },
    ]);

    const result = await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date('2026-03-01T15:30:00Z'),
      isGuest: true,
    });

    expect(result).toBeNull();
  });

  it('allows host to upload to locked category', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([
      {
        id: 'cat-locked',
        startAt: new Date('2026-03-01T14:00:00Z'),
        endAt: new Date('2026-03-01T18:00:00Z'),
        uploadLocked: true,
      },
    ]);

    const result = await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date('2026-03-01T15:30:00Z'),
      isGuest: false,
    });

    expect(result).toBe('cat-locked');
  });

  it('uses cached categories on second call', async () => {
    const cached = [
      { id: 'cat-cached', startAt: '2026-03-01T14:00:00.000Z', endAt: '2026-03-01T18:00:00.000Z', uploadLocked: false },
    ];
    mockCacheGet.mockResolvedValue(cached);

    const result = await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date('2026-03-01T15:30:00Z'),
      isGuest: false,
    });

    expect(result).toBe('cat-cached');
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('caches DB results with 120s TTL', async () => {
    mockCacheGet.mockResolvedValue(null);
    mockFindMany.mockResolvedValue([]);

    await selectSmartCategoryId({
      eventId: 'evt-1',
      capturedAt: new Date(),
      isGuest: false,
    });

    expect(mockCacheSet).toHaveBeenCalledWith('smart-album:evt-1', [], 120);
  });
});
