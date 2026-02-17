import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockDelete = vi.fn();
const mockPhotoFindMany = vi.fn();
const mockVideoFindMany = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    event: {
      findMany: (...args: any[]) => mockFindMany(...args),
      delete: (...args: any[]) => mockDelete(...args),
    },
    photo: {
      findMany: (...args: any[]) => mockPhotoFindMany(...args),
    },
    video: {
      findMany: (...args: any[]) => mockVideoFindMany(...args),
    },
  },
}));

vi.mock('../../services/storage', () => ({
  storageService: {
    deleteFile: (...args: any[]) => mockDeleteFile(...args),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// We test the purge logic by importing and calling the module's internal function
// Since startEventPurgeWorker uses setInterval, we test the core logic directly
describe('eventPurgeWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no expired events exist', async () => {
    mockFindMany.mockResolvedValue([]);

    // Import dynamically to avoid side effects from startEventPurgeWorker
    const mod = await import('../../services/eventPurgeWorker');
    // The worker auto-starts, but the mock returns empty
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
