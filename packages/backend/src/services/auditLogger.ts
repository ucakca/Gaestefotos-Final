import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import type { Request } from 'express';
import type { AuthRequest } from '../middleware/auth';

// ─── LOG TYPES (used as type field in QaLogEvent) ───────────────────────────

export const AuditType = {
  // Auth
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_2FA_ENABLED: 'auth.2fa_enabled',
  AUTH_2FA_DISABLED: 'auth.2fa_disabled',
  AUTH_WP_SSO: 'auth.wp_sso',

  // Events
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_DELETED: 'event.deleted',
  EVENT_RESTORED: 'event.restored',
  EVENT_ACTIVATED: 'event.activated',
  EVENT_DEACTIVATED: 'event.deactivated',

  // Photos / Videos
  PHOTO_UPLOADED: 'photo.uploaded',
  PHOTO_DELETED: 'photo.deleted',
  PHOTO_MODERATED: 'photo.moderated',
  PHOTO_BULK_DELETE: 'photo.bulk_delete',
  VIDEO_UPLOADED: 'video.uploaded',
  VIDEO_DELETED: 'video.deleted',

  // Uploads (TUS)
  TUS_UPLOAD_CREATED: 'tus.upload_created',
  TUS_UPLOAD_FINISHED: 'tus.upload_finished',

  // Guestbook
  GUESTBOOK_ENTRY_CREATED: 'guestbook.entry_created',
  GUESTBOOK_ENTRY_DELETED: 'guestbook.entry_deleted',
  GUESTBOOK_ENTRY_MODERATED: 'guestbook.entry_moderated',

  // Invitations
  INVITATION_CREATED: 'invitation.created',
  INVITATION_UPDATED: 'invitation.updated',
  INVITATION_RSVP: 'invitation.rsvp',

  // Admin actions
  ADMIN_USER_UPDATED: 'admin.user_updated',
  ADMIN_USER_DELETED: 'admin.user_deleted',
  ADMIN_EVENT_CREATED: 'admin.event_created',
  ADMIN_EVENT_UPDATED: 'admin.event_updated',
  ADMIN_EVENT_DELETED: 'admin.event_deleted',
  ADMIN_EVENT_STATUS: 'admin.event_status',
  ADMIN_PACKAGE_CHANGED: 'admin.package_changed',
  ADMIN_IMPERSONATION: 'admin.impersonation',
  ADMIN_SETTINGS_CHANGED: 'admin.settings_changed',
  ADMIN_CLEANUP: 'admin.cleanup',
  MAINTENANCE_MODE_CHANGED: 'admin.maintenance_mode',

  // Partner
  PARTNER_CREATED: 'partner.created',
  PARTNER_UPDATED: 'partner.updated',
  PARTNER_MEMBER_ADDED: 'partner.member_added',
  PARTNER_MEMBER_REMOVED: 'partner.member_removed',

  // API Keys
  API_KEY_CREATED: 'apikey.created',
  API_KEY_REVOKED: 'apikey.revoked',

  // Face Search
  FACE_SEARCH_EXECUTED: 'facesearch.executed',
  FACE_SEARCH_CONSENT: 'facesearch.consent',

  // Sharing
  SHARE_EMAIL: 'share.email',
  SHARE_SMS: 'share.sms',

  // Mosaic
  MOSAIC_WALL_CREATED: 'mosaic.wall_created',
  MOSAIC_WALL_UPDATED: 'mosaic.wall_updated',

  // Payments
  PAYMENT_SESSION_CREATED: 'payment.session_created',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // System
  SYSTEM_MAINTENANCE_ON: 'system.maintenance_on',
  SYSTEM_MAINTENANCE_OFF: 'system.maintenance_off',
  SYSTEM_ERROR: 'system.error',
} as const;

export type AuditTypeValue = (typeof AuditType)[keyof typeof AuditType];

// ─── HELPERS ────────────────────────────────────────────────────────────────

function hashIp(req: Request): string | null {
  const ipRaw =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
      : null) ||
    req.ip ||
    null;

  if (!ipRaw) return null;

  const salt = String(process.env.QA_LOG_IP_SALT || process.env.JWT_SECRET || 'audit').trim();
  return crypto.createHash('sha256').update(`${salt}|${ipRaw}`).digest('hex');
}

// ─── MAIN AUDIT LOG FUNCTION ────────────────────────────────────────────────

interface AuditLogOptions {
  type: AuditTypeValue | string;
  message?: string;
  level?: 'IMPORTANT' | 'DEBUG';
  data?: Record<string, any>;
  eventId?: string;
  userId?: string;
  userRole?: string;
  req?: Request | AuthRequest;
}

/**
 * Write an audit log entry to QaLogEvent.
 * Fire-and-forget — never throws, never blocks the response.
 */
export function auditLog(opts: AuditLogOptions): void {
  const authReq = opts.req as AuthRequest | undefined;

  const entry = {
    level: opts.level || 'IMPORTANT',
    type: opts.type,
    message: opts.message || null,
    data: opts.data || Prisma.DbNull,
    userId: opts.userId || authReq?.userId || null,
    userRole: opts.userRole || authReq?.userRole || null,
    eventId: opts.eventId || null,
    path: opts.req ? (opts.req.originalUrl || opts.req.url) : null,
    method: opts.req?.method || null,
    userAgent: opts.req ? String(opts.req.get('user-agent') || '') : null,
    ipHash: opts.req ? hashIp(opts.req) : null,
  };

  // Fire and forget — do NOT await in route handlers
  prisma.qaLogEvent
    .create({ data: entry })
    .catch((err: any) => {
      logger.error('auditLog write failed', { error: err.message, type: opts.type });
    });
}

/**
 * Convenience: audit log with DEBUG level (only stored if debug mode enabled).
 * For high-volume, low-importance events.
 */
export function auditDebug(opts: Omit<AuditLogOptions, 'level'>): void {
  auditLog({ ...opts, level: 'DEBUG' });
}
