import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@prisma/client', () => ({
  Prisma: { JsonNull: null },
}));

vi.mock('../../config/database', () => ({
  default: {
    qaLogEvent: {
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { AuditType, auditLog } from '../../services/auditLogger';

describe('auditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'log-1' });
  });

  describe('AuditType', () => {
    it('has all auth types', () => {
      expect(AuditType.AUTH_LOGIN).toBe('auth.login');
      expect(AuditType.AUTH_LOGIN_FAILED).toBe('auth.login_failed');
      expect(AuditType.AUTH_REGISTER).toBe('auth.register');
      expect(AuditType.AUTH_PASSWORD_CHANGE).toBe('auth.password_change');
    });

    it('has event types including restored', () => {
      expect(AuditType.EVENT_CREATED).toBe('event.created');
      expect(AuditType.EVENT_DELETED).toBe('event.deleted');
      expect(AuditType.EVENT_RESTORED).toBe('event.restored');
    });

    it('has photo types', () => {
      expect(AuditType.PHOTO_UPLOADED).toBe('photo.uploaded');
      expect(AuditType.PHOTO_DELETED).toBe('photo.deleted');
      expect(AuditType.PHOTO_MODERATED).toBe('photo.moderated');
    });
  });

  describe('auditLog', () => {
    it('creates a log entry in the database', () => {
      auditLog({ type: AuditType.AUTH_LOGIN, message: 'User logged in' });
      // auditLog is fire-and-forget, so we check the mock was called
      expect(mockCreate).toHaveBeenCalled();
    });

    it('includes type and message in the log entry', () => {
      auditLog({ type: AuditType.EVENT_CREATED, message: 'Event created', data: { title: 'Test' } });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'event.created',
          }),
        })
      );
    });
  });
});
