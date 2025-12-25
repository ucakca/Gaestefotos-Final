import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, issueEventAccessCookie, optionalAuthMiddleware, hasEventAccess } from '../middleware/auth';
import { randomString, slugify } from '@gaestefotos/shared';
import { logger } from '../utils/logger';
import { getActiveEventEntitlement, getEffectiveEventPackage, getEventUsageBreakdown, bigintToString } from '../services/packageLimits';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { storageService } from '../services/storage';

const router = Router();

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  dateTime: z.string().datetime().optional(),
  locationName: z.string().optional(),
  locationGoogleMapsLink: z.string().optional(),
  designConfig: z.record(z.any()).optional(),
  featuresConfig: z.record(z.any()).optional(),
  categories: z
    .array(
      z.object({
        name: z.string().min(1),
        order: z.number().int().optional(),
        isVisible: z.boolean().optional(),
        uploadLocked: z.boolean().optional(),
        uploadLockUntil: z.string().datetime().nullable().optional(),
        dateTime: z.string().datetime().nullable().optional(),
        locationName: z.string().nullable().optional(),
      })
    )
    .optional(),
});

const uploadIssuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  sinceHours: z.coerce.number().int().min(1).max(24 * 365).optional().default(72),
});

async function getUniqueEventSlug(preferredSlug: string): Promise<string> {
  // Avoid tight infinite loops, but collisions should be extremely unlikely.
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? preferredSlug : `${preferredSlug}-${randomString(4).toLowerCase()}`;
    const existingEvent = await prisma.event.findUnique({ where: { slug: candidate } });
    if (!existingEvent) return candidate;
  }
  // Last resort
  return `event-${randomString(12).toLowerCase()}`;
}

// Get all events (for current user)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        hostId: req.userId,
      },
      include: {
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ events });
  } catch (error) {
    logger.error('Get events error', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleEventStorageUsage(req: AuthRequest, res: Response) {
  try {
    const eventId = req.params.id;

    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!existingEvent || existingEvent.deletedAt || existingEvent.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Storage usage/limits are host/admin only.
    // Guests should not see 401s here (they don't have a JWT); return 404 instead.
    if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const [entitlement, usage] = await Promise.all([
      getActiveEventEntitlement(eventId),
      getEventUsageBreakdown(eventId),
    ]);

    const pkg = entitlement?.wcSku
      ? await prisma.packageDefinition.findFirst({
          where: { sku: entitlement.wcSku, isActive: true },
          select: { sku: true, name: true, resultingTier: true, type: true },
        })
      : null;

    return res.json({
      ok: true,
      eventId,
      enforceStorageLimits: process.env.ENFORCE_STORAGE_LIMITS === 'true',
      entitlement: entitlement
        ? {
            ...entitlement,
            storageLimitBytes: bigintToString((entitlement as any).storageLimitBytes as any),
            package: pkg,
          }
        : null,
      usage: {
        photosBytes: usage.photosBytes.toString(),
        videosBytes: usage.videosBytes.toString(),
        guestbookBytes: usage.guestbookBytes.toString(),
        guestbookPendingBytes: usage.guestbookPendingBytes.toString(),
        designBytes: usage.designBytes.toString(),
        totalBytes: usage.totalBytes.toString(),
      },
    });
  } catch (error) {
    logger.error('Get storage limits error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

router.get(
  '/:eventId/download-zip',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          slug: true,
          hostId: true,
          featuresConfig: true,
          deletedAt: true,
          isActive: true,
        },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      const isGuestWithAccess = hasEventAccess(req, eventId);

      if (!isHost && !isAdmin && !isGuestWithAccess) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
        return res.status(404).json({ error: 'Speicherperiode beendet' });
      }

      const featuresConfig = (event.featuresConfig || {}) as any;
      if (!isHost && !isAdmin && featuresConfig?.allowDownloads === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const photos = await prisma.photo.findMany({
        where: {
          eventId,
          deletedAt: null,
          status: (isHost || isAdmin) ? undefined : 'APPROVED',
        },
        select: { id: true, storagePath: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      if (!photos.length) {
        return res.status(404).json({ error: 'Keine Fotos gefunden' });
      }

      const filename = `${event.slug || 'event'}-photos.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Cache-Control', 'private, max-age=0');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        logger.error('ZIP archive error', { message: (err as any)?.message || String(err), eventId });
        try {
          res.status(500).end();
        } catch {
          // noop
        }
      });

      archive.pipe(res);

      for (const photo of photos) {
        if (!photo.storagePath) continue;
        const buf = await storageService.getFile(photo.storagePath);
        const ext = (photo.storagePath.split('.').pop() || 'jpg').toLowerCase();
        archive.append(buf, { name: `photo-${photo.id}.${ext}` });
      }

      await archive.finalize();
    } catch (error) {
      logger.error('Download zip error', { message: (error as any)?.message || String(error) });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get event by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event not found' });
    }

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);
    res.json({ event: { ...event, storageEndsAt, isStorageLocked, effectivePackage } });
  } catch (error) {
    logger.error('Get event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by slug (public)
router.get('/slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { slug: req.params.slug },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);

    // Issue access cookie for guests so follow-up public endpoints work in a fresh browser.
    issueEventAccessCookie(res, event.id);
    res.json({ event: { ...event, storageEndsAt, isStorageLocked, effectivePackage } });
  } catch (error) {
    logger.error('Get event by slug error', { message: (error as any)?.message || String(error), slug: req.params.slug });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const data = createEventSchema.parse(req.body);

      // Free-event limit enforcement (default: 3) for hosts.
      // An event is considered "free" if it has no ACTIVE entitlement for the owner.
      const freeLimit = Number(process.env.FREE_EVENT_LIMIT || 3);
      if (Number.isFinite(freeLimit) && freeLimit > 0) {
        const host = await prisma.user.findUnique({
          where: { id: req.userId! },
          select: { wordpressUserId: true },
        });

        const freeEventCount = await prisma.event.count({
          where: {
            hostId: req.userId!,
            deletedAt: null,
            isActive: true,
            ...(host?.wordpressUserId
              ? {
                  NOT: {
                    entitlements: {
                      some: {
                        status: 'ACTIVE',
                        wpUserId: host.wordpressUserId,
                      },
                    },
                  },
                }
              : {
                  NOT: {
                    entitlements: {
                      some: {
                        status: 'ACTIVE',
                      },
                    },
                  },
                }),
          },
        });

        if (freeEventCount >= freeLimit) {
          return res.status(403).json({
            error:
              'Du hast das Limit von 3 kostenlosen Events erreicht. Bitte upgrade dein Paket, um weitere Events zu erstellen.',
            code: 'FREE_EVENT_LIMIT_REACHED',
            limit: freeLimit,
            current: freeEventCount,
          });
        }
      }

      // Generate slug if not provided
      let preferredSlug = data.slug || slugify(data.title);
      if (!preferredSlug || preferredSlug.length < 3) {
        preferredSlug = `event-${randomString(8).toLowerCase()}`;
      }
      const slug = await getUniqueEventSlug(preferredSlug);

      const categoriesCreate = (data.categories || [])
        .filter((c) => (c.name || '').trim().length > 0)
        .map((c, idx) => ({
          name: c.name,
          order: typeof c.order === 'number' ? c.order : idx,
          isVisible: c.isVisible ?? true,
          uploadLocked: c.uploadLocked ?? false,
          uploadLockUntil: c.uploadLockUntil ? new Date(c.uploadLockUntil) : null,
          dateTime: c.dateTime ? new Date(c.dateTime) : null,
          locationName: c.locationName ?? null,
        }));

      const event = await prisma.event.create({
        data: {
          hostId: req.userId!,
          title: data.title,
          slug,
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          locationName: data.locationName,
          locationGoogleMapsLink: data.locationGoogleMapsLink,
          designConfig: data.designConfig || {},
          featuresConfig: data.featuresConfig || {
            showGuestlist: true,
            mysteryMode: false,
            allowUploads: true,
            moderationRequired: false,
            allowDownloads: true,
          },
          ...(categoriesCreate.length > 0
            ? {
                categories: {
                  create: categoriesCreate,
                },
              }
            : {}),
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Create event error', { message: (error as any)?.message || String(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get(
  '/:id/storage-limits',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event not found' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
      const effectivePackage = await getEffectiveEventPackage(eventId);
      res.json({ storageEndsAt, isStorageLocked, effectivePackage });
    } catch (error) {
      logger.error('Get storage limits error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get(
  '/:id/upload-issues',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const { limit, sinceHours } = uploadIssuesQuerySchema.parse(req.query);

      const existingEvent = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, deletedAt: true, isActive: true },
      });

      if (!existingEvent || existingEvent.deletedAt || existingEvent.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
      const now = new Date();

      const [
        tempDeletedPhotos,
        tempDeletedVideos,
        scanErrorPhotos,
        scanPendingPhotos,
        scanErrorVideos,
        scanPendingVideos,
        guestbookExpiredUploads,
      ] =
        await Promise.all([
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: { not: null },
              status: 'DELETED',
              storagePath: '',
              url: '',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, deletedAt: true, uploadedBy: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.video.findMany({
            where: {
              eventId,
              deletedAt: { not: null },
              status: 'DELETED',
              storagePath: '',
              url: '',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, deletedAt: true, uploadedBy: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              exifData: { path: ['scanStatus'], equals: 'ERROR' },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, exifData: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          prisma.photo.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              exifData: { path: ['scanStatus'], equals: 'PENDING' },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, exifData: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).video.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              scanStatus: 'ERROR',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, scanError: true, scannedAt: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).video.findMany({
            where: {
              eventId,
              deletedAt: null,
              status: { not: 'DELETED' },
              scanStatus: 'PENDING',
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, uploadedBy: true, scannedAt: true },
            orderBy: { createdAt: 'desc' },
            take: limit,
          }),
          (prisma as any).guestbookPhotoUpload.findMany({
            where: {
              eventId,
              expiresAt: { lt: now },
              claimedAt: { not: null },
              createdAt: { gte: since },
            },
            select: { id: true, createdAt: true, claimedAt: true, expiresAt: true, storagePath: true, sizeBytes: true },
            orderBy: { expiresAt: 'desc' },
            take: limit,
          }),
        ]);

      res.json({
        ok: true,
        eventId,
        since: since.toISOString(),
        counts: {
          tempDeletedPhotos: tempDeletedPhotos.length,
          tempDeletedVideos: tempDeletedVideos.length,
          scanErrorPhotos: scanErrorPhotos.length,
          scanPendingPhotos: scanPendingPhotos.length,
          scanErrorVideos: scanErrorVideos.length,
          scanPendingVideos: scanPendingVideos.length,
          guestbookExpiredUploads: guestbookExpiredUploads.length,
        },
        items: {
          tempDeletedPhotos,
          tempDeletedVideos,
          scanErrorPhotos: scanErrorPhotos.map((p) => ({
            id: p.id,
            createdAt: p.createdAt,
            uploadedBy: p.uploadedBy,
            scanError: (p.exifData as any)?.scanError,
            scanUpdatedAt: (p.exifData as any)?.scanUpdatedAt,
          })),
          scanPendingPhotos: scanPendingPhotos.map((p) => ({
            id: p.id,
            createdAt: p.createdAt,
            uploadedBy: p.uploadedBy,
            scanUpdatedAt: (p.exifData as any)?.scanUpdatedAt,
          })),
          scanErrorVideos: scanErrorVideos.map((v: any) => ({
            id: v.id,
            createdAt: v.createdAt,
            uploadedBy: v.uploadedBy,
            scanError: v.scanError,
            scannedAt: v.scannedAt,
          })),
          scanPendingVideos: scanPendingVideos.map((v: any) => ({
            id: v.id,
            createdAt: v.createdAt,
            uploadedBy: v.uploadedBy,
            scannedAt: v.scannedAt,
          })),
          guestbookExpiredUploads,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Get upload issues error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

function getInviteJwtSecret(): string | null {
  return process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET || null;
}

function getInviteTtlSeconds(): number {
  return Number(process.env.INVITE_TOKEN_TTL_SECONDS || 60 * 60); // 1h
}

function getInviteTokenFromRequest(req: any): string | null {
  const inviteFromQuery = typeof req.query?.invite === 'string' ? req.query.invite : null;
  const inviteFromHeader = typeof req.headers['x-invite-token'] === 'string' ? (req.headers['x-invite-token'] as string) : null;
  return inviteFromQuery || inviteFromHeader || null;
}

router.post('/:id/access', async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const inviteToken = getInviteTokenFromRequest(req);

    if (!inviteToken) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const secret = getInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(inviteToken, secret);
    } catch {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const t = decoded?.type;
    const okType = t === 'invite' || t === 'event_invite';
    if (!okType || decoded?.eventId !== eventId) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Ensure event exists and is active (avoid issuing cookies for deleted events)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    issueEventAccessCookie(res, eventId);
    return res.json({ ok: true });
  } catch (error) {
    logger.error('Issue event access cookie error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/invite-token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, title: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const secret = getInviteJwtSecret();
    if (!secret) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    const inviteToken = jwt.sign(
      { type: 'event_invite', eventId },
      secret,
      { expiresIn: getInviteTtlSeconds() }
    );

    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || '';
    const shareUrl = event.slug
      ? `${frontendBaseUrl}/e2/${event.slug}?invite=${encodeURIComponent(inviteToken)}`
      : null;

    return res.json({ ok: true, eventId, inviteToken, shareUrl });
  } catch (error) {
    logger.error('Mint event invite token error', {
      message: (error as any)?.message || String(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Backwards-compatible alias used by some frontend pages
router.get('/:id/usage', optionalAuthMiddleware, handleEventStorageUsage);

// Update event
router.put(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = createEventSchema.partial().parse(req.body);

      // Categories are managed via dedicated category endpoints, not via event update.
      const { categories: _categories, ...eventData } = data as any;

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...eventData,
          dateTime: eventData.dateTime ? new Date(eventData.dateTime) : undefined,
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Update event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete event
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.event.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Event deleted' });
    } catch (error) {
      logger.error('Delete event error', { message: (error as any)?.message || String(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

