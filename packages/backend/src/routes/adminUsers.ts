import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { auditLog, AuditType } from '../services/auditLogger';

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

    if (!['HOST', 'ADMIN', 'PARTNER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    auditLog({ type: AuditType.ADMIN_USER_UPDATED, message: `User-Rolle geändert: ${user.email} → ${role}`, data: { targetUserId: id, newRole: role }, req });

    return res.json({ ok: true, user });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/lock', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { locked, reason } = req.body as { locked: boolean; reason?: string };

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot lock yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isLocked: locked,
        lockedAt: locked ? new Date() : null,
        lockedReason: locked ? (reason || null) : null,
      },
      select: { id: true, email: true, isLocked: true, lockedAt: true, lockedReason: true },
    });

    auditLog({
      type: AuditType.ADMIN_USER_UPDATED,
      message: locked
        ? `User gesperrt: ${user.email}${reason ? ` (Grund: ${reason})` : ''}`
        : `User entsperrt: ${user.email}`,
      data: { targetUserId: id, locked, reason },
      req,
    });

    return res.json({ ok: true, user: updated });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const deletedUser = await prisma.user.findUnique({ where: { id }, select: { email: true, name: true } });
    await prisma.user.delete({ where: { id } });

    auditLog({ type: AuditType.ADMIN_USER_DELETED, message: `User gelöscht: ${deletedUser?.email || id}`, data: { targetUserId: id, email: deletedUser?.email }, req });

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

// GET /stats — User counts by role + new users today/week
router.get('/stats', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const [total, hosts, admins, lockedCount, todayNew, weekNew] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'HOST' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { isLocked: true } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    ]);

    return res.json({ ok: true, stats: { total, hosts, admins, locked: lockedCount, newToday: todayNew, newThisWeek: weekNew } });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
