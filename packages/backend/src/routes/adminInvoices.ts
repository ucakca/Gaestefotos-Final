import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  status: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  wcOrderId: z.string().min(1).optional(),
  wpUserId: z.coerce.number().int().positive().optional(),
  source: z.string().min(1).optional(),
});

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const q = listSchema.parse(req.query);
  const limit = q.limit ?? 100;

  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.source) where.source = q.source;
  if (q.eventId) where.eventId = q.eventId;
  if (q.wcOrderId) where.wcOrderId = q.wcOrderId;
  if (q.wpUserId) where.wpUserId = q.wpUserId;

  const invoices = await (prisma as any).invoiceRecord.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      source: true,
      status: true,
      wcOrderId: true,
      wpUserId: true,
      eventId: true,
      currency: true,
      amountCents: true,
      issuedAt: true,
      createdAt: true,
    },
  });

  res.json({ invoices });
});

router.get('/export.csv', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const q = listSchema.parse(req.query);

  const where: any = {};
  if (q.status) where.status = q.status;
  if (q.source) where.source = q.source;
  if (q.eventId) where.eventId = q.eventId;
  if (q.wcOrderId) where.wcOrderId = q.wcOrderId;
  if (q.wpUserId) where.wpUserId = q.wpUserId;

  const invoices = await (prisma as any).invoiceRecord.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      source: true,
      status: true,
      wcOrderId: true,
      wpUserId: true,
      eventId: true,
      currency: true,
      amountCents: true,
      issuedAt: true,
      createdAt: true,
    },
  });

  const header = [
    'id',
    'source',
    'status',
    'wcOrderId',
    'wpUserId',
    'eventId',
    'currency',
    'amountCents',
    'issuedAt',
    'createdAt',
  ].join(',');

  const lines = invoices.map((i: any) => {
    return [
      toCsvValue(i.id),
      toCsvValue(i.source),
      toCsvValue(i.status),
      toCsvValue(i.wcOrderId),
      toCsvValue(i.wpUserId),
      toCsvValue(i.eventId),
      toCsvValue(i.currency),
      toCsvValue(i.amountCents),
      toCsvValue(i.issuedAt?.toISOString?.() || i.issuedAt),
      toCsvValue(i.createdAt?.toISOString?.() || i.createdAt),
    ].join(',');
  });

  const csv = [header, ...lines].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
  res.send(csv);
});

export default router;
