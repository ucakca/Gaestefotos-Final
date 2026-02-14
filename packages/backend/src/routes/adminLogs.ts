import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ===== COMPREHENSIVE LOG QUERY SCHEMA =====
const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0),
  level: z.enum(['IMPORTANT', 'DEBUG', 'all']).optional().default('all'),
  type: z.string().optional(),
  eventId: z.string().optional(),
  userId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  path: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'all']).optional().default('all'),
});

// ===== GET ALL LOGS WITH FILTERS =====
router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = logsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter', details: parsed.error.errors });
    }

    const { limit, offset, level, type, eventId, userId, search, startDate, endDate, path, method } = parsed.data;

    // Build where clause
    const where: any = {};

    if (level && level !== 'all') {
      where.level = level;
    }

    if (type) {
      where.type = { contains: type, mode: 'insensitive' };
    }

    if (eventId) {
      where.eventId = eventId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    if (path) {
      where.path = { contains: path, mode: 'insensitive' };
    }

    if (method && method !== 'all') {
      where.method = method;
    }

    const [logs, total] = await Promise.all([
      prisma.qaLogEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.qaLogEvent.count({ where }),
    ]);

    return res.json({
      ok: true,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total,
      logs,
    });
  } catch (error: any) {
    logger.error('Error fetching logs', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== GET LOG STATISTICS =====
router.get('/stats', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      logsToday,
      logsThisWeek,
      importantCount,
      debugCount,
      typeBreakdown,
      topPaths,
      recentErrors,
    ] = await Promise.all([
      prisma.qaLogEvent.count(),
      prisma.qaLogEvent.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.qaLogEvent.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.qaLogEvent.count({ where: { level: 'IMPORTANT' } }),
      prisma.qaLogEvent.count({ where: { level: 'DEBUG' } }),
      prisma.qaLogEvent.groupBy({
        by: ['type'],
        _count: { type: true },
        orderBy: { _count: { type: 'desc' } },
        take: 10,
      }),
      prisma.qaLogEvent.groupBy({
        by: ['path'],
        _count: { path: true },
        where: { path: { not: null } },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      prisma.qaLogEvent.findMany({
        where: { level: 'IMPORTANT', createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, message: true, createdAt: true },
      }),
    ]);

    return res.json({
      ok: true,
      stats: {
        total: totalLogs,
        today: logsToday,
        thisWeek: logsThisWeek,
        byLevel: {
          important: importantCount,
          debug: debugCount,
        },
        topTypes: typeBreakdown.map(t => ({ type: t.type, count: t._count.type })),
        topPaths: topPaths.map(p => ({ path: p.path, count: p._count.path })),
        recentErrors,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching log stats', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== GET AVAILABLE LOG TYPES =====
router.get('/types', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const types = await prisma.qaLogEvent.groupBy({
      by: ['type'],
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
    });

    return res.json({
      ok: true,
      types: types.map(t => ({ type: t.type, count: t._count.type })),
    });
  } catch (error: any) {
    logger.error('Error fetching log types', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== GET SINGLE LOG DETAIL =====
router.get('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.qaLogEvent.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ ok: false, error: 'Log nicht gefunden' });
    }

    return res.json({ ok: true, log });
  } catch (error: any) {
    logger.error('Error fetching log detail', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== LEGACY: GET ERRORS (backwards compatible) =====
router.get('/errors', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await prisma.qaLogEvent.findMany({
      where: { level: 'IMPORTANT' },
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

    return res.json({
      ok: true,
      total,
      logs: logs.map(l => ({
        id: l.id,
        level: l.level.toLowerCase(),
        message: l.message || l.type,
        stack: null,
        context: l.data,
        createdAt: l.createdAt,
      })),
    });
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
