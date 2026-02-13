import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import prisma from '../config/database';

// Helper: Check if running in development mode
const isDev = () => process.env.NODE_ENV === 'development';

// Development multiplier: Higher limits in dev, but still enforced
const devMultiplier = (base: number) => isDev() ? base * 10 : base;

// General API rate limiter - sehr großzügig für normale Nutzung
export const apiLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: devMultiplier(2000), // 2000 in prod, 20000 in dev
  message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for file requests (they are served via proxy)
  skip: (req: Request) => {
    if (req.path.includes('/file') || req.path.includes('/photo/')) return true;
    return false;
  },
});

// Stricter limiter for authentication endpoints
export const authLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: devMultiplier(20), // 20 in prod, 200 in dev
  skipSuccessfulRequests: true,
  message: 'Zu viele Anmeldeversuche, bitte versuchen Sie es in 15 Minuten erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated limiter for WordPress SSO bridge (WP → App)
export const wordpressSsoLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: devMultiplier(60), // 60 in prod, 600 in dev
  skipSuccessfulRequests: true,
  message: 'Zu viele SSO-Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const twoFactorVerifyLimiter: any = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: devMultiplier(30), // 30 in prod, 300 in dev
  skipSuccessfulRequests: true,
  message: 'Zu viele 2FA-Versuche, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('2fa:verify', req);
    res.status(429).json({ error: 'Zu viele 2FA-Versuche, bitte versuchen Sie es später erneut.' });
  },
});

export const twoFactorSetupLimiter: any = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: devMultiplier(20), // 20 in prod, 200 in dev
  skipSuccessfulRequests: true,
  message: 'Zu viele 2FA-Setup-Versuche, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('2fa:setup', req);
    res.status(429).json({ error: 'Zu viele 2FA-Setup-Versuche, bitte versuchen Sie es später erneut.' });
  },
});

// Stricter limiter for file uploads
export const uploadLimiter: any = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 200, // 200 Uploads pro Stunde (erhöht für normale Nutzung)
  message: 'Zu viele Uploads, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

function getEventIdFromRequest(req: any): string | null {
  const eventId = req?.params?.eventId;
  return typeof eventId === 'string' && eventId.length > 0 ? eventId : null;
}

type UploadRateLimitsConfig = {
  photoIpMax?: number;
  photoEventMax?: number;
  videoIpMax?: number;
  videoEventMax?: number;
};

type UploadRateLimitsCacheEntry = {
  expiresAt: number;
  config: UploadRateLimitsConfig;
};

const uploadRateLimitsCache = new Map<string, UploadRateLimitsCacheEntry>();
const UPLOAD_RATE_LIMITS_CACHE_TTL_MS = 60 * 1000;

export async function attachEventUploadRateLimits(req: any, _res: any, next: any) {
  const eventId = getEventIdFromRequest(req);
  if (!eventId) return next();

  const now = Date.now();
  const cached = uploadRateLimitsCache.get(eventId);
  if (cached && cached.expiresAt > now) {
    req.uploadRateLimits = cached.config;
    return next();
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { featuresConfig: true },
    });

    const cfg = ((event?.featuresConfig as any)?.uploadRateLimits || {}) as UploadRateLimitsConfig;
    req.uploadRateLimits = cfg;
    uploadRateLimitsCache.set(eventId, { expiresAt: now + UPLOAD_RATE_LIMITS_CACHE_TTL_MS, config: cfg });
    return next();
  } catch (error) {
    logger.warn('[RateLimit] failed to load event uploadRateLimits', {
      message: (error as any)?.message || String(error),
      eventId,
    });
    return next();
  }
}

function logRateLimitHit(label: string, req: any) {
  logger.warn('[RateLimit] blocked', {
    label,
    ip: req.ip,
    path: req.path,
    eventId: req?.params?.eventId,
  });
}

export const photoUploadIpLimiter: any = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: (req: Request) => {
    const override = Number((req as any)?.uploadRateLimits?.photoIpMax);
    const base = Number.isFinite(override) && override > 0 ? override : 120;
    return devMultiplier(base);
  },
  message: 'Zu viele Uploads, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('photo:ip', req);
    res.status(429).json({ error: 'Zu viele Uploads, bitte versuchen Sie es später erneut.' });
  },
});

export const photoUploadEventLimiter: any = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: (req: Request) => {
    const override = Number((req as any)?.uploadRateLimits?.photoEventMax);
    const base = Number.isFinite(override) && override > 0 ? override : 1000;
    return devMultiplier(base);
  },
  message: 'Zu viele Uploads, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => !getEventIdFromRequest(req),
  keyGenerator: (req: Request) => {
    const eventId = getEventIdFromRequest(req);
    return eventId ? `event:${eventId}:photo` : (req.ip || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    logRateLimitHit('photo:event', req);
    res.status(429).json({ error: 'Zu viele Uploads, bitte versuchen Sie es später erneut.' });
  },
});

export const videoUploadIpLimiter: any = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (req: Request) => {
    const override = Number((req as any)?.uploadRateLimits?.videoIpMax);
    const base = Number.isFinite(override) && override > 0 ? override : 20;
    return devMultiplier(base);
  },
  message: 'Zu viele Video-Uploads, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('video:ip', req);
    res.status(429).json({ error: 'Zu viele Video-Uploads, bitte versuchen Sie es später erneut.' });
  },
});

export const videoUploadEventLimiter: any = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: (req: Request) => {
    const override = Number((req as any)?.uploadRateLimits?.videoEventMax);
    const base = Number.isFinite(override) && override > 0 ? override : 150;
    return devMultiplier(base);
  },
  message: 'Zu viele Video-Uploads, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => !getEventIdFromRequest(req),
  keyGenerator: (req: Request) => {
    const eventId = getEventIdFromRequest(req);
    return eventId ? `event:${eventId}:video` : (req.ip || 'unknown');
  },
  handler: (req: Request, res: Response) => {
    logRateLimitHit('video:event', req);
    res.status(429).json({ error: 'Zu viele Video-Uploads, bitte versuchen Sie es später erneut.' });
  },
});

// Very strict limiter for password verification
export const passwordLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: devMultiplier(10), // 10 in prod, 100 in dev
  message: 'Zu viele Passwort-Versuche, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip in E2E to avoid test flakiness
  skip: (req: Request) => process.env.E2E === 'true',
});

// Less strict limiter for admin login (more attempts allowed)
export const adminAuthLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 20, // 20 Login-Versuche pro 15 Minuten (mehr als normaler Login)
  skipSuccessfulRequests: true,
  message: 'Zu viele Anmeldeversuche, bitte versuchen Sie es in 15 Minuten erneut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// SMS sending limiter — prevent abuse of paid Twilio API
export const smsLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: devMultiplier(30), // 30 SMS pro 15 Min pro IP in prod
  message: 'Zu viele SMS-Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('sms:send', req);
    res.status(429).json({ error: 'Zu viele SMS-Anfragen, bitte versuchen Sie es später erneut.' });
  },
});

// Payment session limiter — prevent payment spam
export const paymentLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMultiplier(20), // 20 Payment-Sessions pro 15 Min pro IP
  message: 'Zu viele Zahlungsanfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('payment:session', req);
    res.status(429).json({ error: 'Zu viele Zahlungsanfragen, bitte versuchen Sie es später erneut.' });
  },
});

// Lead creation limiter — prevent spam lead injection
export const leadLimiter: any = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: devMultiplier(50), // 50 Leads pro 15 Min pro IP
  message: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('lead:create', req);
    res.status(429).json({ error: 'Zu viele Anfragen, bitte versuchen Sie es später erneut.' });
  },
});

// AI / Booth Games limiter — expensive API calls
export const aiFeatureLimiter: any = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 Minuten
  max: devMultiplier(15), // 15 AI calls pro 5 Min pro IP
  message: 'Zu viele KI-Anfragen, bitte versuchen Sie es später erneut.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logRateLimitHit('ai:feature', req);
    res.status(429).json({ error: 'Zu viele KI-Anfragen, bitte versuchen Sie es später erneut.' });
  },
});




