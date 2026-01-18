import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/errors', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
    }

    const { limit, offset } = parsed.data;

    const logs = await prisma.qaLogEvent.findMany({
      where: {
        level: 'IMPORTANT',
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        level: true,
        type: true,
        message: true,
        data: true,
        createdAt: true,
      },
    });

    const total = await prisma.qaLogEvent.count({ where: { level: 'IMPORTANT' } });

    return res.json({ ok: true, total, logs: logs.map(l => ({
      id: l.id,
      level: l.level.toLowerCase(),
      message: l.message || l.type,
      stack: null,
      context: l.data,
      createdAt: l.createdAt,
    })) });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/errors/cleanup', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.qaLogEvent.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    return res.json({ ok: true, deleted: result.count });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
