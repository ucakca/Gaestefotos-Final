import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

// Only ADMIN can manage hardware
function assertAdmin(req: AuthRequest, res: Response): boolean {
  if ((req as any).userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Nur Admins können Hardware verwalten' });
    return false;
  }
  return true;
}

// ─── INVENTORY CRUD ─────────────────────────────────────────────────────────

const createHardwareSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['PHOTO_BOOTH', 'MIRROR_BOOTH', 'KI_STATION', 'PRINT_TERMINAL', 'DISPLAY', 'GROUND_SPINNER']),
  serialNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// GET /api/hardware — List all hardware
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const items = await prisma.hardwareInventory.findMany({
      include: { bookings: { where: { status: { not: 'CANCELLED' } }, orderBy: { startDate: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ items });
  } catch (error) {
    logger.error('Failed to list hardware', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// POST /api/hardware — Add hardware item
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const data = createHardwareSchema.parse(req.body);
    const item = await prisma.hardwareInventory.create({ data });

    res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('Failed to create hardware', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/hardware/:id — Update hardware item
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { id } = req.params;
    const { name, type, serialNumber, status, notes } = req.body;

    const item = await prisma.hardwareInventory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ item });
  } catch (error) {
    logger.error('Failed to update hardware', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// DELETE /api/hardware/:id — Remove hardware item
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { id } = req.params;
    await prisma.hardwareInventory.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete hardware', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// ─── BOOKINGS ───────────────────────────────────────────────────────────────

const createBookingSchema = z.object({
  hardwareId: z.string().uuid(),
  eventId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  startDate: z.string().transform(s => new Date(s)),
  endDate: z.string().transform(s => new Date(s)),
  setupDate: z.string().optional().nullable().transform(s => s ? new Date(s) : null),
  teardownDate: z.string().optional().nullable().transform(s => s ? new Date(s) : null),
  notes: z.string().optional().nullable(),
  totalPrice: z.number().int().optional().nullable(),
});

// GET /api/hardware/bookings — List all bookings (with optional date range filter)
router.get('/bookings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { from, to, hardwareId } = req.query;
    const where: any = { status: { not: 'CANCELLED' } };

    if (hardwareId) where.hardwareId = hardwareId;
    if (from || to) {
      where.startDate = {};
      if (from) where.startDate.gte = new Date(from as string);
      if (to) where.endDate = { lte: new Date(to as string) };
    }

    const bookings = await prisma.hardwareBooking.findMany({
      where,
      include: { hardware: { select: { id: true, name: true, type: true } } },
      orderBy: { startDate: 'asc' },
    });

    res.json({ bookings });
  } catch (error) {
    logger.error('Failed to list bookings', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// POST /api/hardware/bookings — Create a booking (with availability check)
router.post('/bookings', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const data = createBookingSchema.parse(req.body);

    // Check availability — no overlapping non-cancelled bookings
    const effectiveStart = data.setupDate || data.startDate;
    const effectiveEnd = data.teardownDate || data.endDate;

    const conflict = await prisma.hardwareBooking.findFirst({
      where: {
        hardwareId: data.hardwareId,
        status: { not: 'CANCELLED' },
        OR: [
          { startDate: { lte: effectiveEnd }, endDate: { gte: effectiveStart } },
          { setupDate: { lte: effectiveEnd }, teardownDate: { gte: effectiveStart } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({
        error: 'Hardware ist im gewählten Zeitraum bereits gebucht',
        conflictingBooking: { id: conflict.id, startDate: conflict.startDate, endDate: conflict.endDate },
      });
    }

    const booking = await prisma.hardwareBooking.create({
      data: {
        hardwareId: data.hardwareId,
        eventId: data.eventId || null,
        customerName: data.customerName || null,
        customerEmail: data.customerEmail || null,
        startDate: data.startDate,
        endDate: data.endDate,
        setupDate: data.setupDate,
        teardownDate: data.teardownDate,
        notes: data.notes || null,
        totalPrice: data.totalPrice || null,
      },
      include: { hardware: { select: { id: true, name: true, type: true } } },
    });

    // Update hardware status
    await prisma.hardwareInventory.update({
      where: { id: data.hardwareId },
      data: { status: 'BOOKED' },
    });

    res.status(201).json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    logger.error('Failed to create booking', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// PUT /api/hardware/bookings/:id — Update booking status
router.put('/bookings/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { id } = req.params;
    const { status, notes, totalPrice } = req.body;

    const booking = await prisma.hardwareBooking.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(totalPrice !== undefined && { totalPrice }),
      },
      include: { hardware: true },
    });

    // If returned/cancelled, check if hardware has other active bookings
    if (status === 'RETURNED' || status === 'INSPECTED' || status === 'CANCELLED') {
      const activeBookings = await prisma.hardwareBooking.count({
        where: {
          hardwareId: booking.hardwareId,
          status: { in: ['RESERVED', 'CONFIRMED', 'DELIVERED', 'ACTIVE'] },
        },
      });
      if (activeBookings === 0) {
        await prisma.hardwareInventory.update({
          where: { id: booking.hardwareId },
          data: { status: 'AVAILABLE' },
        });
      }
    }

    res.json({ booking });
  } catch (error) {
    logger.error('Failed to update booking', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// GET /api/hardware/:id/availability — Check availability for a date range
router.get('/:id/availability', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { id } = req.params;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from und to sind erforderlich' });
    }

    const start = new Date(from as string);
    const end = new Date(to as string);

    const conflicts = await prisma.hardwareBooking.findMany({
      where: {
        hardwareId: id,
        status: { not: 'CANCELLED' },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: { id: true, startDate: true, endDate: true, status: true, customerName: true },
    });

    res.json({ available: conflicts.length === 0, conflicts });
  } catch (error) {
    logger.error('Failed to check availability', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;
