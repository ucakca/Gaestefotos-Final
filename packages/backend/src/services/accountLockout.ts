/**
 * Account Lockout Service
 * 
 * Tracks failed login attempts per email in Redis.
 * After MAX_ATTEMPTS failures within WINDOW_SECONDS, the account is locked for LOCKOUT_SECONDS.
 * 
 * Config via env:
 *   LOCKOUT_MAX_ATTEMPTS  = 5  (default)
 *   LOCKOUT_WINDOW_SEC    = 900 (15 min, default)
 *   LOCKOUT_DURATION_SEC  = 900 (15 min, default)
 */

import { getRedis } from './cache/redis';
import { logger } from '../utils/logger';
import { domainToASCII } from 'node:url';

const PREFIX = 'lockout:';

function getMaxAttempts(): number {
  return Math.max(1, parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10) || 5);
}

function getWindowSec(): number {
  return Math.max(60, parseInt(process.env.LOCKOUT_WINDOW_SEC || '900', 10) || 900);
}

function getLockoutSec(): number {
  return Math.max(60, parseInt(process.env.LOCKOUT_DURATION_SEC || '900', 10) || 900);
}

/**
 * SEC-09: Normalize email to a canonical form for lockout tracking.
 * Converts domain to ASCII (Punycode) and lowercases everything,
 * so that user@exämple.com and user@xn--exmple-cua.com share the same counter.
 */
function normalizeEmailForLockout(email: string): string {
  const trimmed = email.toLowerCase().trim();
  const at = trimmed.lastIndexOf('@');
  if (at > 0 && at < trimmed.length - 1) {
    const local = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1);
    try {
      const asciiDomain = domainToASCII(domain);
      return `${local}@${asciiDomain}`;
    } catch {
      // Fall through to default
    }
  }
  return trimmed;
}

function attemptsKey(email: string): string {
  return `${PREFIX}attempts:${normalizeEmailForLockout(email)}`;
}

function lockedKey(email: string): string {
  return `${PREFIX}locked:${normalizeEmailForLockout(email)}`;
}

/**
 * Check if an account is currently locked out.
 * Returns remaining lockout seconds, or 0 if not locked.
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; remainingSeconds: number }> {
  try {
    const redis = getRedis();
    const ttl = await redis.ttl(lockedKey(email));
    if (ttl > 0) {
      return { locked: true, remainingSeconds: ttl };
    }
    return { locked: false, remainingSeconds: 0 };
  } catch (error) {
    // Fail closed: if Redis is unavailable, treat as locked to prevent brute-force during outages
    logger.error('[AccountLockout] Redis error in isAccountLocked — failing closed for safety', { error });
    return { locked: true, remainingSeconds: 60 };
  }
}

/**
 * Record a failed login attempt. Returns the current attempt count.
 * If max attempts reached, sets the lockout key.
 */
export async function recordFailedAttempt(email: string): Promise<{ attempts: number; locked: boolean; lockoutSeconds: number }> {
  try {
    const redis = getRedis();
    const key = attemptsKey(email);
    const maxAttempts = getMaxAttempts();
    const windowSec = getWindowSec();
    const lockoutSec = getLockoutSec();

    const attempts = await redis.incr(key);

    // Set TTL on first attempt
    if (attempts === 1) {
      await redis.expire(key, windowSec);
    }

    if (attempts >= maxAttempts) {
      // Lock the account
      await redis.setex(lockedKey(email), lockoutSec, '1');
      // Reset attempt counter
      await redis.del(key);
      logger.warn('[AccountLockout] Account locked after too many failed attempts', {
        email: email.toLowerCase().trim(),
        attempts,
        lockoutSeconds: lockoutSec,
      });
      return { attempts, locked: true, lockoutSeconds: lockoutSec };
    }

    return { attempts, locked: false, lockoutSeconds: 0 };
  } catch (error) {
    logger.warn('[AccountLockout] Redis error in recordFailedAttempt', { error });
    return { attempts: 0, locked: false, lockoutSeconds: 0 };
  }
}

/**
 * Clear failed attempts on successful login.
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  try {
    const redis = getRedis();
    await redis.del(attemptsKey(email), lockedKey(email));
  } catch (error) {
    logger.warn('[AccountLockout] Redis error in clearFailedAttempts', { error });
  }
}
