import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { randomString, generateEventSlug, DEFAULT_EVENT_FEATURES_CONFIG, normalizeEventFeaturesConfig } from '@gaestefotos/shared';

const router = Router();

async function getUniqueEventSlug(preferredSlug: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? preferredSlug : `${preferredSlug}-${randomString(4).toLowerCase()}`;
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `event-${randomString(12).toLowerCase()}`;
}

const listSchema = z.object({
  q: z.string().optional(),
  hostId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
  }

  const { q, hostId, limit, offset } = parsed.data;
  const where: any = {
    deletedAt: null,
  };

  const qTrimmed = typeof q === 'string' ? q.trim() : '';
  if (qTrimmed) {
    where.OR = [
      { title: { contains: qTrimmed, mode: 'insensitive' } },
      { slug: { contains: qTrimmed, mode: 'insensitive' } },
    ];
  }

  const hostIdTrimmed = typeof hostId === 'string' ? hostId.trim() : '';
  if (hostIdTrimmed) where.hostId = hostIdTrimmed;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        hostId: true,
        title: true,
        slug: true,
        dateTime: true,
        createdAt: true,
        _count: {
          select: {
            photos: true,
            guests: true,
            videos: true,
          },
        },
      },
    }),
  ]);

  return res.json({ ok: true, total, events });
});

router.patch('/:id/status', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be boolean' });
    }

    const event = await prisma.event.update({
      where: { id },
      data: { isActive },
      select: { id: true, title: true, isActive: true },
    });

    return res.json({ ok: true, event });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      await prisma.event.delete({ where: { id } });
    } else {
      await prisma.event.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        hostId: true,
        title: true,
        slug: true,
        dateTime: true,
        locationName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        workflowId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        host: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
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

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    return res.json({ ok: true, event });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: Event-Details bearbeiten ─────────────────────────────────────────

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten').optional(),
  dateTime: z.string().nullable().optional(),
  locationName: z.string().max(200).nullable().optional(),
  locationGoogleMapsLink: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  password: z.string().max(100).nullable().optional(),
  guestbookHostMessage: z.string().max(2000).nullable().optional(),
  wifiName: z.string().max(100).nullable().optional(),
  wifiPassword: z.string().max(100).nullable().optional(),
  profileDescription: z.string().max(2000).nullable().optional(),
  workflowId: z.string().uuid().nullable().optional(),
});

router.put('/:id', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Daten', details: parsed.error.flatten() });
    }

    const updates: any = { ...parsed.data };

    // Convert dateTime string to Date object
    if (updates.dateTime !== undefined) {
      updates.dateTime = updates.dateTime ? new Date(updates.dateTime) : null;
    }

    // Check slug uniqueness if changed
    if (updates.slug) {
      const existing = await prisma.event.findFirst({
        where: { slug: updates.slug, id: { not: id } },
      });
      if (existing) {
        return res.status(409).json({ ok: false, error: 'Dieser Slug wird bereits verwendet' });
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        title: true,
        slug: true,
        dateTime: true,
        locationName: true,
        locationGoogleMapsLink: true,
        isActive: true,
        password: true,
        guestbookHostMessage: true,
        wifiName: true,
        wifiPassword: true,
        profileDescription: true,
        updatedAt: true,
      },
    });

    return res.json({ ok: true, event });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ ok: false, error: 'Event nicht gefunden' });
    }
    return res.status(500).json({ ok: false, error: 'Fehler beim Aktualisieren' });
  }
});

// ─── Admin: verfügbare Pakete laden ──────────────────────────────────────────

router.get('/:id/available-packages', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const packages = await prisma.packageDefinition.findMany({
      where: { isActive: true, type: 'BASE' },
      orderBy: { displayOrder: 'asc' },
    });

    const serialized = packages.map((p: any) => ({
      ...p,
      storageLimitBytes: p.storageLimitBytes?.toString() || null,
    }));

    return res.json({ ok: true, packages: serialized });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: aktuelles Paket eines Events laden ──────────────────────────────

router.get('/:id/package', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const entitlement = await prisma.eventEntitlement.findFirst({
      where: { eventId: id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    const pkg = entitlement?.wcSku
      ? await prisma.packageDefinition.findFirst({
          where: { sku: entitlement.wcSku, isActive: true },
          select: { sku: true, name: true, resultingTier: true },
        })
      : null;

    return res.json({
      ok: true,
      currentSku: pkg?.sku || null,
      currentName: pkg?.name || 'Free',
      currentTier: pkg?.resultingTier || 'FREE',
      entitlementId: entitlement?.id || null,
      source: entitlement?.source || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Admin: Paket eines Events ändern ────────────────────────────────────────

router.put('/:id/change-package', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sku } = req.body;

    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ error: 'SKU ist erforderlich' });
    }

    // Verify target package
    const targetPkg = await prisma.packageDefinition.findFirst({
      where: { sku, isActive: true, type: 'BASE' },
    });
    if (!targetPkg) {
      return res.status(404).json({ error: 'Paket nicht gefunden' });
    }

    // Get event host for wpUserId
    const event = await prisma.event.findUnique({
      where: { id },
      select: { host: { select: { wordpressUserId: true } } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const wpUserId = event.host?.wordpressUserId ?? 0;

    // Find existing entitlement
    const existing = await prisma.eventEntitlement.findFirst({
      where: { eventId: id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      await prisma.eventEntitlement.update({
        where: { id: existing.id },
        data: {
          wcSku: sku,
          storageLimitBytes: targetPkg.storageLimitBytes,
          source: `admin_switch_from_${existing.wcSku || 'free'}`,
        },
      });
    } else {
      await prisma.eventEntitlement.create({
        data: {
          eventId: id,
          wpUserId,
          status: 'ACTIVE',
          source: 'admin_switch_from_free',
          wcSku: sku,
          storageLimitBytes: targetPkg.storageLimitBytes,
        },
      });
    }

    return res.json({
      ok: true,
      newSku: sku,
      newName: targetPkg.name,
      newTier: targetPkg.resultingTier,
      previousSku: existing?.wcSku || 'free',
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Fehler beim Paketwechsel' });
  }
});

// ─── Admin: Event-Addons verwalten ──────────────────────────────────────────

router.get('/:id/addons', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get all addon entitlements for this event
    const addonEntitlements = await prisma.eventEntitlement.findMany({
      where: {
        eventId: id,
        status: 'ACTIVE',
        source: { startsWith: 'addon' },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get all available addon package definitions
    const addonPackages = await prisma.packageDefinition.findMany({
      where: { isActive: true, type: 'ADDON' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        priceEurCents: true,
        allowMosaicWall: true,
        allowMosaicPrint: true,
        allowMosaicExport: true,
        allowFaceSearch: true,
        allowLiveWall: true,
        allowVideoUpload: true,
        allowStories: true,
      },
    });

    // Map: which addons are active for this event
    const activeSkus = new Set(addonEntitlements.map((e) => e.wcSku).filter(Boolean));

    const addons = addonPackages.map((pkg) => ({
      ...pkg,
      isActive: activeSkus.has(pkg.sku),
      entitlementId: addonEntitlements.find((e) => e.wcSku === pkg.sku)?.id || null,
    }));

    return res.json({ ok: true, addons });
  } catch (error: any) {
    return res.status(500).json({ error: 'Fehler beim Laden der Addons' });
  }
});

router.post('/:id/addons', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { sku } = req.body;

    if (!sku || typeof sku !== 'string') {
      return res.status(400).json({ error: 'SKU ist erforderlich' });
    }

    // Verify addon package exists
    const addonPkg = await prisma.packageDefinition.findFirst({
      where: { sku, isActive: true, type: 'ADDON' },
    });
    if (!addonPkg) {
      return res.status(404).json({ error: 'Addon-Paket nicht gefunden' });
    }

    // Check if already active
    const existing = await prisma.eventEntitlement.findFirst({
      where: { eventId: id, wcSku: sku, status: 'ACTIVE', source: { startsWith: 'addon' } },
    });
    if (existing) {
      return res.status(409).json({ error: 'Addon ist bereits aktiv' });
    }

    // Get event host for wpUserId
    const event = await prisma.event.findUnique({
      where: { id },
      select: { host: { select: { wordpressUserId: true } } },
    });
    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const wpUserId = event.host?.wordpressUserId ?? 0;

    const entitlement = await prisma.eventEntitlement.create({
      data: {
        eventId: id,
        wpUserId,
        status: 'ACTIVE',
        source: `addon_admin_${req.userId}`,
        wcSku: sku,
      },
    });

    return res.json({
      ok: true,
      entitlement: { id: entitlement.id, sku, name: addonPkg.name },
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Fehler beim Hinzufügen des Addons' });
  }
});

router.delete('/:id/addons/:entitlementId', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id, entitlementId } = req.params;

    const entitlement = await prisma.eventEntitlement.findFirst({
      where: { id: entitlementId, eventId: id, source: { startsWith: 'addon' } },
    });
    if (!entitlement) {
      return res.status(404).json({ error: 'Addon-Entitlement nicht gefunden' });
    }

    await prisma.eventEntitlement.update({
      where: { id: entitlementId },
      data: { status: 'CANCELLED' },
    });

    return res.json({ ok: true });
  } catch (error: any) {
    return res.status(500).json({ error: 'Fehler beim Entfernen des Addons' });
  }
});

// ─── Admin: Event für einen Host erstellen ──────────────────────────────────

const createEventForHostSchema = z.object({
  hostId: z.string().uuid('Ungültige Host-ID'),
  title: z.string().min(1, 'Titel ist erforderlich').max(200),
  dateTime: z.string().nullable().optional(),
  locationName: z.string().max(200).nullable().optional(),
  locationGoogleMapsLink: z.string().max(500).nullable().optional(),
  password: z.string().max(100).nullable().optional(),
  packageSku: z.string().optional(), // Optional: Paket direkt zuweisen
  notes: z.string().max(2000).nullable().optional(), // Admin-Notizen
});

router.post('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = createEventForHostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Daten', details: parsed.error.flatten() });
    }

    const { hostId, title, dateTime, locationName, locationGoogleMapsLink, password, packageSku, notes } = parsed.data;

    // Verify host exists
    const host = await prisma.user.findUnique({
      where: { id: hostId },
      select: { id: true, name: true, email: true, role: true, wordpressUserId: true },
    });
    if (!host) {
      return res.status(404).json({ ok: false, error: 'Benutzer nicht gefunden' });
    }

    // Generate slug
    const preferredSlug = generateEventSlug(title);
    const slug = await getUniqueEventSlug(preferredSlug);

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        hostId,
        title,
        slug,
        dateTime: dateTime ? new Date(dateTime) : null,
        locationName: locationName || null,
        locationGoogleMapsLink: locationGoogleMapsLink || null,
        password: hashedPassword || null,
        featuresConfig: normalizeEventFeaturesConfig(DEFAULT_EVENT_FEATURES_CONFIG),
        designConfig: {},
        profileDescription: notes || null,
      },
      include: {
        host: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Assign package if specified
    if (packageSku) {
      const targetPkg = await prisma.packageDefinition.findFirst({
        where: { sku: packageSku, isActive: true, type: 'BASE' },
      });
      if (targetPkg) {
        await prisma.eventEntitlement.create({
          data: {
            eventId: event.id,
            wpUserId: host.wordpressUserId ?? 0,
            status: 'ACTIVE',
            source: `admin_created_${req.userId}`,
            wcSku: packageSku,
            storageLimitBytes: targetPkg.storageLimitBytes,
          },
        });
      }
    }

    return res.status(201).json({
      ok: true,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        dateTime: event.dateTime,
        host: event.host,
      },
      message: `Event "${title}" wurde für ${host.name || host.email} erstellt.`,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'Fehler beim Erstellen des Events' });
  }
});

// ─── Admin: Workflow einem Event zuweisen ────────────────────────────────────

router.put('/:id/workflow', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { workflowId } = req.body;

    // Validate workflow exists if provided
    if (workflowId) {
      const workflow = await prisma.boothWorkflow.findUnique({ where: { id: workflowId } });
      if (!workflow) {
        return res.status(404).json({ ok: false, error: 'Workflow nicht gefunden' });
      }
    }

    const event = await prisma.event.update({
      where: { id },
      data: { workflowId: workflowId || null },
      select: {
        id: true,
        title: true,
        workflowId: true,
        workflow: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return res.json({
      ok: true,
      event,
      message: workflowId
        ? `Workflow "${event.workflow?.name}" wurde dem Event zugewiesen.`
        : 'Workflow wurde vom Event entfernt.',
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'Fehler beim Zuweisen des Workflows' });
  }
});

export default router;
