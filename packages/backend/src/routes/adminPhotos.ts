import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const listSchema = z.object({
  q: z.string().optional(),
  eventId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
    }

    const { eventId, status, limit, offset } = parsed.data;
    const where: any = {};

    if (eventId) where.eventId = eventId;
    
    if (status === 'pending') {
      where.status = 'PENDING';
    } else if (status === 'approved') {
      where.status = 'APPROVED';
    } else if (status === 'rejected') {
      where.status = 'REJECTED';
    }

    const [total, photos] = await Promise.all([
      prisma.photo.count({ where }),
      prisma.photo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          eventId: true,
          createdAt: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return res.json({ ok: true, total, photos });
  } catch (error: any) {
    logger.error('[admin] list photos error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk-moderate', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, isApproved } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be non-empty array' });
    }

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ error: 'isApproved must be boolean' });
    }

    const result = await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
      },
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
      },
    });

    logger.info('[admin] bulk moderate photos', {
      adminUserId: req.userId,
      count: result.count,
      status: isApproved ? 'APPROVED' : 'REJECTED',
    });

    return res.json({ ok: true, count: result.count });
  } catch (error: any) {
    logger.error('[admin] bulk moderate error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bulk-delete', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be non-empty array' });
    }

    const result = await prisma.photo.deleteMany({
      where: {
        id: { in: photoIds },
      },
    });

    logger.info('[admin] bulk delete photos', {
      adminUserId: req.userId,
      count: result.count,
    });

    return res.json({ ok: true, count: result.count });
  } catch (error: any) {
    logger.error('[admin] bulk delete error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
