import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const listSchema = z.object({
  q: z.string().optional(),
  hostId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
  }

  const { q, hostId, limit, offset } = parsed.data;
  const where: any = {
    deletedAt: null,
  };

  const qTrimmed = typeof q === 'string' ? q.trim() : '';
  if (qTrimmed) {
    where.OR = [
      { title: { contains: qTrimmed, mode: 'insensitive' } },
      { slug: { contains: qTrimmed, mode: 'insensitive' } },
    ];
  }

  const hostIdTrimmed = typeof hostId === 'string' ? hostId.trim() : '';
  if (hostIdTrimmed) where.hostId = hostIdTrimmed;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        hostId: true,
        title: true,
        slug: true,
        dateTime: true,
        createdAt: true,
        _count: {
          select: {
            photos: true,
            guests: true,
            videos: true,
          },
        },
      },
    }),
  ]);

  return res.json({ ok: true, total, events });
});

router.patch('/:id/status', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be boolean' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { isActive },
      select: { id: true, title: true, isActive: true },
    });

    return res.json({ ok: true, event });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      await prisma.event.delete({ where: { id } });
    } else {
      await prisma.event.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        title: true,
        slug: true,
        dateTime: true,
        locationName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        host: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
            videos: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ ok: true, event });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
