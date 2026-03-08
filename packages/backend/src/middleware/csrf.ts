import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { getRedis } from '../services/cache/redis';

const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const CSRF_TOKEN_EXPIRY_SEC = 3600; // 1 hour in seconds
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf-token';
const CSRF_PREFIX = 'csrf:';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token for session (Redis-backed for multi-instance support)
 */
async function storeCsrfToken(sessionId: string, token: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.setex(`${CSRF_PREFIX}${sessionId}`, CSRF_TOKEN_EXPIRY_SEC, token);
  } catch (error) {
    logger.warn('[csrf] Redis store failed, CSRF token not persisted', { error });
  }
}

/**
 * Verify CSRF token (Redis-backed)
 */
async function verifyCsrfToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const stored = await redis.get(`${CSRF_PREFIX}${sessionId}`);
    if (!stored) return false;
    // Use constant-time comparison to prevent timing attacks
    if (stored.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(token));
  } catch (error) {
    logger.warn('[csrf] Redis verify failed, rejecting CSRF token', { error });
    return false;
  }
}

/**
 * Get existing CSRF token from Redis
 */
async function getStoredCsrfToken(sessionId: string): Promise<string | null> {
  try {
    const redis = getRedis();
    return await redis.get(`${CSRF_PREFIX}${sessionId}`);
  } catch (error) {
    logger.warn('[csrf] Redis get failed', { error });
    return null;
  }
}

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Skip CSRF for Bearer token auth — browsers cannot auto-send Authorization
  // headers in cross-origin requests, so Bearer auth is inherently CSRF-safe.
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return next();
  }

  // Extract session ID (from JWT or session cookie)
  const sessionId = extractSessionId(req);
  
  if (!sessionId) {
    logger.warn('[csrf] No session ID found for CSRF validation', {
      method,
      path: req.path,
      ip: req.ip,
    });
    res.status(403).json({ error: 'CSRF-Token fehlt (keine Session)' });
    return;
  }

  // Extract CSRF token from header or body
  const csrfToken = req.headers[CSRF_HEADER] as string || req.body?.csrfToken;

  if (!csrfToken) {
    logger.warn('[csrf] CSRF token missing', {
      method,
      path: req.path,
      sessionId,
      ip: req.ip,
    });
    res.status(403).json({ error: 'CSRF-Token fehlt' });
    return;
  }

  // Verify token via Redis
  verifyCsrfToken(sessionId, csrfToken).then((valid) => {
    if (!valid) {
      logger.warn('[csrf] CSRF token validation failed', {
        method,
        path: req.path,
        sessionId,
        ip: req.ip,
      });
      res.status(403).json({ error: 'CSRF-Token ungültig' });
      return;
    }
    next();
  }).catch((err) => {
    logger.error('[csrf] CSRF verification error', { error: err });
    res.status(500).json({ error: 'Internal server error' });
  });
}

/**
 * CSRF Token Generator Middleware
 * Generates and sets CSRF token for authenticated sessions
 */
export function csrfTokenGenerator(req: Request, res: Response, next: NextFunction): void {
  const sessionId = extractSessionId(req);

  if (!sessionId) {
    return next();
  }

  // Check if token already exists in Redis
  getStoredCsrfToken(sessionId).then((existing) => {
    if (existing) {
      res.locals.csrfToken = existing;
      return next();
    }

    // Generate new token
    const token = generateCsrfToken();
    storeCsrfToken(sessionId, token).then(() => {
      res.locals.csrfToken = token;

      // Set cookie for client-side access
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false, // Allow JS access for sending in headers
        secure: isProd,
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRY_MS,
      });

      next();
    }).catch((err) => {
      logger.error('[csrf] Failed to store CSRF token', { error: err });
      next();
    });
  }).catch((err) => {
    logger.error('[csrf] Failed to check existing CSRF token', { error: err });
    next();
  });
}

/**
 * Extract session ID from request
 * Tries JWT token, session cookie, or custom header
 */
function extractSessionId(req: Request): string | null {
  // Try to extract from Authorization header (JWT)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // For simplicity, use token itself as session ID
    // In production, decode JWT and use user ID + session ID
    return token;
  }

  // Try to extract from session cookie
  const sessionCookie = req.cookies?.['connect.sid'] || req.cookies?.['session'];
  if (sessionCookie) {
    return sessionCookie;
  }

  // Fallback: use user ID from authenticated request
  const userId = (req as any).userId;
  if (userId) {
    return userId;
  }

  // Fallback: use existing CSRF cookie as session anchor (for unauthenticated users)
  const csrfCookie = req.cookies?.[CSRF_COOKIE];
  if (csrfCookie) {
    return `anon:${csrfCookie.slice(0, 16)}`;
  }

  // Last resort: generate a fingerprint from IP + user-agent
  const fingerprint = `${req.ip || '0.0.0.0'}:${(req.headers['user-agent'] || '').slice(0, 64)}`;
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 32);
  return `anon:${hash}`;
}

/**
 * Route handler to get CSRF token
 */
export function getCsrfTokenHandler(req: Request, res: Response): void | Response {
  const token = res.locals.csrfToken;

  if (!token) {
    return res.status(400).json({ error: 'CSRF-Token konnte nicht generiert werden' });
  }

  res.json({ csrfToken: token });
}
