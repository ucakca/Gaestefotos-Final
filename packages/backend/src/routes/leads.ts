import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { hasEventManageAccess, hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ─── CREATE LEAD (Guest action — e.g. face search, gallery visit, QR scan) ──

router.post('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, name, email, phone, source, consentGiven, metadata } = req.body;

    if (!eventId || !source) {
      return res.status(400).json({ error: 'eventId und source sind erforderlich' });
    }

    if (!email && !phone && !name) {
      return res.status(400).json({ error: 'Mindestens Name, E-Mail oder Telefon erforderlich' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, partnerId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || !event.isActive) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Deduplicate by email within same event
    if (email) {
      const existing = await prisma.lead.findFirst({
        where: { eventId, email },
      });
      if (existing) {
        // Update existing lead with new data
        const updated = await prisma.lead.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            phone: phone || existing.phone,
            consentGiven: consentGiven ?? existing.consentGiven,
            metadata: metadata ? { ...(existing.metadata as any || {}), ...metadata } : existing.metadata,
          },
        });
        return res.json({ lead: updated, deduplicated: true });
      }
    }

    const lead = await prisma.lead.create({
      data: {
        eventId,
        partnerId: event.partnerId,
        name,
        email,
        phone,
        source,
        consentGiven: consentGiven ?? false,
        metadata,
      },
    });

    res.status(201).json({ lead });
  } catch (error) {
    logger.error('Create lead error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Erstellen des Leads' });
  }
});

// ─── LIST LEADS FOR EVENT (Host/Admin) ──────────────────────────────────────

router.get('/event/:eventId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const { source, from, to, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { eventId };
    if (source) where.source = source;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    logger.error('List leads error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Leads' });
  }
});

// ─── LEAD STATS FOR EVENT ───────────────────────────────────────────────────

router.get('/event/:eventId/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const [total, bySource, withEmail, withConsent] = await Promise.all([
      prisma.lead.count({ where: { eventId } }),
      prisma.lead.groupBy({ by: ['source'], where: { eventId }, _count: true }),
      prisma.lead.count({ where: { eventId, email: { not: null } } }),
      prisma.lead.count({ where: { eventId, consentGiven: true } }),
    ]);

    res.json({
      stats: {
        total,
        withEmail,
        withConsent,
        bySource: bySource.reduce((acc, s) => ({ ...acc, [s.source]: s._count }), {}),
      },
    });
  } catch (error) {
    logger.error('Lead stats error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// ─── EXPORT LEADS AS CSV ────────────────────────────────────────────────────

router.get('/event/:eventId/export', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const leads = await prisma.lead.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    // Mark as exported
    await prisma.lead.updateMany({
      where: { eventId, exportedAt: null },
      data: { exportedAt: new Date() },
    });

    // CSV format
    const header = 'Name,Email,Telefon,Quelle,Einwilligung,Datum\n';
    const rows = leads.map(l =>
      `"${l.name || ''}","${l.email || ''}","${l.phone || ''}","${l.source}","${l.consentGiven ? 'Ja' : 'Nein'}","${l.createdAt.toISOString()}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${eventId}-${Date.now()}.csv"`);
    res.send('\uFEFF' + header + rows); // BOM for Excel UTF-8
  } catch (error) {
    logger.error('Export leads error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Exportieren' });
  }
});

// ─── PARTNER LEADS (all leads across partner events) ────────────────────────

router.get('/partner/:partnerId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { partnerId } = req.params;

    // Check partner access
    if (req.userRole !== 'ADMIN') {
      const membership = await prisma.partnerMember.findUnique({
        where: { partnerId_userId: { partnerId, userId: req.userId! } },
      });
      if (!membership) return res.status(403).json({ error: 'Kein Zugriff' });
    }

    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: { event: { select: { title: true, slug: true } } },
      }),
      prisma.lead.count({ where: { partnerId } }),
    ]);

    res.json({ leads, total });
  } catch (error) {
    logger.error('Partner leads error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;
