import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

// ─── GET /api/events/:eventId/analytics ─────────────────────────────────────
// Returns comprehensive event analytics for the host dashboard
router.get(
  '/:eventId/analytics',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      // Check access (host or admin)
      if (!await hasEventManageAccess(req, eventId)) {
        return res.status(403).json({ error: 'Kein Zugriff auf dieses Event' });
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, dateTime: true, createdAt: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Run all queries in parallel for performance
      const [
        totalPhotos,
        approvedPhotos,
        pendingPhotos,
        rejectedPhotos,
        totalGuestbook,
        totalVisits,
        totalLikes,
        photosByHour,
        topUploaders,
        sourceBreakdown,
        recentActivity,
        challengeStats,
      ] = await Promise.all([
        // Photo counts by status
        prisma.photo.count({ where: { eventId } }),
        prisma.photo.count({ where: { eventId, status: 'APPROVED' } }),
        prisma.photo.count({ where: { eventId, status: 'PENDING' } }),
        prisma.photo.count({ where: { eventId, status: 'REJECTED' } }),

        // Guestbook count
        (prisma as any).guestbookEntry.count({ where: { eventId } }).catch(() => 0),

        // Visit count from event
        prisma.event.findUnique({ where: { id: eventId }, select: { visitCount: true } })
          .then((e: any) => e?.visitCount || 0),

        // Total likes (via raw query since likeCount may not be on model)
        prisma.$queryRawUnsafe<any[]>(
          `SELECT COALESCE(SUM("likeCount"), 0)::int as total FROM photos WHERE "eventId" = $1`, eventId
        ).then((r: any[]) => r[0]?.total || 0).catch(() => 0),

        // Photos per hour (last 24h)
        prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            date_trunc('hour', "createdAt") as hour,
            COUNT(*)::int as count
          FROM photos 
          WHERE "eventId" = $1 
            AND "createdAt" > NOW() - INTERVAL '24 hours'
          GROUP BY date_trunc('hour', "createdAt")
          ORDER BY hour ASC
        `, eventId).catch(() => []),

        // Top 10 uploaders
        prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            "uploadedBy" as name,
            COUNT(*)::int as count
          FROM photos 
          WHERE "eventId" = $1 
            AND "uploadedBy" IS NOT NULL
            AND "status" = 'APPROVED'
          GROUP BY "uploadedBy"
          ORDER BY count DESC
          LIMIT 10
        `, eventId).catch(() => []),

        // Source breakdown (by source field or category)
        prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            COALESCE("source", 'gallery') as source,
            COUNT(*)::int as count
          FROM photos 
          WHERE "eventId" = $1
          GROUP BY COALESCE("source", 'gallery')
          ORDER BY count DESC
        `, eventId).catch(() => []),

        // Recent activity (last 20 photos)
        prisma.photo.findMany({
          where: { eventId },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            uploadedBy: true,
            status: true,
            createdAt: true,
          },
        }),

        // Challenge/game stats
        (prisma as any).challengeCompletion
          ? (prisma as any).challengeCompletion.count({ where: { eventId } }).catch(() => 0)
          : Promise.resolve(0),
      ]);

      // Calculate photos per hour rate
      const eventStart = event.dateTime || event.createdAt;
      const hoursElapsed = Math.max(1, (Date.now() - new Date(eventStart).getTime()) / (1000 * 60 * 60));
      const photosPerHour = Math.round((totalPhotos / hoursElapsed) * 10) / 10;

      // Find peak hour
      const peakHour = photosByHour.reduce(
        (max: any, h: any) => (h.count > (max?.count || 0) ? h : max),
        null
      );

      res.json({
        overview: {
          totalPhotos,
          approvedPhotos,
          pendingPhotos,
          rejectedPhotos,
          totalGuestbook,
          totalVisits,
          totalLikes,
          challengeCompletions: challengeStats,
          photosPerHour,
          peakHour: peakHour ? {
            time: peakHour.hour,
            count: peakHour.count,
          } : null,
        },
        photosByHour: photosByHour.map((h: any) => ({
          hour: h.hour,
          count: h.count,
        })),
        topUploaders: topUploaders.map((u: any) => ({
          name: u.name,
          count: u.count,
        })),
        sourceBreakdown: sourceBreakdown.map((s: any) => ({
          source: s.source,
          count: s.count,
        })),
        recentActivity: recentActivity.map((p: any) => ({
          id: p.id,
          uploadedBy: p.uploadedBy,
          status: p.status,
          createdAt: p.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Analytics fetch failed', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// ─── GET /api/events/:eventId/analytics/timeline ────────────────────────────
// Returns photo upload timeline for charting (configurable period)
router.get(
  '/:eventId/analytics/timeline',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const period = (req.query.period as string) || '24h';

      if (!await hasEventManageAccess(req, eventId)) {
        return res.status(403).json({ error: 'Kein Zugriff' });
      }

      const intervalMap: Record<string, { interval: string; bucket: string }> = {
        '1h': { interval: '1 hour', bucket: '5 minutes' },
        '6h': { interval: '6 hours', bucket: '15 minutes' },
        '24h': { interval: '24 hours', bucket: '1 hour' },
        '7d': { interval: '7 days', bucket: '1 day' },
        '30d': { interval: '30 days', bucket: '1 day' },
      };

      const config = intervalMap[period] || intervalMap['24h'];

      const timeline = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          date_trunc('${config.bucket}', "createdAt") as bucket,
          COUNT(*)::int as photos,
          COUNT(DISTINCT "uploadedBy")::int as uploaders
        FROM photos 
        WHERE "eventId" = $1 
          AND "createdAt" > NOW() - INTERVAL '${config.interval}'
        GROUP BY date_trunc('${config.bucket}', "createdAt")
        ORDER BY bucket ASC
      `, eventId).catch(() => []);

      res.json({
        period,
        timeline: timeline.map((t: any) => ({
          time: t.bucket,
          photos: t.photos,
          uploaders: t.uploaders,
        })),
      });
    } catch (error) {
      logger.error('Analytics timeline failed', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;
