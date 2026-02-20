import { Router, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import archiver from 'archiver';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, issueEventAccessCookie, optionalAuthMiddleware, hasEventAccess, isPrivilegedRole, hasEventManageAccess, hasEventPermission } from '../middleware/auth';
import { randomString, generateEventSlug, DEFAULT_EVENT_FEATURES_CONFIG, normalizeEventFeaturesConfig } from '@gaestefotos/shared';

import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { auditLog, AuditType } from '../services/auditLogger';
import { DesignConfig, FeaturesConfig } from '../schemas/jsonFields';
import { getActiveEventEntitlement, getEffectiveEventPackage, getEventUsageBreakdown, bigintToString } from '../services/packageLimits';
import { getEventFeatures } from '../services/featureGate';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { storageService } from '../services/storage';
import { emailService } from '../services/email';
import { requireHostOrAdmin, requireEventEditAccess } from './eventHelpers';

const router = Router();


const uploadIssuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  sinceHours: z.coerce.number().int().min(1).max(24 * 365).optional().default(72),
});

const trafficSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

async function trackEventTrafficBySource(eventId: string, source: string) {
  if (!eventId || !source) return;
  try {
    await prisma.eventTrafficStat.upsert({
      where: {
        eventId_source: {
          eventId,
          source,
        },
      },
      create: {
        eventId,
        source,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    });
  } catch (error) {
    logger.error('trackEventTrafficBySource failed', {
      message: getErrorMessage(error),
      eventId,
      source,
    });
  }
}

async function getUniqueEventSlug(preferredSlug: string): Promise<string> {
  // Avoid tight infinite loops, but collisions should be extremely unlikely.
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? preferredSlug : `${preferredSlug}-${randomString(4).toLowerCase()}`;
    const existing = await prisma.event.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  // Last resort
  return `event-${randomString(12).toLowerCase()}`;
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
        OR: [
          { hostId: req.userId },
          { members: { some: { userId: req.userId } } },
        ],
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

    // Map _count to frontend-friendly fields and add viewCount
    const eventsWithCounts = events.map(event => ({
      ...event,
      photoCount: event._count?.photos || 0,
      guestCount: event._count?.guests || 0,
      viewCount: (event as any).visitCount || 0,
      pendingCount: 0, // Will be computed below
    }));

    // Get pending counts for all events
    const pendingCounts = await prisma.photo.groupBy({
      by: ['eventId'],
      where: {
        eventId: { in: events.map(e => e.id) },
        status: 'PENDING',
      },
      _count: true,
    });

    const pendingMap = new Map(pendingCounts.map(p => [p.eventId, p._count]));
    eventsWithCounts.forEach(event => {
      event.pendingCount = pendingMap.get(event.id) || 0;
    });

    // Enrich with package tier info
    const eventIds = events.map(e => e.id);
    const entitlements = await prisma.eventEntitlement.findMany({
      where: { eventId: { in: eventIds }, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { eventId: true, wcSku: true },
      distinct: ['eventId'],
    });

    const skus = [...new Set(entitlements.map(e => e.wcSku).filter(Boolean))] as string[];
    const pkgDefs = skus.length > 0
      ? await prisma.packageDefinition.findMany({
          where: { sku: { in: skus }, isActive: true },
          select: { sku: true, name: true, resultingTier: true },
        })
      : [];

    const skuToName = new Map(pkgDefs.map(p => [p.sku, p.name]));
    const entMap = new Map(entitlements.map(e => [e.eventId, e.wcSku]));

    const enriched = eventsWithCounts.map(event => ({
      ...event,
      packageType: skuToName.get(entMap.get(event.id) || '') || 'Free',
    }));

    res.json({ events: enriched });
  } catch (error) {
    logger.error('Get events error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// QR routes (config, export, logo, preview, save-design) are in eventQr.ts

// Design cover image upload
// Design routes extracted to eventDesign.ts

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
    if (!(await hasEventManageAccess(req, eventId))) {
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
      message: getErrorMessage(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}


// Check event limit before creating (early warning)
// IMPORTANT: Must be defined BEFORE /:id to avoid Express matching 'check-limit' as :id
router.get('/check-limit', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const freeLimit = Number(process.env.FREE_EVENT_LIMIT || 3);
    if (!Number.isFinite(freeLimit) || freeLimit <= 0) {
      return res.json({ limitReached: false, limit: 0, current: 0 });
    }

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

    res.json({
      limitReached: freeEventCount >= freeLimit,
      limit: freeLimit,
      current: freeEventCount,
    });
  } catch (error) {
    logger.error('Check event limit error', { message: getErrorMessage(error) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
        theme: true,
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

    if (!(await hasEventManageAccess(req, event.id))) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);
    const packageInfo = await getEventFeatures(event.id);
    res.json({ event: { ...event, storageEndsAt, isStorageLocked, effectivePackage, packageInfo } });
  } catch (error) {
    logger.error('Get event error', { message: getErrorMessage(error), eventId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
        theme: true,
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

    const rawSource = typeof req.query.source === 'string' ? req.query.source : '';
    const parsedSource = trafficSourceSchema.safeParse(rawSource);
    if (parsedSource.success) {
      await trackEventTrafficBySource(event.id, parsedSource.data.toLowerCase());
    }

    // Increment visit count (fire and forget)
    prisma.event.update({
      where: { id: event.id },
      data: { visitCount: { increment: 1 } },
    }).catch(() => {});

    const storageEndsAt = await getEventStorageEndsAt(event.id);
    const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
    const effectivePackage = await getEffectiveEventPackage(event.id);
    const packageInfo = await getEventFeatures(event.id);

    // Issue access cookie for guests so follow-up public endpoints work in a fresh browser.
    issueEventAccessCookie(res, event.id);
    res.json({ 
      event: { 
        ...event, 
        storageEndsAt, 
        isStorageLocked, 
        effectivePackage,
        packageInfo,
        visitCount: (event as any).visitCount || 0,
      } 
    });
  } catch (error) {
    logger.error('Get event by slug error', { message: getErrorMessage(error), slug: req.params.slug });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// WiFi info for guests (public endpoint)
router.get('/:id/wifi', async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      select: { 
        id: true, 
        wifiName: true, 
        wifiPassword: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Only return WiFi info if configured
    if (!event.wifiName) {
      return res.json({ wifi: null });
    }

    res.json({ 
      wifi: {
        name: event.wifiName,
        password: event.wifiPassword || null,
      }
    });
  } catch (error) {
    logger.error('Get WiFi info error', { message: getErrorMessage(error), eventId: req.params.id });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/traffic', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, eventId))) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const stats = await prisma.eventTrafficStat.findMany({
      where: { eventId },
      select: { source: true, count: true, firstSeenAt: true, lastSeenAt: true },
      orderBy: { count: 'desc' },
    });

    return res.json({ ok: true, stats });
  } catch (error) {
    logger.error('Get event traffic stats error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const wizardUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

router.post(
  '/',
  authMiddleware,
  wizardUpload.fields([{ name: 'coverImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]),
  async (req: AuthRequest, res: Response) => {
    try {
      // Parse JSON fields from FormData
      const bodyData = { ...req.body };
      if (bodyData.albums) bodyData.albums = JSON.parse(bodyData.albums);
      if (bodyData.challenges) bodyData.challenges = JSON.parse(bodyData.challenges);
      if (bodyData.guestbook) bodyData.guestbook = JSON.parse(bodyData.guestbook);
      if (bodyData.coHostEmails) bodyData.coHostEmails = JSON.parse(bodyData.coHostEmails);
      if (bodyData.categories) bodyData.categories = JSON.parse(bodyData.categories);
      if (bodyData.featuresConfig) bodyData.featuresConfig = JSON.parse(bodyData.featuresConfig);
      if (bodyData.designConfig) bodyData.designConfig = JSON.parse(bodyData.designConfig);
      if (bodyData.schedule) bodyData.schedule = JSON.parse(bodyData.schedule);

      const data = bodyData as any; // Schema validation temporarily disabled

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

      // Generate slug from title with 4-char hash (e.g. "hochzeit-anna-max-x7jt")
      let preferredSlug = data.slug || generateEventSlug(data.title);
      const slug = await getUniqueEventSlug(preferredSlug);

      // Handle password hashing if provided
      const bcrypt = require('bcryptjs');
      let hashedPassword: string | undefined;
      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 12);
      }

      // Handle image uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let coverImageUrl: string | undefined;
      let profileImageUrl: string | undefined;
      let uploadedEventId: string | undefined;

      // Albums from wizard (albums array with {id, label, icon, enabled, hostOnly})
      const wizardAlbums = (bodyData.albums || []) as Array<{id: string; label: string; enabled: boolean; hostOnly: boolean}>;
      let categoriesCreate: Array<any> = wizardAlbums
        .filter((a) => a.enabled && a.label.trim().length > 0)
        .map((a, idx) => ({
          name: a.label,
          order: idx,
          isVisible: true,
          uploadLocked: a.hostOnly,
          uploadLockUntil: null,
          dateTime: null,
          locationName: null,
        }));

      // Fallback to old categories format if no albums
      if (categoriesCreate.length === 0 && data.categories) {
        categoriesCreate = data.categories
          .filter((c: any) => (c.name || '').trim().length > 0)
          .map((c: any, idx: number) => ({
            name: c.name,
            order: typeof c.order === 'number' ? c.order : idx,
            isVisible: c.isVisible ?? true,
            uploadLocked: c.uploadLocked ?? false,
            uploadLockUntil: c.uploadLockUntil ? new Date(c.uploadLockUntil) : null,
            dateTime: c.dateTime ? new Date(c.dateTime) : null,
            locationName: c.locationName ?? null,
          }));
      }

      // Build featuresConfig from wizard
      const wizardFeaturesConfig: any = {};
      if (bodyData.visibilityMode) {
        if (bodyData.visibilityMode === 'mystery') wizardFeaturesConfig.mysteryMode = true;
        if (bodyData.visibilityMode === 'moderated') wizardFeaturesConfig.moderationRequired = true;
      }
      if (bodyData.guestbook?.enabled !== undefined) {
        wizardFeaturesConfig.allowGuestbook = bodyData.guestbook.enabled;
      }

      const finalFeaturesConfig = normalizeEventFeaturesConfig({
        ...DEFAULT_EVENT_FEATURES_CONFIG,
        ...(data.featuresConfig || {}),
        ...wizardFeaturesConfig,
      });

      // Build designConfig with colorScheme
      const finalDesignConfig: any = data.designConfig || {};
      if (data.colorScheme) {
        finalDesignConfig.colorScheme = data.colorScheme;
      }

      const event = await prisma.event.create({
        data: {
          hostId: req.userId!,
          title: data.title,
          slug,
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          locationName: data.locationName,
          locationGoogleMapsLink: data.locationGoogleMapsLink,
          password: hashedPassword,
          designConfig: finalDesignConfig,
          featuresConfig: finalFeaturesConfig,
          guestbookHostMessage: bodyData.guestbook?.message || null,
          schedule: Array.isArray(data.schedule) ? data.schedule : [],
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

      // Upload images if provided
      if (files?.coverImage?.[0]) {
        const file = files.coverImage[0];
        const storagePath = await storageService.uploadFile(event.id, file.originalname, file.buffer, file.mimetype);
        coverImageUrl = `/api/events/${event.id}/design/file/${encodeURIComponent(storagePath)}`;
        await prisma.event.update({
          where: { id: event.id },
          data: {
            designConfig: {
              ...(event.designConfig as any),
              coverImage: coverImageUrl,
              coverImageStoragePath: storagePath,
            },
          },
        });
      }

      if (files?.profileImage?.[0]) {
        const file = files.profileImage[0];
        const storagePath = await storageService.uploadFile(event.id, file.originalname, file.buffer, file.mimetype);
        profileImageUrl = `/api/events/${event.id}/design/file/${encodeURIComponent(storagePath)}`;
        await prisma.event.update({
          where: { id: event.id },
          data: {
            designConfig: {
              ...(event.designConfig as any),
              profileImage: profileImageUrl,
              profileImageStoragePath: storagePath,
            },
          },
        });
      }

      // Create challenges if provided
      const wizardChallenges = (bodyData.challenges || []) as Array<{label: string; icon: string; enabled: boolean}>;
      if (wizardChallenges.length > 0) {
        const challengesToCreate = wizardChallenges
          .filter((c) => c.enabled && c.label.trim().length > 0)
          .map((c, idx) => ({
            eventId: event.id,
            title: c.label,
            order: idx,
            isActive: true,
            isVisible: true,
          }));
        if (challengesToCreate.length > 0) {
          await prisma.challenge.createMany({ data: challengesToCreate });
        }
      }

      // Send co-host invitations if provided
      const coHostEmails = (bodyData.coHostEmails || []) as string[];
      if (coHostEmails.length > 0) {
        // Send co-host invitation emails
        const hostUser = await prisma.user.findUnique({ where: { id: event.hostId } });
        const hostName = hostUser?.name || 'Der Event-Host';
        
        for (const email of coHostEmails) {
          try {
            // Generate invite token
            const inviteToken = jwt.sign(
              { type: 'cohost_invite', eventId: event.id },
              process.env.INVITE_JWT_SECRET || process.env.JWT_SECRET!,
              { expiresIn: 60 * 60 * 24 * 7 } // 7 days
            );
            
            const frontendBaseUrl = process.env.FRONTEND_URL || process.env.PUBLIC_URL || '';
            const inviteUrl = event.slug
              ? `${frontendBaseUrl}/e3/${event.slug}?cohostInvite=${encodeURIComponent(inviteToken)}`
              : '';
            
            if (inviteUrl) {
              await emailService.sendCohostInvite({
                to: email,
                eventTitle: event.title,
                inviteUrl,
                eventSlug: event.slug || '',
                hostName,
              });
              logger.info('Co-host invite email sent', { eventId: event.id, email });
            }
          } catch (emailError: any) {
            logger.error('Failed to send co-host invite email', { 
              error: emailError.message, 
              email, 
              eventId: event.id 
            });
            // Continue with other emails even if one fails
          }
        }
      }

      // Create EventAiConfig inheriting energy defaults from PackageDefinition (non-blocking)
      (async () => {
        try {
          // Find package defaults from entitlement → PackageDefinition
          let pkgDefaults: Record<string, any> = {};
          const entitlement = await prisma.eventEntitlement.findFirst({
            where: { eventId: event.id, status: 'ACTIVE' },
            select: { wcSku: true },
          });
          if (entitlement?.wcSku) {
            const pkg = await prisma.packageDefinition.findUnique({
              where: { sku: entitlement.wcSku },
            });
            if (pkg) {
              pkgDefaults = {
                energyEnabled: pkg.defaultEnergyEnabled,
                energyStartBalance: pkg.defaultEnergyStartBalance,
                energyCooldownSeconds: pkg.defaultEnergyCooldown,
                energyCostLlmGame: pkg.defaultCostLlmGame,
                energyCostImageEffect: pkg.defaultCostImageEffect,
                energyCostStyleTransfer: pkg.defaultCostStyleTransfer,
                energyCostFaceSwap: pkg.defaultCostFaceSwap,
                energyCostGif: pkg.defaultCostGif,
                energyCostVideo: pkg.defaultCostVideo,
                energyCostTradingCard: pkg.defaultCostTradingCard,
              };
            }
          }
          await prisma.eventAiConfig.upsert({
            where: { eventId: event.id },
            create: { eventId: event.id, ...pkgDefaults },
            update: {},
          });
        } catch (err: any) {
          logger.warn('EventAiConfig creation failed', { eventId: event.id, error: err.message });
        }
      })();

      auditLog({ type: AuditType.EVENT_CREATED, message: `Event erstellt: ${event.title}`, eventId: event.id, req });

      // Auto-assign automations based on event settings (non-blocking)
      import('../services/automationAssignment').then(m =>
        m.autoAssignAutomations(event.id, {
          moderationRequired: finalFeaturesConfig?.moderationRequired === true,
          hasDateTime: !!event.dateTime,
        })
      ).catch(() => {});

      res.status(201).json({ event, id: event.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Create event error', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!(await hasEventManageAccess(req, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = req.body as any; // Schema validation temporarily disabled
      const { categories: _categories, ...eventData } = data as any;

      const nextFeaturesConfig =
        eventData.featuresConfig && typeof eventData.featuresConfig === 'object'
          ? normalizeEventFeaturesConfig({
              ...((existingEvent as any)?.featuresConfig || {}),
              ...(eventData.featuresConfig as any),
            })
          : undefined;

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...eventData,
          dateTime: eventData.dateTime ? new Date(eventData.dateTime) : undefined,
          ...(nextFeaturesConfig ? { featuresConfig: nextFeaturesConfig } : {}),
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

      // Sync automations if featuresConfig changed (non-blocking)
      if (nextFeaturesConfig) {
        import('../services/automationAssignment').then(m =>
          m.syncAutomationsOnSettingsChange(
            event.id,
            (existingEvent as any).featuresConfig,
            nextFeaturesConfig,
            !!event.dateTime,
          )
        ).catch(() => {});
      }

      return res.json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Patch event error', { message: getErrorMessage(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Internal server error' });
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

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      const isStorageLocked = storageEndsAt ? Date.now() > storageEndsAt.getTime() : false;
      const effectivePackage = await getEffectiveEventPackage(eventId);
      res.json({ storageEndsAt, isStorageLocked, effectivePackage });
    } catch (error) {
      logger.error('Get storage limits error', { message: getErrorMessage(error), eventId: req.params.id });
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

      if (!(await hasEventManageAccess(req, eventId))) {
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
      logger.error('Get upload issues error', { message: getErrorMessage(error), eventId: req.params.id });
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
      message: getErrorMessage(error),
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

    if (!(await hasEventManageAccess(req, eventId))) {
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
      ? `${frontendBaseUrl}/e3/${event.slug}?invite=${encodeURIComponent(inviteToken)}`
      : null;

    return res.json({ ok: true, eventId, inviteToken, shareUrl });
  } catch (error) {
    logger.error('Mint event invite token error', {
      message: getErrorMessage(error),
      eventId: req.params.id,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/usage', optionalAuthMiddleware, handleEventStorageUsage);

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

      if (!(await hasEventManageAccess(req, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = req.body as any; // Schema validation temporarily disabled

      // Categories are managed via dedicated category endpoints, not via event update.
      const { categories: _categories, ...eventData } = data as any;

      // Block dateTime changes if the event has already started
      if (eventData.dateTime !== undefined && existingEvent.dateTime) {
        const eventStart = new Date(existingEvent.dateTime);
        if (eventStart < new Date()) {
          return res.status(400).json({ error: 'Das Datum kann nicht mehr geändert werden, da das Event bereits gestartet ist.' });
        }
      }

      const nextFeaturesConfig =
        eventData.featuresConfig && typeof eventData.featuresConfig === 'object'
          ? normalizeEventFeaturesConfig({
              ...((existingEvent as any)?.featuresConfig || {}),
              ...(eventData.featuresConfig as any),
            })
          : undefined;

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...eventData,
          dateTime: eventData.dateTime ? new Date(eventData.dateTime) : undefined,
          ...(nextFeaturesConfig ? { featuresConfig: nextFeaturesConfig } : {}),
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
      logger.error('Update event error', { message: getErrorMessage(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

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

      if (!(await hasEventManageAccess(req, req.params.id))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Soft-delete with 7-day grace period instead of hard delete
      const purgeAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await prisma.event.update({
        where: { id: req.params.id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          purgeAfter,
        },
      });

      auditLog({ type: AuditType.EVENT_DELETED, message: `Event soft-gelöscht (Wiederherstellung bis ${purgeAfter.toISOString()}): ${existingEvent.title}`, eventId: req.params.id, data: { title: existingEvent.title, purgeAfter }, req });

      res.json({ message: 'Event deleted', purgeAfter: purgeAfter.toISOString() });
    } catch (error) {
      logger.error('Delete event error', { message: getErrorMessage(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Restore a soft-deleted event (within grace period)
router.post(
  '/:id/restore',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
        select: { id: true, hostId: true, deletedAt: true, purgeAfter: true, title: true },
      });

      if (!event || !event.deletedAt) {
        return res.status(404).json({ error: 'Event nicht gefunden oder nicht gelöscht' });
      }

      // Cannot use hasEventManageAccess — it rejects soft-deleted events.
      // Check ownership directly: host or admin only.
      const isOwner = req.userId === event.hostId;
      const isAdmin = isPrivilegedRole(req.userRole);
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (event.purgeAfter && new Date() > event.purgeAfter) {
        return res.status(410).json({ error: 'Grace Period abgelaufen — Event kann nicht wiederhergestellt werden' });
      }

      await prisma.event.update({
        where: { id: req.params.id },
        data: { deletedAt: null, isActive: true, purgeAfter: null },
      });

      auditLog({ type: AuditType.EVENT_RESTORED, message: `Event wiederhergestellt: ${event.title}`, eventId: req.params.id, data: { title: event.title }, req });

      return res.json({ ok: true, message: 'Event wiederhergestellt' });
    } catch (error) {
      logger.error('Restore event error', { message: getErrorMessage(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.get(
  '/:id/package-info',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Require host, admin, member, or guest access
      const isHost = !!req.userId && req.userId === event.hostId;
      const isAdmin = req.userRole === 'ADMIN';
      const isMember = !!req.userId && !!(await prisma.eventMember.findUnique({
        where: { eventId_userId: { eventId, userId: req.userId } },
      }));
      const isGuest = hasEventAccess(req, eventId);
      if (!isHost && !isAdmin && !isMember && !isGuest) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const packageInfo = await getEventFeatures(eventId);
      const usage = await getEventUsageBreakdown(eventId);
      const storageEndsAt = await getEventStorageEndsAt(eventId);

      res.json({
        ...packageInfo,
        usage: {
          photosBytes: bigintToString(usage.photosBytes),
          videosBytes: bigintToString(usage.videosBytes),
          guestbookBytes: bigintToString(usage.guestbookBytes),
          totalBytes: bigintToString(usage.totalBytes),
        },
        storageEndsAt,
        isStorageLocked: storageEndsAt ? Date.now() > storageEndsAt.getTime() : false,
      });
    } catch (error) {
      logger.error('Get package info error', { message: getErrorMessage(error), eventId: req.params.id });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── Paket-Wechsel für Event ─────────────────────────────────────────────────

router.get(
  '/:id/available-packages',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      const packages = await prisma.packageDefinition.findMany({
        where: { isActive: true, type: 'BASE' },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          sku: true,
          name: true,
          resultingTier: true,
          description: true,
          priceEurCents: true,
          displayOrder: true,
          storageLimitBytes: true,
          storageLimitPhotos: true,
          storageDurationDays: true,
          allowVideoUpload: true,
          allowStories: true,
          allowPasswordProtect: true,
          allowGuestbook: true,
          allowZipDownload: true,
          allowBulkOperations: true,
          allowLiveWall: true,
          allowFaceSearch: true,
          allowGuestlist: true,
          allowFullInvitation: true,
          allowCoHosts: true,
          isAdFree: true,
          allowMosaicWall: true,
          allowMosaicPrint: true,
          allowMosaicExport: true,
          maxCategories: true,
          maxChallenges: true,
          maxCoHosts: true,
          maxZipDownloadPhotos: true,
        },
      });

      // Serialize BigInt fields
      const serialized = packages.map(p => ({
        ...p,
        storageLimitBytes: p.storageLimitBytes?.toString() || null,
      }));

      res.json({ packages: serialized });
    } catch (error) {
      logger.error('Get available packages error', { message: getErrorMessage(error) });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put(
  '/:id/change-package',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;
      const { sku } = req.body;

      if (!sku || typeof sku !== 'string') {
        return res.status(400).json({ error: 'SKU ist erforderlich' });
      }

      // Only event owner can change package
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      // Verify the target package exists and is active
      const targetPkg = await prisma.packageDefinition.findFirst({
        where: { sku, isActive: true, type: 'BASE' },
      });
      if (!targetPkg) {
        return res.status(404).json({ error: 'Paket nicht gefunden' });
      }

      // Get current entitlement
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { hostId: true, host: { select: { wordpressUserId: true } } },
      });
      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const wpUserId = event.host?.wordpressUserId ?? 0;

      // Find existing active BASE entitlement (most recent)
      const existing = await prisma.eventEntitlement.findFirst({
        where: { eventId, status: 'ACTIVE', NOT: { source: { startsWith: 'addon' } } },
        orderBy: { createdAt: 'desc' },
      });

      // Deactivate ALL other active BASE entitlements to prevent stale ones lingering
      await prisma.eventEntitlement.updateMany({
        where: {
          eventId,
          status: 'ACTIVE',
          NOT: { source: { startsWith: 'addon' } },
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        data: { status: 'REPLACED' },
      });

      if (existing) {
        // Update the most recent entitlement
        await prisma.eventEntitlement.update({
          where: { id: existing.id },
          data: {
            wcSku: sku,
            storageLimitBytes: targetPkg.storageLimitBytes,
            source: `manual_switch_from_${existing.wcSku || 'free'}`,
          },
        });
      } else {
        // Create new entitlement
        await prisma.eventEntitlement.create({
          data: {
            eventId,
            wpUserId,
            status: 'ACTIVE',
            source: 'manual_switch_from_free',
            wcSku: sku,
            storageLimitBytes: targetPkg.storageLimitBytes,
          },
        });
      }

      logger.info('Package changed', {
        eventId,
        newSku: sku,
        previousSku: existing?.wcSku || 'free',
        userId: req.userId,
      });

      // Return updated package info
      const packageInfo = await getEventFeatures(eventId);
      res.json({ success: true, ...packageInfo });
    } catch (error) {
      logger.error('Change package error', { message: getErrorMessage(error), eventId: req.params.id });
      res.status(500).json({ error: 'Fehler beim Paketwechsel' });
    }
  }
);

router.get(
  '/:eventId/invitation',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { 
          id: true, 
          hostId: true, 
          invitationDesign: true 
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Check access
      const hasAccess = await hasEventManageAccess(req, eventId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      res.json(event.invitationDesign || null);
    } catch (error: any) {
      logger.error('Get invitation design error', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.put(
  '/:eventId/invitation',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const design = req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Check access
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { invitationDesign: design as any },
      });

      logger.info('Invitation design updated', { eventId, userId: req.userId });
      res.json((updatedEvent as any).invitationDesign);
    } catch (error: any) {
      logger.error('Update invitation design error', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/events/:eventId/export — Export event stats as JSON
router.get(
  '/:eventId/export',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      const [event, photos, guests, guestbook] = await Promise.all([
        prisma.event.findUnique({
          where: { id: eventId },
          select: { id: true, title: true, slug: true, dateTime: true, createdAt: true, visitCount: true },
        }),
        prisma.photo.findMany({
          where: { eventId, deletedAt: null },
          select: { id: true, uploadedBy: true, createdAt: true, status: true, sizeBytes: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.guest.findMany({
          where: { eventId },
          select: { firstName: true, lastName: true, email: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.guestbookEntry.count({ where: { eventId } }),
      ]);

      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const approved = photos.filter(p => p.status === 'APPROVED').length;
      const pending = photos.filter(p => p.status === 'PENDING').length;
      const totalBytes = photos.reduce((sum, p) => sum + (Number(p.sizeBytes) || 0), 0);

      // Top uploaders
      const uploaderMap: Record<string, number> = {};
      for (const p of photos) {
        const name = p.uploadedBy || 'Anonym';
        uploaderMap[name] = (uploaderMap[name] || 0) + 1;
      }
      const topUploaders = Object.entries(uploaderMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      res.json({
        exportedAt: new Date().toISOString(),
        event: {
          id: event.id,
          title: event.title,
          slug: event.slug,
          date: event.dateTime,
          createdAt: event.createdAt,
          visitCount: event.visitCount,
        },
        stats: {
          totalPhotos: photos.length,
          approvedPhotos: approved,
          pendingPhotos: pending,
          totalGuestbookEntries: guestbook,
          totalGuests: guests.length,
          storageMB: Math.round(totalBytes / 1024 / 1024 * 100) / 100,
        },
        topUploaders,
        guests: guests.map(g => ({
          name: `${g.firstName} ${g.lastName}`.trim(),
          email: g.email,
          addedAt: g.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error('Event export error', { error: error.message });
      res.status(500).json({ error: 'Fehler beim Export' });
    }
  }
);

// POST /api/events/:eventId/clone — Clone an event (settings + config, no photos)
router.post(
  '/:eventId/clone',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Keine Berechtigung' });
      }

      const source = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          title: true, designConfig: true,
          featuresConfig: true, themeId: true, customThemeData: true,
        },
      });
      if (!source) return res.status(404).json({ error: 'Event nicht gefunden' });

      const newTitle = req.body.title || `${source.title} (Kopie)`;
      const slug = `${newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Date.now().toString(36)}`;

      const cloned = await prisma.event.create({
        data: {
          title: newTitle,
          slug,
          hostId: req.userId!,
          designConfig: source.designConfig as any,
          featuresConfig: source.featuresConfig as any,
          themeId: source.themeId,
          customThemeData: source.customThemeData as any,
          isActive: false,
        },
      });

      logger.info('Event cloned', { sourceId: eventId, cloneId: cloned.id, userId: req.userId });
      res.status(201).json({ event: cloned, message: 'Event geklont' });
    } catch (error: any) {
      logger.error('Event clone error', { error: error.message, eventId: req.params.eventId });
      res.status(500).json({ error: 'Fehler beim Klonen' });
    }
  }
);

export default router;

