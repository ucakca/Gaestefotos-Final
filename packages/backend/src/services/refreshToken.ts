import crypto from 'crypto';
import { getRedis } from './cache/redis';
import { logger } from '../utils/logger';

const REFRESH_PREFIX = 'refresh:';
const USER_REFRESH_PREFIX = 'user-refresh:';
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getTtl(): number {
  const raw = process.env.REFRESH_TOKEN_TTL_SECONDS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TTL_SECONDS;
}

/**
 * Generate and store a refresh token for a user.
 * Returns the opaque token string to send to the client.
 */
export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  const ttl = getTtl();

  try {
    const redis = getRedis();
    // Store token → userId mapping
    await redis.setex(`${REFRESH_PREFIX}${token}`, ttl, userId);
    // Track token in user's set (for revocation)
    await redis.sadd(`${USER_REFRESH_PREFIX}${userId}`, token);
    await redis.expire(`${USER_REFRESH_PREFIX}${userId}`, ttl);
  } catch (error) {
    logger.warn('[RefreshToken] Redis store failed', { error });
  }

  return token;
}

/**
 * Validate a refresh token. Returns the userId if valid, null otherwise.
 * Consumes the token (one-time use) and issues tracking cleanup.
 */
export async function consumeRefreshToken(token: string): Promise<string | null> {
  try {
    const redis = getRedis();
    const key = `${REFRESH_PREFIX}${token}`;
    const userId = await redis.get(key);

    if (!userId) return null;

    // Delete the consumed token (rotation: old token is invalid after use)
    await redis.del(key);
    await redis.srem(`${USER_REFRESH_PREFIX}${userId}`, token);

    return userId;
  } catch (error) {
    logger.warn('[RefreshToken] Redis consume failed', { error });
    return null;
  }
}

/**
 * Revoke all refresh tokens for a user (e.g. on logout or password change).
 */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  try {
    const redis = getRedis();
    const tokens = await redis.smembers(`${USER_REFRESH_PREFIX}${userId}`);

    if (tokens.length > 0) {
      const pipeline = redis.pipeline();
      for (const t of tokens) {
        pipeline.del(`${REFRESH_PREFIX}${t}`);
      }
      pipeline.del(`${USER_REFRESH_PREFIX}${userId}`);
      await pipeline.exec();
    }

    logger.debug('[RefreshToken] Revoked all tokens for user', { userId, count: tokens.length });
  } catch (error) {
    logger.warn('[RefreshToken] Redis revoke failed', { error });
  }
}

/**
 * Set the refresh token as an httpOnly cookie.
 */
export function setRefreshCookie(res: any, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    maxAge: getTtl() * 1000,
    path: '/api/auth', // Only sent to auth endpoints
  });
}

/**
 * Clear the refresh token cookie.
 */
export function clearRefreshCookie(res: any): void {
  const isProd = process.env.NODE_ENV === 'production';
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    domain,
    path: '/api/auth',
  });
}
