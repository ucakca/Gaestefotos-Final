import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const addCohostSchema = z.object({
  userId: z.string().uuid(),
});

const updateCohostPermissionsSchema = z.object({
  permissions: z
    .object({
      canUpload: z.boolean().optional(),
      canModerate: z.boolean().optional(),
      canEditEvent: z.boolean().optional(),
      canDownload: z.boolean().optional(),
    })
    .strict(),
});

function getCohostInviteJwtSecret(): string | null {
  return process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET || null;
}

function getCohostInviteTtlSeconds(): number {
  const raw = Number(process.env.COHOST_INVITE_TTL_SECONDS || 60 * 60 * 24 * 7);
  if (!Number.isFinite(raw) || raw <= 0) return 60 * 60 * 24 * 7;
  return Math.floor(raw);
}

async function requireManageAccessOr404(req: AuthRequest, res: Response, eventId: string): Promise<boolean> {
  const ok = await hasEventManageAccess(req, eventId);
  if (!ok) {
    res.status(404).json({ error: 'Event nicht gefunden' });
    return false;
  }
  return true;
}

// List co-hosts for an event
router.get('/:eventId/cohosts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await requireManageAccessOr404(req, res, eventId))) return;

    const members = await prisma.eventMember.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        permissions: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({ cohosts: members });
  } catch (error) {
    logger.error('List cohosts error', { message: (error as any)?.message || String(error), eventId: req.params.eventId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a co-host's permissions for an event (host/admin only)
router.put('/:eventId/cohosts/:userId/permissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, userId } = req.params;
    const { permissions } = updateCohostPermissionsSchema.parse(req.body);

    if (!(await requireManageAccessOr404(req, res, eventId))) return;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!req.userId || (event.hostId !== req.userId && req.userRole !== 'ADMIN' && req.userRole !== 'SUPERADMIN')) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId === userId) {
      return res.status(400).json({ error: 'Host Rechte können nicht geändert werden' });
    }

    const member = await prisma.eventMember.update({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      data: {
        permissions,
      },
      select: {
        id: true,
        role: true,
        permissions: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({ ok: true, cohost: member });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const code = (error as any)?.code;
    if (code === 'P2025') {
      return res.status(404).json({ error: 'Co-Host nicht gefunden' });
    }
    logger.error('Update cohost permissions error', { message: (error as any)?.message || String(error), eventId: req.params.eventId, userId: req.params.userId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a co-host to an event
router.post('/:eventId/cohosts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { userId } = addCohostSchema.parse(req.body);

    if (!(await requireManageAccessOr404(req, res, eventId))) return;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId === userId) {
      return res.status(400).json({ error: 'Host kann nicht als Co-Host hinzugefügt werden' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User nicht gefunden' });
    }

    const member = await prisma.eventMember.upsert({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
      create: {
        eventId,
        userId,
        role: 'COHOST',
      },
      update: {
        role: 'COHOST',
      },
      select: {
        id: true,
        role: true,
        permissions: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({ cohost: member });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Add cohost error', { message: (error as any)?.message || String(error), eventId: req.params.eventId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a co-host from an event
router.delete('/:eventId/cohosts/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, userId } = req.params;

    if (!(await requireManageAccessOr404(req, res, eventId))) return;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId === userId) {
      return res.status(400).json({ error: 'Host kann nicht entfernt werden' });
    }

    await prisma.eventMember.delete({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    return res.json({ ok: true });
  } catch (error: any) {
    const code = (error as any)?.code;
    if (code === 'P2025') {
      return res.status(404).json({ error: 'Co-Host nicht gefunden' });
    }
    logger.error('Remove cohost error', { message: (error as any)?.message || String(error), eventId: req.params.eventId, userId: req.params.userId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a co-host invite token for an event
router.post('/:eventId/cohosts/invite-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!(await requireManageAccessOr404(req, res, eventId))) return;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, title: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const secret = getCohostInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const inviteToken = jwt.sign(
      { type: 'cohost_invite', eventId },
      secret,
      { expiresIn: getCohostInviteTtlSeconds() }
    );

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || '';
    const shareUrl = event.slug
      ? `${frontendBaseUrl}/e2/${event.slug}?cohostInvite=${encodeURIComponent(inviteToken)}`
      : null;

    return res.json({ ok: true, eventId, inviteToken, shareUrl });
  } catch (error) {
    logger.error('Mint cohost invite token error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.eventId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
