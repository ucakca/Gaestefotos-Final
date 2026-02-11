import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function requireAdmin(req: AuthRequest, res: Response): boolean {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Nur Admins können Partner verwalten' });
    return false;
  }
  return true;
}

async function requirePartnerAccess(req: AuthRequest, res: Response, partnerId: string): Promise<boolean> {
  if (req.userRole === 'ADMIN') return true;

  const membership = await prisma.partnerMember.findUnique({
    where: { partnerId_userId: { partnerId, userId: req.userId! } },
  });
  if (!membership) {
    res.status(403).json({ error: 'Kein Zugriff auf diesen Partner' });
    return false;
  }
  return true;
}

// ─── LIST PARTNERS (Admin: all, Partner: own) ────────────────────────────────

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let partners;

    if (req.userRole === 'ADMIN') {
      partners = await prisma.partner.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { events: true, members: true, hardware: true } },
        },
      });
    } else {
      // Partners where user is a member
      const memberships = await prisma.partnerMember.findMany({
        where: { userId: req.userId! },
        include: {
          partner: {
            include: {
              _count: { select: { events: true, members: true, hardware: true } },
            },
          },
        },
      });
      partners = memberships.map((m: any) => ({ ...m.partner, memberRole: m.role }));
    }

    res.json({ partners });
  } catch (error) {
    logger.error('List partners error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Partner' });
  }
});

// ─── CREATE PARTNER (Admin only) ─────────────────────────────────────────────

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { name, slug, tier, contactEmail, contactPhone, companyName, taxId, maxEvents, maxStorageGb, commissionPct, notes } = req.body;

    if (!name || !slug || !contactEmail) {
      return res.status(400).json({ error: 'Name, Slug und E-Mail sind erforderlich' });
    }

    const existing = await prisma.partner.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Ein Partner mit diesem Slug existiert bereits' });
    }

    const partner = await prisma.partner.create({
      data: {
        name,
        slug,
        tier: tier || 'BRANDED',
        contactEmail,
        contactPhone,
        companyName,
        taxId,
        maxEvents: maxEvents || 50,
        maxStorageGb: maxStorageGb || 100,
        commissionPct: commissionPct ?? 20,
        notes,
      },
    });

    res.status(201).json({ partner });
  } catch (error) {
    logger.error('Create partner error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen des Partners' });
  }
});

// ─── GET PARTNER ─────────────────────────────────────────────────────────────

router.get('/:partnerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
        hardware: true,
        _count: { select: { events: true } },
      },
    });

    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden' });

    res.json({ partner });
  } catch (error) {
    logger.error('Get partner error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden des Partners' });
  }
});

// ─── UPDATE PARTNER ──────────────────────────────────────────────────────────

router.put('/:partnerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const allowedFields = [
      'name', 'tier', 'status', 'contactEmail', 'contactPhone', 'companyName', 'taxId',
      'logoUrl', 'primaryColor', 'accentColor', 'customDomain',
      'maxEvents', 'maxStorageGb', 'commissionPct', 'billingEmail', 'billingAddress', 'notes',
    ];

    const data: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    // Only admins can change tier, status, commission, limits
    if (req.userRole !== 'ADMIN') {
      delete data.tier;
      delete data.status;
      delete data.commissionPct;
      delete data.maxEvents;
      delete data.maxStorageGb;
    }

    const partner = await prisma.partner.update({
      where: { id: partnerId },
      data,
    });

    res.json({ partner });
  } catch (error) {
    logger.error('Update partner error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Partners' });
  }
});

// ─── PARTNER EVENTS ──────────────────────────────────────────────────────────

router.get('/:partnerId/events', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const events = await prisma.event.findMany({
      where: { partnerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        isActive: true,
        createdAt: true,
        host: { select: { name: true, email: true } },
        _count: { select: { photos: true, videos: true } },
      },
    });

    res.json({ events });
  } catch (error) {
    logger.error('List partner events error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Events' });
  }
});

// ─── PARTNER STATS ───────────────────────────────────────────────────────────

router.get('/:partnerId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const [eventCount, photoCount, videoCount, printJobCount] = await Promise.all([
      prisma.event.count({ where: { partnerId, deletedAt: null } }),
      prisma.photo.count({ where: { event: { partnerId } } }),
      prisma.video.count({ where: { event: { partnerId } } }),
      prisma.mosaicPrintJob.count({ where: { wall: { event: { partnerId } } } }),
    ]);

    res.json({
      stats: {
        events: eventCount,
        photos: photoCount,
        videos: videoCount,
        printJobs: printJobCount,
      },
    });
  } catch (error) {
    logger.error('Partner stats error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// ─── ADD MEMBER TO PARTNER ───────────────────────────────────────────────────

router.post('/:partnerId/members', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'E-Mail ist erforderlich' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden. Bitte zuerst registrieren.' });

    const existing = await prisma.partnerMember.findUnique({
      where: { partnerId_userId: { partnerId, userId: user.id } },
    });
    if (existing) return res.status(409).json({ error: 'Benutzer ist bereits Mitglied' });

    const member = await prisma.partnerMember.create({
      data: {
        partnerId,
        userId: user.id,
        role: role || 'OPERATOR',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Upgrade user role to PARTNER if currently HOST
    if (user.role === 'HOST') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'PARTNER' } });
    }

    res.status(201).json({ member });
  } catch (error) {
    logger.error('Add partner member error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Hinzufügen des Mitglieds' });
  }
});

// ─── REMOVE MEMBER ───────────────────────────────────────────────────────────

router.delete('/:partnerId/members/:userId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, userId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    await prisma.partnerMember.delete({
      where: { partnerId_userId: { partnerId, userId } },
    });

    res.json({ ok: true });
  } catch (error) {
    logger.error('Remove partner member error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Entfernen des Mitglieds' });
  }
});

// ─── HARDWARE MANAGEMENT ─────────────────────────────────────────────────────

router.post('/:partnerId/hardware', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const { type, name, serialNumber, notes } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'Typ und Name sind erforderlich' });

    const hardware = await prisma.partnerHardware.create({
      data: { partnerId, type, name, serialNumber, notes },
    });

    res.status(201).json({ hardware });
  } catch (error) {
    logger.error('Add hardware error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Hardware' });
  }
});

router.put('/:partnerId/hardware/:hardwareId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, hardwareId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const { name, status, assignedEventId, notes, serialNumber } = req.body;
    const data: Record<string, any> = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (assignedEventId !== undefined) data.assignedEventId = assignedEventId;
    if (notes !== undefined) data.notes = notes;
    if (serialNumber !== undefined) data.serialNumber = serialNumber;

    const hardware = await prisma.partnerHardware.update({
      where: { id: hardwareId },
      data,
    });

    res.json({ hardware });
  } catch (error) {
    logger.error('Update hardware error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Hardware' });
  }
});

// ─── BILLING ─────────────────────────────────────────────────────────────────

// List billing periods for a partner
router.get('/:partnerId/billing', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const periods = await prisma.billingPeriod.findMany({
      where: { partnerId },
      orderBy: { periodStart: 'desc' },
      include: { _count: { select: { lineItems: true } } },
    });

    res.json({ periods });
  } catch (error) {
    logger.error('List billing periods error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Abrechnungen' });
  }
});

// Generate a billing period (Admin only)
router.post('/:partnerId/billing/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { partnerId } = req.params;
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart und periodEnd sind erforderlich' });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) return res.status(404).json({ error: 'Partner nicht gefunden' });

    // Count events in period
    const events = await prisma.event.findMany({
      where: {
        partnerId,
        deletedAt: null,
        createdAt: { gte: start, lte: end },
      },
      select: { id: true, title: true },
    });

    // Count photos and print jobs in period
    const [photoCount, printJobCount] = await Promise.all([
      prisma.photo.count({
        where: {
          event: { partnerId },
          createdAt: { gte: start, lte: end },
        },
      }),
      prisma.mosaicPrintJob.count({
        where: {
          wall: { event: { partnerId } },
          createdAt: { gte: start, lte: end },
        },
      }),
    ]);

    // Build line items
    const lineItems: { type: string; description: string; quantity: number; unitPrice: number; total: number; eventId?: string }[] = [];

    // Event fees
    for (const event of events) {
      lineItems.push({
        type: 'EVENT_FEE',
        description: `Event: ${event.title}`,
        quantity: 1,
        unitPrice: 0, // configurable per partner later
        total: 0,
        eventId: event.id,
      });
    }

    // Print jobs as a single line
    if (printJobCount > 0) {
      const printUnitPrice = 1.50; // default price per print
      lineItems.push({
        type: 'PRINT_JOB',
        description: `Mosaic Print-Jobs (${start.toLocaleDateString('de-DE')} – ${end.toLocaleDateString('de-DE')})`,
        quantity: printJobCount,
        unitPrice: printUnitPrice,
        total: printJobCount * printUnitPrice,
      });
    }

    const totalRevenue = lineItems.reduce((sum, li) => sum + li.total, 0);
    const commissionAmount = Math.round(totalRevenue * partner.commissionPct) / 100;
    const partnerPayout = totalRevenue - commissionAmount;

    // Create billing period with line items
    const period = await prisma.billingPeriod.create({
      data: {
        partnerId,
        periodStart: start,
        periodEnd: end,
        totalEvents: events.length,
        totalPhotos: photoCount,
        totalPrintJobs: printJobCount,
        totalRevenue,
        commissionPct: partner.commissionPct,
        commissionAmount,
        partnerPayout,
        lineItems: {
          create: lineItems,
        },
      },
      include: { lineItems: true, _count: { select: { lineItems: true } } },
    });

    res.status(201).json({ period });
  } catch (error) {
    logger.error('Generate billing period error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Generieren der Abrechnung' });
  }
});

// Get billing period detail
router.get('/:partnerId/billing/:periodId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId, periodId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const period = await prisma.billingPeriod.findFirst({
      where: { id: periodId, partnerId },
      include: { lineItems: { orderBy: { createdAt: 'asc' } }, partner: { select: { name: true, companyName: true, billingEmail: true } } },
    });

    if (!period) return res.status(404).json({ error: 'Abrechnungszeitraum nicht gefunden' });

    res.json({ period });
  } catch (error) {
    logger.error('Get billing period error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Abrechnung' });
  }
});

// Update billing period status (Admin only)
router.put('/:partnerId/billing/:periodId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { periodId } = req.params;
    const { status, invoiceNumber, notes } = req.body;

    const data: Record<string, any> = {};
    if (status) data.status = status;
    if (invoiceNumber !== undefined) data.invoiceNumber = invoiceNumber;
    if (notes !== undefined) data.notes = notes;
    if (status === 'PAID') data.paidAt = new Date();

    const period = await prisma.billingPeriod.update({
      where: { id: periodId },
      data,
      include: { _count: { select: { lineItems: true } } },
    });

    res.json({ period });
  } catch (error) {
    logger.error('Update billing period error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Abrechnung' });
  }
});

// ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

const DEVICE_PRICES: Record<string, number> = {
  MOSAIC_WALL: 5900,   // 59€/mo
  PHOTO_BOOTH: 6900,   // 69€/mo
  MIRROR_BOOTH: 7900,  // 79€/mo
  KI_BOOTH: 7900,      // 79€/mo
  DRAWBOT: 9900,       // 99€/mo
};

// List subscriptions for a partner
router.get('/:partnerId/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;
    if (!await requirePartnerAccess(req, res, partnerId)) return;

    const subscriptions = await prisma.partnerSubscription.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      include: { devices: true },
    });

    res.json({ subscriptions });
  } catch (error) {
    logger.error('List subscriptions error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Abos' });
  }
});

// Create subscription (Admin only)
router.post('/:partnerId/subscriptions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { partnerId } = req.params;
    const { plan, interval, pricePerMonthCents, notes } = req.body;

    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const sub = await prisma.partnerSubscription.create({
      data: {
        partnerId,
        plan: plan || 'BASE',
        interval: interval || 'MONTHLY',
        pricePerMonthCents: pricePerMonthCents ?? 4900, // Default 49€
        discountPct: interval === 'YEARLY' ? 20 : 0,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        notes,
      },
      include: { devices: true },
    });

    res.status(201).json({ subscription: sub });
  } catch (error) {
    logger.error('Create subscription error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen des Abos' });
  }
});

// Update subscription status
router.put('/:partnerId/subscriptions/:subId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { subId } = req.params;
    const { status, plan, interval, pricePerMonthCents, notes } = req.body;

    const data: any = {};
    if (status) {
      data.status = status;
      if (status === 'CANCELLED') data.cancelledAt = new Date();
    }
    if (plan) data.plan = plan;
    if (interval) {
      data.interval = interval;
      data.discountPct = interval === 'YEARLY' ? 20 : 0;
    }
    if (pricePerMonthCents !== undefined) data.pricePerMonthCents = pricePerMonthCents;
    if (notes !== undefined) data.notes = notes;

    const sub = await prisma.partnerSubscription.update({
      where: { id: subId },
      data,
      include: { devices: true },
    });

    res.json({ subscription: sub });
  } catch (error) {
    logger.error('Update subscription error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// Add device license to subscription
router.post('/:partnerId/subscriptions/:subId/devices', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    const { subId } = req.params;
    const { deviceType, hardwareId } = req.body;

    const priceCents = DEVICE_PRICES[deviceType] || 5900;

    const license = await prisma.partnerDeviceLicense.create({
      data: {
        subscriptionId: subId,
        deviceType,
        hardwareId: hardwareId || null,
        pricePerMonthCents: priceCents,
      },
    });

    res.status(201).json({ license });
  } catch (error) {
    logger.error('Add device license error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Hinzufügen der Gerätelizenz' });
  }
});

// Remove device license
router.delete('/:partnerId/subscriptions/:subId/devices/:licenseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!requireAdmin(req, res)) return;
    await prisma.partnerDeviceLicense.update({
      where: { id: req.params.licenseId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Remove device license error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Entfernen' });
  }
});

export default router;
