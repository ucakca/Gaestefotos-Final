import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get event statistics
router.get('/events/:eventId/statistics', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check ownership
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Photo statistics
    const photoStats = await prisma.photo.groupBy({
      by: ['status'],
      where: {
        eventId,
        deletedAt: null,
        status: {
          not: 'DELETED',
        },
      },
      _count: {
        id: true,
      },
    });

    const totalPhotos = await prisma.photo.count({
      where: {
        eventId,
        deletedAt: null,
        status: {
          not: 'DELETED',
        },
      },
    });

    const approvedPhotos = await prisma.photo.count({
      where: {
        eventId,
        status: 'APPROVED',
        deletedAt: null,
      },
    });

    // Guest statistics
    const guestStats = await prisma.guest.groupBy({
      by: ['status'],
      where: { eventId },
      _count: {
        id: true,
      },
    });

    const totalGuests = await prisma.guest.count({
      where: { eventId },
    });

    const acceptedGuests = await prisma.guest.count({
      where: { eventId, status: 'ACCEPTED' },
    });

    // Upload trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const uploadTrends = await prisma.photo.findMany({
      where: {
        eventId,
        deletedAt: null,
        status: {
          not: 'DELETED',
        },
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by day
    const trendsByDay: Record<string, { approved: number; pending: number }> = {};
    uploadTrends.forEach((photo) => {
      const day = new Date(photo.createdAt).toISOString().split('T')[0];
      if (!trendsByDay[day]) {
        trendsByDay[day] = { approved: 0, pending: 0 };
      }
      if (photo.status === 'APPROVED') {
        trendsByDay[day].approved++;
      } else {
        trendsByDay[day].pending++;
      }
    });

    // Category statistics
    const categoryStats = await prisma.category.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    res.json({
      photos: {
        total: totalPhotos,
        approved: approvedPhotos,
        pending: photoStats.find((s) => s.status === 'PENDING')?._count.id || 0,
        rejected: photoStats.find((s) => s.status === 'REJECTED')?._count.id || 0,
        byStatus: photoStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      guests: {
        total: totalGuests,
        accepted: acceptedGuests,
        pending: guestStats.find((s) => s.status === 'PENDING')?._count.id || 0,
        declined: guestStats.find((s) => s.status === 'DECLINED')?._count.id || 0,
        byStatus: guestStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
      },
      uploadTrends: trendsByDay,
      categories: categoryStats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        photoCount: cat._count.photos,
      })),
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Statistiken', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Get user statistics (all events)
router.get('/statistics', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { hostId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    const totalPhotos = await prisma.photo.count({
      where: {
        event: {
          OR: [
            { hostId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
          deletedAt: null,
        },
        deletedAt: null,
        status: {
          not: 'DELETED',
        },
      },
    });

    const totalGuests = await prisma.guest.count({
      where: {
        event: {
          OR: [
            { hostId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
          deletedAt: null,
        },
      },
    });

    res.json({
      events: {
        total: events.length,
        active: events.filter((e) => {
          const eventDate = e.dateTime ? new Date(e.dateTime) : null;
          return eventDate && eventDate >= new Date();
        }).length,
      },
      photos: {
        total: totalPhotos,
      },
      guests: {
        total: totalGuests,
      },
      eventsList: events.map((event) => ({
        id: event.id,
        title: event.title,
        photoCount: event._count.photos,
        guestCount: event._count.guests,
        dateTime: event.dateTime,
      })),
    });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Benutzer-Statistiken', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;















