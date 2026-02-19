/**
 * Admin Cost Monitoring Routes
 * 
 * GET /api/admin/cost-monitoring/summary     — Overall cost summary (total, by provider, by feature)
 * GET /api/admin/cost-monitoring/timeline     — Cost over time (hourly/daily buckets)
 * GET /api/admin/cost-monitoring/top-events   — Top events by AI cost
 * GET /api/admin/cost-monitoring/alerts       — Cost anomalies and budget warnings
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const timeRangeSchema = z.enum(['1h', '6h', '24h', '7d', '30d', '90d']).default('24h');

function getTimeRangeMs(range: string): number {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    case '90d': return 90 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

// ─── GET /summary ───────────────────────────────────────────────────────────

router.get('/summary', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const timeRange = timeRangeSchema.parse(req.query.timeRange);
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    const logs = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: {
        providerId: true,
        feature: true,
        costCents: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        durationMs: true,
        success: true,
        provider: { select: { name: true, type: true } },
      },
    });

    // Aggregate totals
    const totalCostCents = logs.reduce((sum, l) => sum + l.costCents, 0);
    const totalTokens = logs.reduce((sum, l) => sum + l.totalTokens, 0);
    const totalRequests = logs.length;
    const successRate = totalRequests > 0 ? logs.filter(l => l.success).length / totalRequests : 1;
    const avgDurationMs = totalRequests > 0 ? Math.round(logs.reduce((sum, l) => sum + l.durationMs, 0) / totalRequests) : 0;

    // By provider
    const byProvider: Record<string, { name: string; type: string; costCents: number; requests: number; tokens: number }> = {};
    for (const l of logs) {
      if (!byProvider[l.providerId]) {
        byProvider[l.providerId] = { name: l.provider.name, type: l.provider.type, costCents: 0, requests: 0, tokens: 0 };
      }
      byProvider[l.providerId].costCents += l.costCents;
      byProvider[l.providerId].requests += 1;
      byProvider[l.providerId].tokens += l.totalTokens;
    }

    // By feature
    const byFeature: Record<string, { costCents: number; requests: number; tokens: number }> = {};
    for (const l of logs) {
      if (!byFeature[l.feature]) {
        byFeature[l.feature] = { costCents: 0, requests: 0, tokens: 0 };
      }
      byFeature[l.feature].costCents += l.costCents;
      byFeature[l.feature].requests += 1;
      byFeature[l.feature].tokens += l.totalTokens;
    }

    // Sort features by cost
    const topFeatures = Object.entries(byFeature)
      .map(([feature, data]) => ({ feature, ...data }))
      .sort((a, b) => b.costCents - a.costCents);

    res.json({
      timeRange,
      summary: {
        totalCostCents: Math.round(totalCostCents * 100) / 100,
        totalCostEur: Math.round(totalCostCents) / 100,
        totalTokens,
        totalRequests,
        successRate: Math.round(successRate * 1000) / 10,
        avgDurationMs,
      },
      byProvider: Object.values(byProvider).sort((a, b) => b.costCents - a.costCents),
      topFeatures: topFeatures.slice(0, 15),
    });
  } catch (error) {
    logger.error('Cost monitoring summary error', { error });
    res.status(500).json({ error: 'Kosten-Zusammenfassung fehlgeschlagen' });
  }
});

// ─── GET /timeline ──────────────────────────────────────────────────────────

router.get('/timeline', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const timeRange = timeRangeSchema.parse(req.query.timeRange);
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    const logs = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      select: { costCents: true, totalTokens: true, createdAt: true, success: true },
      orderBy: { createdAt: 'asc' },
    });

    // Determine bucket size
    const rangeMs = getTimeRangeMs(timeRange);
    const bucketMs = rangeMs <= 6 * 60 * 60 * 1000 ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // hourly or daily
    const bucketLabel = bucketMs === 60 * 60 * 1000 ? 'hourly' : 'daily';

    // Build buckets
    const buckets: Record<string, { costCents: number; tokens: number; requests: number; errors: number }> = {};
    for (const l of logs) {
      const bucketTime = new Date(Math.floor(l.createdAt.getTime() / bucketMs) * bucketMs);
      const key = bucketTime.toISOString();
      if (!buckets[key]) buckets[key] = { costCents: 0, tokens: 0, requests: 0, errors: 0 };
      buckets[key].costCents += l.costCents;
      buckets[key].tokens += l.totalTokens;
      buckets[key].requests += 1;
      if (!l.success) buckets[key].errors += 1;
    }

    const timeline = Object.entries(buckets)
      .map(([time, data]) => ({ time, ...data, costEur: Math.round(data.costCents) / 100 }))
      .sort((a, b) => a.time.localeCompare(b.time));

    res.json({ timeRange, bucketSize: bucketLabel, timeline });
  } catch (error) {
    logger.error('Cost monitoring timeline error', { error });
    res.status(500).json({ error: 'Timeline fehlgeschlagen' });
  }
});

// ─── GET /top-events ────────────────────────────────────────────────────────

router.get('/top-events', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const timeRange = timeRangeSchema.parse(req.query.timeRange);
    const since = new Date(Date.now() - getTimeRangeMs(timeRange));

    const logs = await prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: since }, eventId: { not: null } },
      select: { eventId: true, costCents: true, totalTokens: true },
    });

    // Aggregate by event
    const byEvent: Record<string, { costCents: number; tokens: number; requests: number }> = {};
    for (const l of logs) {
      const eid = l.eventId!;
      if (!byEvent[eid]) byEvent[eid] = { costCents: 0, tokens: 0, requests: 0 };
      byEvent[eid].costCents += l.costCents;
      byEvent[eid].tokens += l.totalTokens;
      byEvent[eid].requests += 1;
    }

    // Sort by cost, take top 20
    const topEventIds = Object.entries(byEvent)
      .sort((a, b) => b[1].costCents - a[1].costCents)
      .slice(0, 20);

    // Fetch event names
    const eventIds = topEventIds.map(([id]) => id);
    const events = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true, slug: true, hostId: true },
    });
    const eventMap = new Map(events.map(e => [e.id, e]));

    const topEvents = topEventIds.map(([eventId, data]) => {
      const event = eventMap.get(eventId);
      return {
        eventId,
        title: event?.title || 'Unbekannt',
        slug: event?.slug || '',
        costCents: Math.round(data.costCents * 100) / 100,
        costEur: Math.round(data.costCents) / 100,
        tokens: data.tokens,
        requests: data.requests,
      };
    });

    res.json({ timeRange, topEvents });
  } catch (error) {
    logger.error('Cost monitoring top-events error', { error });
    res.status(500).json({ error: 'Top-Events fehlgeschlagen' });
  }
});

// ─── GET /alerts ────────────────────────────────────────────────────────────

router.get('/alerts', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string; detail: string }> = [];

    // Check last 24h vs previous 24h
    const now = Date.now();
    const last24h = await prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: new Date(now - 24 * 60 * 60 * 1000) } },
      _sum: { costCents: true },
      _count: true,
    });
    const prev24h = await prisma.aiUsageLog.aggregate({
      where: {
        createdAt: {
          gte: new Date(now - 48 * 60 * 60 * 1000),
          lt: new Date(now - 24 * 60 * 60 * 1000),
        },
      },
      _sum: { costCents: true },
      _count: true,
    });

    const lastCost = last24h._sum.costCents || 0;
    const prevCost = prev24h._sum.costCents || 0;

    if (lastCost > 1000) {
      alerts.push({ level: 'critical', message: 'Hohe Kosten!', detail: `${(lastCost / 100).toFixed(2)}€ in den letzten 24h` });
    } else if (lastCost > 500) {
      alerts.push({ level: 'warning', message: 'Erhöhte Kosten', detail: `${(lastCost / 100).toFixed(2)}€ in den letzten 24h` });
    }

    if (prevCost > 0 && lastCost > prevCost * 2) {
      alerts.push({
        level: 'warning',
        message: 'Kostenanstieg >100%',
        detail: `${(lastCost / 100).toFixed(2)}€ vs ${(prevCost / 100).toFixed(2)}€ (vorherige 24h)`,
      });
    }

    // Check error rate
    const lastErrors = await prisma.aiUsageLog.count({
      where: { createdAt: { gte: new Date(now - 60 * 60 * 1000) }, success: false },
    });
    const lastTotal = await prisma.aiUsageLog.count({
      where: { createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    });
    if (lastTotal > 10 && lastErrors / lastTotal > 0.2) {
      alerts.push({
        level: 'critical',
        message: 'Hohe Fehlerrate',
        detail: `${lastErrors}/${lastTotal} Fehler in der letzten Stunde (${Math.round(lastErrors / lastTotal * 100)}%)`,
      });
    }

    if (alerts.length === 0) {
      alerts.push({ level: 'info', message: 'Alles normal', detail: `${(lastCost / 100).toFixed(2)}€ in den letzten 24h, ${last24h._count} Requests` });
    }

    res.json({ alerts });
  } catch (error) {
    logger.error('Cost monitoring alerts error', { error });
    res.status(500).json({ error: 'Alerts fehlgeschlagen' });
  }
});

export default router;
