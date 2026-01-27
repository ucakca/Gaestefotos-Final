import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * CSRF Token Storage
 * In production, use Redis or similar distributed cache
 */
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf-token';

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token for session
 */
function storeCsrfToken(sessionId: string, token: string): void {
  tokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
  });

  // Cleanup expired tokens periodically
  if (Math.random() < 0.01) {
    cleanupExpiredTokens();
  }
}

/**
 * Verify CSRF token
 */
function verifyCsrfToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);
  
  if (!stored) {
    return false;
  }

  if (stored.expiresAt < Date.now()) {
    tokenStore.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * Cleanup expired tokens
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  let cleanedCount = 0;

  tokenStore.forEach((value, key) => {
    if (value.expiresAt < now) {
      tokenStore.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.debug('[csrf] Cleaned up expired tokens', { count: cleanedCount });
  }
}

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void | Response {
  const method = req.method.toUpperCase();

  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
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
    return res.status(403).json({ error: 'CSRF-Token fehlt (keine Session)' });
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
    return res.status(403).json({ error: 'CSRF-Token fehlt' });
  }

  // Verify token
  if (!verifyCsrfToken(sessionId, csrfToken)) {
    logger.warn('[csrf] CSRF token validation failed', {
      method,
      path: req.path,
      sessionId,
      ip: req.ip,
    });
    return res.status(403).json({ error: 'CSRF-Token ungültig' });
  }

  // Token valid, proceed
  next();
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

  // Check if token already exists and is valid
  const existing = tokenStore.get(sessionId);
  
  if (existing && existing.expiresAt > Date.now()) {
    // Attach existing token to response
    res.locals.csrfToken = existing.token;
    return next();
  }

  // Generate new token
  const token = generateCsrfToken();
  storeCsrfToken(sessionId, token);

  // Attach to response locals for access in routes
  res.locals.csrfToken = token;

  // Set cookie for client-side access (HttpOnly for security)
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Allow JS access for sending in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
  });

  next();
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

  return null;
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
