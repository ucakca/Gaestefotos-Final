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

router.patch('/:id/role', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'HOST', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    return res.json({ ok: true, user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/lock', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  return res.status(501).json({ error: 'User locking not implemented - field missing in schema' });
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ ok: true, user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
