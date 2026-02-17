import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('../../config/database', () => ({
  default: {
    passwordHistory: {
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// bcryptjs is real — we need it for hash comparison
import { isPasswordReused, recordPasswordHash } from '../../services/passwordHistory';
import bcrypt from 'bcryptjs';

describe('passwordHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isPasswordReused', () => {
    it('returns false when no history exists', async () => {
      mockFindMany.mockResolvedValue([]);
      const result = await isPasswordReused('user-1', 'newPassword123!');
      expect(result).toBe(false);
    });

    it('returns true when password matches a history entry', async () => {
      const hash = await bcrypt.hash('MyOldPass1!', 10);
      mockFindMany.mockResolvedValue([{ hash }]);

      const result = await isPasswordReused('user-1', 'MyOldPass1!');
      expect(result).toBe(true);
    });

    it('returns false when password does not match any history', async () => {
      const hash = await bcrypt.hash('DifferentPass1!', 10);
      mockFindMany.mockResolvedValue([{ hash }]);

      const result = await isPasswordReused('user-1', 'BrandNewPass1!');
      expect(result).toBe(false);
    });

    it('checks up to MAX_HISTORY (5) entries', async () => {
      mockFindMany.mockResolvedValue([]);
      await isPasswordReused('user-1', 'test');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('recordPasswordHash', () => {
    it('creates a new history entry', async () => {
      mockCreate.mockResolvedValue({ id: 'ph-1' });
      mockFindMany.mockResolvedValue([{ id: 'ph-1' }]);

      await recordPasswordHash('user-1', '$2b$10$somehash');

      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: 'user-1', hash: '$2b$10$somehash' },
      });
    });

    it('prunes entries beyond MAX_HISTORY', async () => {
      mockCreate.mockResolvedValue({ id: 'ph-6' });
      mockFindMany.mockResolvedValue([
        { id: 'ph-6' }, { id: 'ph-5' }, { id: 'ph-4' },
        { id: 'ph-3' }, { id: 'ph-2' }, { id: 'ph-1' },
      ]);
      mockDeleteMany.mockResolvedValue({ count: 1 });

      await recordPasswordHash('user-1', '$2b$10$newhash');

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['ph-1'] } },
      });
    });

    it('does not prune when history is within limit', async () => {
      mockCreate.mockResolvedValue({ id: 'ph-3' });
      mockFindMany.mockResolvedValue([
        { id: 'ph-3' }, { id: 'ph-2' }, { id: 'ph-1' },
      ]);

      await recordPasswordHash('user-1', '$2b$10$hash');

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });
});
