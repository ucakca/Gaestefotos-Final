/**
 * JWT Key Rotation Service
 * 
 * Supports seamless key rotation via two env vars:
 *   JWT_SECRET          — current signing key (always used for new tokens)
 *   JWT_SECRET_PREVIOUS — previous key (accepted for verification during rotation)
 * 
 * Rotation workflow:
 *   1. Generate a new secret
 *   2. Set JWT_SECRET_PREVIOUS = current JWT_SECRET
 *   3. Set JWT_SECRET = new secret
 *   4. Restart backend
 *   5. After all old tokens expire (max token TTL), remove JWT_SECRET_PREVIOUS
 */

import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

/**
 * Get all valid JWT secrets (current first, then previous if set).
 */
export function getJwtSecrets(): string[] {
  const secrets: string[] = [];
  const current = process.env.JWT_SECRET;
  const previous = process.env.JWT_SECRET_PREVIOUS;

  if (current) secrets.push(current);
  if (previous && previous !== current) secrets.push(previous);

  return secrets;
}

/**
 * Sign a JWT with the CURRENT key only.
 */
export function signJwt(payload: object, options?: jwt.SignOptions): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Server misconfigured: JWT_SECRET is missing');
  return jwt.sign(payload, secret, options);
}

/**
 * Verify a JWT against current key first, then fall back to previous key.
 * Returns the decoded payload or throws if no key works.
 */
export function verifyJwt<T = any>(token: string): T {
  const secrets = getJwtSecrets();
  if (secrets.length === 0) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  let lastError: Error | null = null;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as T;
    } catch (err) {
      lastError = err as Error;
      // Only retry on signature/key mismatch errors, not on expiry
      if ((err as any)?.name === 'TokenExpiredError') {
        throw err; // Don't try other keys for expired tokens
      }
    }
  }

  // If we get here, all keys failed
  if (secrets.length > 1) {
    logger.debug('[JWT] Token verification failed with both current and previous keys');
  }
  throw lastError!;
}
