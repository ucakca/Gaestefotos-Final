import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const querySchema = z.object({
  timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
  level: z.enum(['ALL', 'IMPORTANT', 'DEBUG']).optional().default('ALL'),
  search: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(10).max(100).optional().default(50),
});

function getTimeRangeMs(range: string): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// GET /api/admin/ai-logs - Intelligent log view with pattern analysis
router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Parameter' });
    }

    const { timeRange, level, search, page, limit } = parsed.data;
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    const where: any = { createdAt: { gte: since } };
    if (level !== 'ALL') where.level = level;
    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.qaLogEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, level: true, type: true, message: true, data: true, createdAt: true },
      }),
      prisma.qaLogEvent.count({ where }),
    ]);

    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    logger.error('[admin] ai-logs list error', { message: error?.message });
    res.status(500).json({ error: 'Fehler beim Laden der Logs' });
  }
});

// GET /api/admin/ai-logs/patterns - Detect patterns and anomalies
router.get('/patterns', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const timeRange = z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h').parse(req.query.timeRange);
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    // Get all logs in time range for pattern analysis
    const allLogs = await prisma.qaLogEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      select: { id: true, level: true, type: true, message: true, createdAt: true },
    });

    // --- Pattern Grouping ---
    const typeMap = new Map<string, { count: number; level: string; lastSeen: Date; firstSeen: Date; sample: string | null }>();
    for (const log of allLogs) {
      const key = log.type || 'unknown';
      const existing = typeMap.get(key);
      if (existing) {
        existing.count++;
        if (log.createdAt > existing.lastSeen) existing.lastSeen = log.createdAt;
        if (log.createdAt < existing.firstSeen) existing.firstSeen = log.createdAt;
      } else {
        typeMap.set(key, {
          count: 1,
          level: log.level,
          lastSeen: log.createdAt,
          firstSeen: log.createdAt,
          sample: log.message,
        });
      }
    }

    const patterns = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);

    // --- Timeline (hourly buckets) ---
    const buckets = new Map<string, { total: number; important: number; debug: number }>();
    for (const log of allLogs) {
      const hour = new Date(log.createdAt);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      const bucket = buckets.get(key) || { total: 0, important: 0, debug: 0 };
      bucket.total++;
      if (log.level === 'IMPORTANT') bucket.important++;
      else if (log.level === 'DEBUG') bucket.debug++;
      buckets.set(key, bucket);
    }

    const timeline = Array.from(buckets.entries())
      .map(([time, data]) => ({ time, ...data }))
      .sort((a, b) => a.time.localeCompare(b.time));

    // --- Anomaly Detection (simple spike detection) ---
    const anomalies: Array<{ time: string; metric: string; value: number; expected: number; severity: 'warning' | 'critical' }> = [];

    if (timeline.length >= 3) {
      const avgTotal = timeline.reduce((s, t) => s + t.total, 0) / timeline.length;
      const avgImportant = timeline.reduce((s, t) => s + t.important, 0) / timeline.length;

      for (const bucket of timeline) {
        if (bucket.total > avgTotal * 3 && bucket.total > 10) {
          anomalies.push({
            time: bucket.time,
            metric: 'Gesamt-Logs',
            value: bucket.total,
            expected: Math.round(avgTotal),
            severity: bucket.total > avgTotal * 5 ? 'critical' : 'warning',
          });
        }
        if (bucket.important > avgImportant * 3 && bucket.important > 5) {
          anomalies.push({
            time: bucket.time,
            metric: 'Fehler-Logs',
            value: bucket.important,
            expected: Math.round(avgImportant),
            severity: bucket.important > avgImportant * 5 ? 'critical' : 'warning',
          });
        }
      }
    }

    // --- Level Distribution ---
    const distribution = {
      total: allLogs.length,
      important: allLogs.filter(l => l.level === 'IMPORTANT').length,
      debug: allLogs.filter(l => l.level === 'DEBUG').length,
    };

    res.json({ patterns, timeline, anomalies, distribution, analyzedCount: allLogs.length });
  } catch (error: any) {
    logger.error('[admin] ai-logs patterns error', { message: error?.message });
    res.status(500).json({ error: 'Fehler bei der Muster-Analyse' });
  }
});

export default router;
