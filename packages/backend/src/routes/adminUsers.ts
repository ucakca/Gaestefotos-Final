import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const listSchema = z.object({
  q: z.string().optional(),
  role: z.enum(['ADMIN', 'HOST']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
  }

  const { q, role, limit, offset } = parsed.data;
  const where: any = {};

  if (role) where.role = role;

  const qTrimmed = typeof q === 'string' ? q.trim() : '';
  if (qTrimmed) {
    where.OR = [
      { email: { contains: qTrimmed, mode: 'insensitive' } },
      { name: { contains: qTrimmed, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return res.json({ ok: true, total, users });
});

export default router;
