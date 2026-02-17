/**
 * Password History Service
 * 
 * Prevents users from reusing their last N passwords.
 * Stores bcrypt hashes and compares new passwords against history.
 */

import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const MAX_HISTORY = 5;

/**
 * Check if a plaintext password was recently used by this user.
 * Returns true if the password is in the history (i.e. should be rejected).
 */
export async function isPasswordReused(userId: string, plaintext: string): Promise<boolean> {
  try {
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: MAX_HISTORY,
      select: { hash: true },
    });

    for (const entry of history) {
      if (await bcrypt.compare(plaintext, entry.hash)) {
        return true;
      }
    }
    return false;
  } catch (error) {
    logger.error('[PasswordHistory] Check failed', { userId, error: (error as Error).message });
    return false; // Fail open — don't block password change on history check failure
  }
}

/**
 * Record a password hash in the user's history.
 * Call this AFTER successfully hashing and storing the new password.
 * Automatically prunes entries beyond MAX_HISTORY.
 */
export async function recordPasswordHash(userId: string, hash: string): Promise<void> {
  try {
    await prisma.passwordHistory.create({
      data: { userId, hash },
    });

    // Prune old entries beyond MAX_HISTORY
    const all = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (all.length > MAX_HISTORY) {
      const toDelete = all.slice(MAX_HISTORY).map(e => e.id);
      await prisma.passwordHistory.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  } catch (error) {
    logger.error('[PasswordHistory] Record failed', { userId, error: (error as Error).message });
  }
}
