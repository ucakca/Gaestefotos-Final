import { Router, Request, Response } from 'express';
import { PrismaClient, SessionType, PaymentStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Session pricing in cents
const SESSION_PRICES: Record<string, number> = {
  PHOTO_BOOTH: 299,      // €2.99
  KI_KUNST: 199,         // €1.99
  GROUND_SPINNER: 499,   // €4.99
  PRINT_SINGLE: 149,     // €1.49
  PRINT_BUNDLE: 399,     // €3.99 (5 prints)
  DRAWBOT: 599,          // €5.99
};

// GET /api/events/:eventId/payment-sessions — list sessions for event
router.get('/events/:eventId/payment-sessions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, type, limit = '50', offset = '0' } = req.query;

    const where: any = { eventId };
    if (status) where.status = status as PaymentStatus;
    if (type) where.sessionType = type as SessionType;

    const [sessions, total] = await Promise.all([
      prisma.paymentSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.paymentSession.count({ where }),
    ]);

    res.json({ sessions, total });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:eventId/payment-sessions/stats — revenue stats
router.get('/events/:eventId/payment-sessions/stats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const [totalRevenue, sessionCounts, recentSessions] = await Promise.all([
      prisma.paymentSession.aggregate({
        where: { eventId, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.paymentSession.groupBy({
        by: ['sessionType'],
        where: { eventId, status: 'PAID' },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.paymentSession.findMany({
        where: { eventId, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      totalRevenue: totalRevenue._sum.amount || 0,
      totalSessions: totalRevenue._count || 0,
      byType: sessionCounts.map(s => ({
        type: s.sessionType,
        count: s._count,
        revenue: s._sum.amount || 0,
      })),
      recentSessions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/payment-sessions — create a payment session (checkout)
router.post('/events/:eventId/payment-sessions', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { sessionType, visitorId, customerName, customerEmail, metadata } = req.body;

    if (!sessionType || !SESSION_PRICES[sessionType]) {
      return res.status(400).json({ error: 'Ungültiger Session-Typ' });
    }

    const amount = SESSION_PRICES[sessionType];

    // Create payment session
    const session = await prisma.paymentSession.create({
      data: {
        eventId,
        visitorId,
        customerName,
        customerEmail,
        sessionType: sessionType as SessionType,
        amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        metadata: metadata || {},
      },
    });

    // In production: create Stripe Checkout session here
    // For now, return the session with a mock checkout URL
    res.status(201).json({
      session,
      checkoutUrl: `/api/events/${eventId}/payment-sessions/${session.id}/mock-pay`,
      prices: SESSION_PRICES,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/payment-sessions/:id/mock-pay — simulate payment (dev)
router.post('/events/:eventId/payment-sessions/:id/mock-pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.paymentSession.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripePaymentId: `mock_${Date.now()}`,
      },
    });

    res.json({ session, message: 'Zahlung erfolgreich (Mock)' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:eventId/payment-sessions/:id/refund — refund a session
router.post('/events/:eventId/payment-sessions/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.paymentSession.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Session nicht gefunden' });
    if (existing.status !== 'PAID') return res.status(400).json({ error: 'Nur bezahlte Sessions können erstattet werden' });

    // In production: create Stripe refund here
    const session = await prisma.paymentSession.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });

    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment-prices — public pricing endpoint
router.get('/payment-prices', async (_req: Request, res: Response) => {
  res.json({
    prices: Object.entries(SESSION_PRICES).map(([type, amount]) => ({
      type,
      amount,
      currency: 'EUR',
      formatted: `€${(amount / 100).toFixed(2)}`,
    })),
  });
});

export default router;
