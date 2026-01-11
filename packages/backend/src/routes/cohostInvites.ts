import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { assertFeatureEnabled, assertWithinLimit } from '../services/featureGate';

const router = Router();

const acceptSchema = z.object({
  inviteToken: z.string().min(1),
});

function getInviteJwtSecret(): string | null {
  return process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET || null;
}

// Accept a co-host invite token (requires login)
router.post('/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { inviteToken } = acceptSchema.parse(req.body);

    const secret = getInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(inviteToken, secret);
    } catch {
      return res.status(400).json({ error: 'Ungültiger Invite Token' });
    }

    if (decoded?.type !== 'cohost_invite' || typeof decoded?.eventId !== 'string') {
      return res.status(400).json({ error: 'Ungültiger Invite Token' });
    }

    const eventId = decoded.eventId as string;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (event.hostId === req.userId) {
      return res.status(400).json({ error: 'Host kann nicht als Co-Host beitreten' });
    }

    try {
      await assertFeatureEnabled(eventId, 'coHosts');
    } catch (err: any) {
      if (err.code === 'FEATURE_NOT_AVAILABLE') {
        return res.status(403).json({ error: err.message, details: err.details });
      }
      throw err;
    }

    const currentCount = await prisma.eventMember.count({ where: { eventId } });
    try {
      await assertWithinLimit(eventId, 'maxCoHosts', currentCount);
    } catch (err: any) {
      if (err.code === 'LIMIT_REACHED') {
        return res.status(403).json({ error: err.message, details: err.details });
      }
      throw err;
    }

    await prisma.eventMember.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId: req.userId,
        },
      },
      create: {
        eventId,
        userId: req.userId,
        role: 'COHOST',
      },
      update: {
        role: 'COHOST',
      },
      select: { id: true },
    });

    return res.json({ ok: true, eventId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    logger.error('Accept cohost invite error', {
      message: (error as any)?.message || String(error),
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
