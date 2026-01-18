import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

router.get('/stats', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      totalUsers,
      totalEvents,
      totalPhotos,
      totalVideos,
      activeEvents,
      usersToday,
      eventsToday,
      photosToday,
      eventsThisMonth,
      photosThisMonth,
      eventsLastMonth,
      photosLastMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.photo.count(),
      prisma.video.count(),
      prisma.event.count({ 
        where: { 
          deletedAt: null,
          isActive: true,
          dateTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        } 
      }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.event.count({ where: { createdAt: { gte: today }, deletedAt: null } }),
      prisma.photo.count({ where: { createdAt: { gte: today } } }),
      prisma.event.count({ where: { createdAt: { gte: thisMonth }, deletedAt: null } }),
      prisma.photo.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.event.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth }, deletedAt: null } }),
      prisma.photo.count({ where: { createdAt: { gte: lastMonth, lt: thisMonth } } }),
    ]);

    const recentEvents = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        isActive: true,
        createdAt: true,
      },
    });

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
    });

    const storageStats = await prisma.photo.aggregate({
      _sum: {
        sizeBytes: true,
      },
    });

    const videoStorageStats = await prisma.video.aggregate({
      _sum: {
        sizeBytes: true,
      },
    });

    res.json({
      ok: true,
      stats: {
        total: {
          users: totalUsers,
          events: totalEvents,
          photos: totalPhotos,
          videos: totalVideos,
          activeEvents,
        },
        today: {
          users: usersToday,
          events: eventsToday,
          photos: photosToday,
        },
        growth: {
          eventsThisMonth,
          eventsLastMonth,
          eventsGrowth: eventsLastMonth > 0 
            ? ((eventsThisMonth - eventsLastMonth) / eventsLastMonth * 100).toFixed(1)
            : '0',
          photosThisMonth,
          photosLastMonth,
          photosGrowth: photosLastMonth > 0
            ? ((photosThisMonth - photosLastMonth) / photosLastMonth * 100).toFixed(1)
            : '0',
        },
        storage: {
          photosBytes: Number(storageStats._sum?.sizeBytes || 0),
          videosBytes: Number(videoStorageStats._sum?.sizeBytes || 0),
          totalBytes: Number(storageStats._sum?.sizeBytes || 0) + Number(videoStorageStats._sum?.sizeBytes || 0),
        },
      },
      recent: {
        events: recentEvents,
        users: recentUsers,
      },
    });
  } catch (error: any) {
    logger.error('[admin] dashboard stats error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const topEventsByPhotos = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: {
        photos: {
          _count: 'desc',
        },
      },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        host: {
          select: {
            name: true,
            email: true,
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

    const topEventsByGuests = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: {
        guests: {
          _count: 'desc',
        },
      },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    const topHosts = await prisma.user.findMany({
      orderBy: {
        events: {
          _count: 'desc',
        },
      },
      take: 10,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dailyActivity = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [photos, events] = await Promise.all([
        prisma.photo.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.event.count({ where: { createdAt: { gte: date, lt: nextDate }, deletedAt: null } }),
      ]);

      dailyActivity.push({
        date: date.toISOString(),
        photos,
        events,
      });
    }

    res.json({
      ok: true,
      analytics: {
        topEventsByPhotos,
        topEventsByGuests,
        topHosts,
        dailyActivity,
      },
    });
  } catch (error: any) {
    logger.error('[admin] analytics error', { message: error?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
