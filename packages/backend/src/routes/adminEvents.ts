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

export default router;
