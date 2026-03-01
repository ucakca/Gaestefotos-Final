import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { createHash } from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── POST /api/feedback — Submit guest feedback (public, no auth) ────────────

router.post('/', async (req: Request, res: Response) => {
  try {
    const { rating, message, eventId, aiJobId, context, googleReviewSent } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating muss zwischen 1-5 liegen' });
    }

    // Hash IP for spam prevention (no raw IPs stored)
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '';
    const ipHash = createHash('sha256').update(ip + (eventId || '')).digest('hex').slice(0, 16);

    // Deduplicate: max 1 feedback per IP+event per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const existing = await prisma.guestFeedback.findFirst({
      where: {
        ipHash,
        eventId: eventId || null,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (existing) {
      return res.status(429).json({ error: 'Du hast bereits Feedback gegeben. Danke!' });
    }

    const feedback = await prisma.guestFeedback.create({
      data: {
        rating,
        message: message?.slice(0, 2000) || null,
        eventId: eventId || null,
        aiJobId: aiJobId || null,
        context: context || 'result_page',
        googleReviewSent: googleReviewSent || false,
        ipHash,
        userAgent: req.headers['user-agent']?.slice(0, 500) || null,
      },
    });

    // Determine response: Google redirect URL or thank you
    let googleReviewUrl: string | null = null;
    if (rating >= 4) {
      // Look up Google Place ID from event settings or global settings
      let placeId: string | null = null;

      if (eventId) {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { featuresConfig: true },
        });
        const fc = (event?.featuresConfig || {}) as any;
        placeId = fc.googlePlaceId || null;
      }

      if (!placeId) {
        // Fallback: global setting
        const setting = await prisma.appSetting.findUnique({
          where: { key: 'google_place_id' },
        });
        placeId = (setting?.value as string) || null;
      }

      if (placeId) {
        googleReviewUrl = `https://search.google.com/local/writereview?placeid=${placeId}`;
      }
    }

    res.status(201).json({
      success: true,
      id: feedback.id,
      googleReviewUrl,
      message: rating >= 4
        ? 'Danke für deine Bewertung! 🎉'
        : 'Danke für dein Feedback! Wir arbeiten daran, besser zu werden. 💪',
    });
  } catch (error) {
    logger.error('Feedback submit error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Speichern des Feedbacks' });
  }
});

// ─── PATCH /api/feedback/:id/google-sent — Mark that user clicked Google link ─

router.patch('/:id/google-sent', async (req: Request, res: Response) => {
  try {
    await prisma.guestFeedback.update({
      where: { id: req.params.id },
      data: { googleReviewSent: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(404).json({ error: 'Feedback nicht gefunden' });
  }
});

// ─── GET /api/feedback/stats — Admin: Feedback statistics ─────────────────────

router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Nur Admins' });

    const { eventId } = req.query;
    const where: any = eventId ? { eventId: eventId as string } : {};

    const [total, avgRating, byRating, googleSent, recent] = await Promise.all([
      prisma.guestFeedback.count({ where }),
      prisma.guestFeedback.aggregate({ where, _avg: { rating: true } }),
      prisma.guestFeedback.groupBy({
        by: ['rating'],
        where,
        _count: { id: true },
        orderBy: { rating: 'asc' },
      }),
      prisma.guestFeedback.count({ where: { ...where, googleReviewSent: true } }),
      prisma.guestFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          rating: true,
          message: true,
          context: true,
          googleReviewSent: true,
          createdAt: true,
          eventId: true,
        },
      }),
    ]);

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    byRating.forEach((r: any) => { distribution[r.rating] = r._count.id; });

    res.json({
      total,
      averageRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0,
      distribution,
      googleReviewsSent: googleSent,
      negativeFeedback: distribution[1] + distribution[2] + distribution[3],
      positiveFeedback: distribution[4] + distribution[5],
      recent,
    });
  } catch (error) {
    logger.error('Feedback stats error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// ─── GET /api/feedback — Admin: List all feedback ─────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Nur Admins' });

    const { eventId, rating, limit = '50', offset = '0' } = req.query;
    const where: any = {};
    if (eventId) where.eventId = eventId as string;
    if (rating) where.rating = parseInt(rating as string);

    const [feedback, total] = await Promise.all([
      prisma.guestFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit as string) || 50, 200),
        skip: parseInt(offset as string) || 0,
      }),
      prisma.guestFeedback.count({ where }),
    ]);

    res.json({ feedback, total });
  } catch (error) {
    logger.error('Feedback list error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden des Feedbacks' });
  }
});

export default router;
