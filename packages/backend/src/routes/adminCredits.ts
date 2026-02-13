/**
 * Admin Credits API
 * 
 * Endpoints für Credit-Verwaltung:
 * - GET    /admin/credits/:userId          → Credit-Balance abrufen
 * - POST   /admin/credits/:userId/add      → Credits hinzufügen (Bonus/Korrektur)
 * - GET    /admin/credits/:userId/history   → Transaktions-Historie
 * - GET    /admin/credits/overview          → Gesamt-Übersicht aller Nutzer
 * - PUT    /admin/credits/:userId/settings  → Auto-Recharge Einstellungen
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { addCredits, getOrCreateCreditBalance } from '../services/aiExecution';

const router = Router();

// ─── GET /admin/credits/overview ────────────────────────────────────────────
router.get('/overview', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const balances = await prisma.creditBalance.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const totals = balances.reduce(
      (acc, b) => ({
        totalBalance: acc.totalBalance + b.balance,
        totalPurchased: acc.totalPurchased + b.totalPurchased,
        totalConsumed: acc.totalConsumed + b.totalConsumed,
        userCount: acc.userCount + 1,
      }),
      { totalBalance: 0, totalPurchased: 0, totalConsumed: 0, userCount: 0 },
    );

    // Get user info for each balance
    const userIds = balances.map(b => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const enriched = balances.map(b => ({
      ...b,
      user: users.find(u => u.id === b.userId) || { id: b.userId, name: 'Unbekannt', email: null },
    }));

    res.json({ totals, balances: enriched });
  } catch (err) {
    logger.error('Failed to get credit overview', { err });
    res.status(500).json({ error: 'Fehler beim Laden der Credit-Übersicht' });
  }
});

// ─── GET /admin/credits/:userId ─────────────────────────────────────────────
router.get('/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const balance = await getOrCreateCreditBalance(userId);

    const recentTransactions = await prisma.creditTransaction.findMany({
      where: { balanceId: balance.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ balance, recentTransactions });
  } catch (err) {
    logger.error('Failed to get credit balance', { err, userId: req.params.userId });
    res.status(500).json({ error: 'Fehler beim Laden der Credit-Balance' });
  }
});

// ─── GET /admin/credits/:userId/history ─────────────────────────────────────
router.get('/:userId/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const balance = await getOrCreateCreditBalance(userId);

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { balanceId: balance.id },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.creditTransaction.count({
        where: { balanceId: balance.id },
      }),
    ]);

    res.json({
      transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to get credit history', { err, userId: req.params.userId });
    res.status(500).json({ error: 'Fehler beim Laden der Credit-Historie' });
  }
});

// ─── POST /admin/credits/:userId/add ────────────────────────────────────────
const addCreditsSchema = z.object({
  amount: z.number().int().positive().max(10000),
  type: z.enum(['BONUS', 'REFUND', 'PURCHASE']),
  description: z.string().min(1).max(500),
});

router.post('/:userId/add', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const parsed = addCreditsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
    }

    const { amount, type, description } = parsed.data;
    const result = await addCredits(userId, amount, type, `[Admin] ${description}`);

    logger.info('Admin added credits', {
      adminId: req.userId,
      targetUserId: userId,
      amount,
      type,
      newBalance: result.balance,
    });

    res.json({ success: true, balance: result.balance });
  } catch (err) {
    logger.error('Failed to add credits', { err, userId: req.params.userId });
    res.status(500).json({ error: 'Fehler beim Hinzufügen von Credits' });
  }
});

// ─── PUT /admin/credits/:userId/settings ────────────────────────────────────
const settingsSchema = z.object({
  autoRecharge: z.boolean(),
  autoRechargeThreshold: z.number().int().min(0).max(1000).optional(),
  autoRechargeAmount: z.number().int().min(10).max(10000).optional(),
});

router.put('/:userId/settings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
    }

    await getOrCreateCreditBalance(userId);

    const updated = await prisma.creditBalance.update({
      where: { userId },
      data: parsed.data,
    });

    res.json({ success: true, balance: updated });
  } catch (err) {
    logger.error('Failed to update credit settings', { err, userId: req.params.userId });
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen' });
  }
});

export default router;
