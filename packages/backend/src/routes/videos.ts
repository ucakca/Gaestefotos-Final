import { Router, Response } from 'express';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest, optionalAuthMiddleware, hasEventAccess, hasEventManageAccess, hasEventPermission, isPrivilegedRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import { cache } from '../services/cache';
import archiver from 'archiver';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { attachEventUploadRateLimits, videoUploadEventLimiter, videoUploadIpLimiter } from '../middleware/rateLimit';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { isWithinDateWindowPlusMinusDays } from '../services/uploadDatePolicy';
import { denyByVisibility, isWithinEventDateWindow } from '../services/eventPolicy';
import { getEventStorageEndsAt } from '../services/storagePolicy';

const router = Router();

async function selectSmartCategoryId(opts: {
  eventId: string;
  capturedAt: Date;
  isGuest: boolean;
}): Promise<string | null> {
  const { eventId, capturedAt, isGuest } = opts;

  const cat = await prisma.category.findFirst({
    where: {
      eventId,
      startAt: { not: null, lte: capturedAt },
      endAt: { not: null, gte: capturedAt },
    },
    select: { id: true, uploadLocked: true },
    orderBy: { startAt: 'desc' },
  });

  if (!cat) return null;
  if (isGuest && cat.uploadLocked) return null;
  return cat.id;
}

function serializeBigInt(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as unknown;
}

// Multer setup for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Videodateien sind erlaubt'));
    }
  },
  }
);

// Get all videos for an event (similar to photos route)
router.get(
  '/:eventId/videos',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { status, categoryId, uploadedBy, cursor, limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);

    // Load event to get featuresConfig and hostId
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        hostId: true,
        featuresConfig: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;

    // Allow host/co-host/admin access without cookie
    if (req.userId) {
      if (!isManager && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }
    }

    // Determine event mode and user role
    const featuresConfig = event.featuresConfig as any;
    const mode = featuresConfig?.mode || 'STANDARD';
    const isGuest = !isManager && req.userId;

    const where: any = { eventId };

    // Always exclude deleted videos
    where.deletedAt = null;
    where.status = {
      not: 'DELETED',
    };

    // Apply mode-based filtering (same as photos)
    if (mode === 'COLLECT' && isGuest) {
      where.guestId = req.userId;
    } else if (mode === 'MODERATION' && isGuest) {
      where.status = 'APPROVED';
    }

    // Apply status filter if specified (never allow deleted)
    if (status && status !== 'DELETED') {
      where.status = status;
    }

    // Apply category filter if specified
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Apply uploader filter if specified
    if (uploadedBy) {
      where.uploadedBy = { contains: uploadedBy as string, mode: 'insensitive' };
    }

    // Build query with cursor-based pagination
    const query: any = {
      where,
      include: {
        guest: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: limitNum + 1,
      orderBy: {
        createdAt: 'desc',
      },
    };

    // Cursor-based pagination
    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const videos = await prisma.video.findMany(query);

    // Check if there are more videos
    const hasMore = videos.length > limitNum;
    
    // Replace presigned URLs with permanent proxy URLs
    // Use relative URLs if BACKEND_URL is not set (works with Nginx proxy)
    const baseUrl = process.env.BACKEND_URL || process.env.API_URL;
    const videosWithPermanentUrls = videos.map((video: any) => {
      const isPrivileged = isManager;
      const safeVideo = isPrivileged
        ? video
        : (() => {
            const next = { ...video };
            delete (next as any).scanStatus;
            delete (next as any).scanError;
            delete (next as any).scannedAt;
            return next;
          })();

      return {
        ...safeVideo,
        url: video.storagePath
          ? baseUrl
            ? `${baseUrl}/api/videos/${video.id}/file`
            : `/api/videos/${video.id}/file` // Relative URL for Nginx proxy
          : video.url, // Fallback to old URL if no storagePath
      };
    });
    const result = {
      videos: videosWithPermanentUrls,
      nextCursor: hasMore ? videos[limitNum - 1].id : null,
      hasMore,
    };

    res.json(serializeBigInt(result));
  } catch (error) {
    logger.error('Fehler beim Abrufen der Videos', { error, eventId: req.params.eventId });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create story from video (Gast entscheidet)
router.post(
  '/:videoId/story',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    // This router is mounted under /api/events and /api/videos.
    // To avoid accidental exposure under /api/events/:eventId/videos/:videoId/story,
    // we only allow this endpoint when mounted under /api/videos.
    if (!req.baseUrl?.endsWith('/api/videos')) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }

    const { videoId } = req.params;
    const { isActive = true } = req.body;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        event: true,
      },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (video.deletedAt || video.status === 'DELETED') {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (video.event.deletedAt || video.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const eventId = video.eventId;
    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
    if (!isManager && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (video.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Nur freigegebene Videos können als Story verwendet werden' });
    }

    const existingStory = await prisma.story.findFirst({
      where: {
        videoId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingStory) {
      await prisma.video.update({
        where: { id: videoId },
        data: { isStoryOnly: true },
      });

      const updatedStory = await prisma.story.update({
        where: { id: existingStory.id },
        data: {
          isActive,
        },
        include: {
          video: {
            select: {
              id: true,
              url: true,
              uploadedBy: true,
              duration: true,
            },
          },
        },
      });

      return res.json({ story: updatedStory });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.video.update({
      where: { id: videoId },
      data: { isStoryOnly: true },
    });

    const story = await prisma.story.create({
      data: {
        eventId: video.eventId,
        videoId,
        isActive,
        expiresAt,
      },
      include: {
        video: {
          select: {
            id: true,
            url: true,
            uploadedBy: true,
            duration: true,
          },
        },
      },
    });

    res.status(201).json({ story });
  } catch (error: any) {
    logger.error('Fehler beim Erstellen der Story', {
      message: (error as any)?.message || String(error),
      videoId: req.params.videoId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Upload video (similar to photo upload)
router.post(
  '/:eventId/videos/upload',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }
    next();
  },
  attachEventUploadRateLimits,
  videoUploadIpLimiter,
  videoUploadEventLimiter,
  upload.single('file'),
  validateUploadedFile('video'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Keine Datei bereitgestellt' });
      }

      logger.info('Video upload started', { eventId, filename: file.originalname, size: file.size });

      // Check if event exists and get featuresConfig
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          hostId: true,
          deletedAt: true,
          isActive: true,
          featuresConfig: true,
          dateTime: true,
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Check event mode and upload permissions
      const featuresConfig = event.featuresConfig as any;
      const mode = featuresConfig?.mode || 'STANDARD';
      const allowUploads = featuresConfig?.allowUploads !== false;
      const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
      const isGuest = !isManager && req.userId;
      const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';

      if (req.userId && isManager && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canUpload = await hasEventPermission(req, eventId, 'canUpload');
        if (!canUpload) {
          return denyByVisibility(res, 'hostOrAdmin', {
            code: 'PERMISSION_DENIED',
            error: 'Keine Berechtigung',
          });
        }
      }

      // Block uploads in VIEW_ONLY mode for guests
      if (mode === 'VIEW_ONLY' && isGuest) {
        return denyByVisibility(res, denyVisibility, {
          code: 'UPLOADS_DISABLED',
          error: 'Uploads sind in diesem Event-Modus nicht erlaubt',
        });
      }

      // Block uploads if allowUploads is false
      if (!allowUploads && isGuest) {
        return denyByVisibility(res, denyVisibility, {
          code: 'UPLOADS_DISABLED',
          error: 'Uploads sind für dieses Event deaktiviert',
        });
      }

      // Upload time restriction: eventDate ±1 day
      if (!event.dateTime) {
        return denyByVisibility(res, denyVisibility, {
          code: 'EVENT_DATE_MISSING',
          error: 'Event-Datum fehlt',
        });
      }
      if (!isWithinEventDateWindow(new Date(), event.dateTime, 1)) {
        return denyByVisibility(res, denyVisibility, {
          code: 'UPLOAD_WINDOW_CLOSED',
          error: 'Uploads sind nur rund um das Event-Datum möglich (±1 Tag)',
        });
      }

      // Check category upload lock if categoryId is provided
      const rawCategoryId = typeof (req as any)?.body?.categoryId === 'string' ? String((req as any).body.categoryId) : '';
      const categoryId = rawCategoryId.trim() || null;
      const capturedAt = new Date();

      const resolvedCategoryId = categoryId
        ? categoryId
        : await selectSmartCategoryId({
            eventId,
            capturedAt,
            isGuest: !!isGuest,
          });

      if (categoryId && isGuest) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (category && category.uploadLocked) {
          const now = new Date();
          if (category.uploadLockUntil && new Date(category.uploadLockUntil) > now) {
            return res.status(403).json({ 
              error: `Uploads für dieses Album sind bis ${new Date(category.uploadLockUntil).toLocaleString('de-DE')} gesperrt` 
            });
          } else if (!category.uploadLockUntil) {
            return res.status(403).json({ 
              error: 'Uploads für dieses Album sind gesperrt' 
            });
          }
        }
      }

      let referenceDateTime: Date | null = null;

      if (resolvedCategoryId) {
        const category = await prisma.category.findUnique({
          where: { id: resolvedCategoryId },
          select: { id: true, eventId: true, dateTime: true },
        });

        if (!category || category.eventId !== eventId) {
          return res.status(400).json({ error: 'Album nicht gefunden' });
        }

        if (category.dateTime) {
          referenceDateTime = category.dateTime;
        }
      }

      if (!referenceDateTime && event.dateTime) {
        referenceDateTime = event.dateTime;
      }

      const datePolicy = (featuresConfig as any)?.uploadDatePolicy;
      const datePolicyEnabled = datePolicy?.enabled !== false;
      const datePolicyToleranceRaw = Number(datePolicy?.toleranceDays);
      const datePolicyToleranceDays = Number.isFinite(datePolicyToleranceRaw) && datePolicyToleranceRaw >= 0
        ? Math.min(7, Math.floor(datePolicyToleranceRaw))
        : 1;

      if (referenceDateTime && datePolicyEnabled) {
        const ok = isWithinDateWindowPlusMinusDays({
          capturedAt,
          referenceDateTime,
          toleranceDays: datePolicyToleranceDays,
        });

        if (!ok) {
          return res.status(400).json({
            error: 'Upload passt nicht zum Event/Album (±1 Tag)',
          });
        }
      }

      // Get optional uploader name
      const uploadedBy = req.body.uploadedBy || req.body.uploaderName || req.body.name || null;
      
      // Get guest name if available
      let uploaderName = uploadedBy;
      if (!uploaderName && req.userId && isGuest) {
        const guest = await prisma.guest.findUnique({
          where: { id: req.userId },
          select: { firstName: true, lastName: true },
        });
        if (guest) {
          uploaderName = `${guest.firstName} ${guest.lastName}`.trim();
        }
      }

      // Generate permanent URL
      // Use relative URLs if BACKEND_URL is not set (works with Nginx proxy)
      const baseUrl = process.env.BACKEND_URL || process.env.API_URL;

      // Determine status based on moderation settings
      const moderationRequired = featuresConfig?.moderationRequired === true;
      const status = moderationRequired && isGuest ? 'PENDING' : 'APPROVED';

      const uploadBytes = BigInt(file.buffer.length);
      try {
        await assertUploadWithinLimit(eventId, uploadBytes);
      } catch (e: any) {
        if (e?.httpStatus) {
          return res.status(e.httpStatus).json({ error: 'Speicherlimit erreicht' });
        }
        throw e;
      }

      // Create video after limit check to avoid orphan records
      const tempVideo = await (prisma as any).video.create({
        data: {
          eventId,
          guestId: isGuest ? req.userId : null,
          categoryId: resolvedCategoryId,
          storagePath: '', // Will be set after upload
          url: '', // Will be set after creation
          uploadedBy: uploaderName,
          title: req.body.title || null,
          description: req.body.description || null,
          status: 'PENDING', // Will be updated after upload
          scanStatus: 'PENDING',
          scannedAt: null,
          scanError: null,
        },
      });

      let video: any;
      try {
        // Upload video to storage with videoId and uploaderName
        const extension = file.originalname.split('.').pop() || 'mp4';
        const storagePath = await storageService.uploadFile(
          eventId,
          `video.${extension}`,
          file.buffer,
          file.mimetype,
          tempVideo.id,
          uploaderName,
          event.hostId
        );

        // Update with permanent URL
        const permanentUrl = baseUrl 
          ? `${baseUrl}/api/videos/${tempVideo.id}/file`
          : `/api/videos/${tempVideo.id}/file`; // Relative URL for Nginx proxy

        // Update video record
        video = await (prisma as any).video.update({
          where: { id: tempVideo.id },
          data: {
            storagePath,
            url: permanentUrl,
            status,
            sizeBytes: uploadBytes,
          },
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      } catch (uploadErr) {
        try {
          await (prisma as any).video.update({
            where: { id: tempVideo.id },
            data: {
              status: 'DELETED',
              deletedAt: new Date(),
              purgeAfter: null,
            },
          });
        } catch {
          // ignore cleanup errors
        }
        throw uploadErr;
      }

      // Invalidate cache
      await cache.delPattern(`videos:${eventId}:*`);

      logger.info('Video uploaded successfully', { videoId: video.id, eventId });

      res.status(201).json({ video });
    } catch (error: any) {
      logger.error('Fehler beim Hochladen des Videos', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
      });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Serve video file
router.get(
  '/:eventId/file/:storagePath(*)',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const storagePath = (req.params as any).storagePath as string;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const storageEndsAt = await getEventStorageEndsAt(eventId);
      if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
      if (!isManager && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      const fileBuffer = await storageService.getFile(storagePath);

      const lower = (storagePath || '').toLowerCase();
      const contentType = lower.endsWith('.mp4')
        ? 'video/mp4'
        : lower.endsWith('.webm')
          ? 'video/webm'
          : lower.endsWith('.mov')
            ? 'video/quicktime'
            : 'video/mp4';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Accept-Ranges', 'bytes');
      res.send(fileBuffer);
    } catch (error: any) {
      logger.error('Error serving video', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
        storagePath: (req.params as any).storagePath,
      });
      res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
    }
  }
);

// Download video
router.get(
  '/:videoId/download',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        event: {
          select: {
            id: true,
            hostId: true,
            featuresConfig: true,
            dateTime: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!video || video.deletedAt || video.status === 'DELETED') {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (video.event.deletedAt || video.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Access control: host/co-host/admin via JWT OR event access cookie for guests
    const isManager = req.userId ? await hasEventManageAccess(req, video.eventId) : false;
    if (!isManager && !hasEventAccess(req, video.eventId)) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    const denyVisibility = isManager ? 'hostOrAdmin' : 'guest';

    // Storage period enforcement
    // Host/Admin can still download after lock (for backup before hard delete)
    const storageEndsAt = await getEventStorageEndsAt(video.eventId);
    if (!isManager && storageEndsAt && Date.now() > storageEndsAt.getTime()) {
      return denyByVisibility(res, denyVisibility, {
        code: 'STORAGE_LOCKED',
        error: 'Speicherperiode beendet',
      });
    }

    const featuresConfig = (video.event.featuresConfig || {}) as any;

    // Guests can download only if host enabled allowDownloads
    if (!isManager && featuresConfig?.allowDownloads === false) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    // Guests can download only approved videos
    if (!isManager && video.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (req.userId && isManager && video.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
      const canDownload = await hasEventPermission(req, video.eventId, 'canDownload');
      if (!canDownload) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }
    }

    // Quarantine enforcement
    const enforceVirusScan =
      process.env.VIRUS_SCAN_ENFORCE === 'true' ||
      (video.event.featuresConfig as any)?.virusScan?.enforce === true;
    const scanStatus = (video as any)?.scanStatus;
    if (enforceVirusScan && scanStatus && scanStatus !== 'CLEAN') {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    // Check download time restriction: Only 21 days after event date
    // NOTE: Storage period policy is enforced elsewhere (lifecycle rules); do not hardcode date limits here.

    if (!video.storagePath) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    const fileBuffer = await storageService.getFile(video.storagePath);
    const extension = video.storagePath.split('.').pop() || 'mp4';
    const contentType = extension === 'webm'
      ? 'video/webm'
      : extension === 'mov'
      ? 'video/quicktime'
      : 'video/mp4';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=0');
    res.setHeader('Content-Disposition', `attachment; filename="video-${videoId}.${extension}"`);
    res.send(fileBuffer);
  } catch (error: any) {
    logger.error('Fehler beim Download des Videos', {
      message: (error as any)?.message || String(error),
      videoId: req.params.videoId,
    });
    res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
  }
});

// Update video status (approve/reject)
router.post(
  '/:videoId/:action(approve|reject)',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
  try {
    // ... (rest of the code remains the same)
  } catch (error: any) {
    logger.error('Fehler bei Video-Status-Update', { error, videoId: req.params.videoId, action: req.params.action });
    res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
  }
});

// Delete video
router.delete('/:videoId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // ... (rest of the code remains the same)
  } catch (error: any) {
    logger.error('Fehler beim Löschen des Videos', { error, videoId: req.params.videoId });
    res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
  }
});

// List trashed videos for an event (host only)
router.get('/:eventId/trash', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // ... (rest of the code remains the same)
  } catch (error: any) {
    logger.error('Fehler beim Abrufen des Video-Papierkorbs', { error, eventId: req.params.eventId });
    res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
  }
});

// Restore video from trash
router.post('/:videoId/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // ... (rest of the code remains the same)
  } catch (error: any) {
    logger.error('Fehler beim Wiederherstellen des Videos', { error, videoId: req.params.videoId });
    res.status(500).json({ error: 'Ein interner Serverfehler ist aufgetreten' });
  }
});

// Purge video (hard delete + storage)
router.post('/:videoId/purge', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        eventId: true,
        deletedAt: true,
        status: true,
        event: {
          select: {
            hostId: true,
            deletedAt: true,
            isActive: true,
          },
        },
      },
    });

    if (!video || video.deletedAt || video.status === 'DELETED') {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (video.event.deletedAt || video.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (!(await hasEventManageAccess(req, video.eventId))) {
      return res.status(404).json({ error: 'Video nicht gefunden' });
    }

    if (req.userId && video.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
      const canModerate = await hasEventPermission(req, video.eventId, 'canModerate');
      if (!canModerate) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }
    }

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        purgeAfter: null,
      },
    });
    await cache.delPattern(`videos:${video.eventId}:*`);
    res.json({ success: true, message: 'Video deleted (soft)' });
  } catch (error: any) {
    logger.error('Fehler beim endgültigen Löschen des Videos', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Bulk approve videos
router.post('/bulk/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Keine Video-IDs bereitgestellt' });
    }

    // Get all videos and check permissions
    const videos = await prisma.video.findMany({
      where: { id: { in: videoIds } },
      include: { event: true },
    });

    // Check permissions for all videos
    for (const video of videos) {
      if (!(await hasEventManageAccess(req, video.eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (req.userId && video.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, video.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }
    }

    // Update all videos
    await prisma.video.updateMany({
      where: { id: { in: videoIds } },
      data: { status: 'APPROVED' },
    });

    // Invalidate cache for all affected events
    const eventIds = [...new Set(videos.map(v => v.eventId))];
    for (const eventId of eventIds) {
      await cache.delPattern(`videos:${eventId}:*`);
    }

    res.json({ success: true, message: `${videoIds.length} Video(s) freigegeben` });
  } catch (error: any) {
    logger.error('Fehler bei Bulk-Freigabe der Videos', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Bulk reject videos
router.post('/bulk/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Keine Video-IDs bereitgestellt' });
    }

    // Get all videos and check permissions
    const videos = await prisma.video.findMany({
      where: { id: { in: videoIds } },
      include: { event: true },
    });

    // Check permissions for all videos
    for (const video of videos) {
      if (!(await hasEventManageAccess(req, video.eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (req.userId && video.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, video.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }
    }

    // Update all videos
    await prisma.video.updateMany({
      where: { id: { in: videoIds } },
      data: { status: 'REJECTED' },
    });

    // Invalidate cache for all affected events
    const eventIds = [...new Set(videos.map(v => v.eventId))];
    for (const eventId of eventIds) {
      await cache.delPattern(`videos:${eventId}:*`);
    }

    res.json({ success: true, message: `${videoIds.length} Video(s) abgelehnt` });
  } catch (error: any) {
    logger.error('Fehler bei Bulk-Ablehnung der Videos', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Bulk delete videos
router.post('/bulk/delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'Keine Video-IDs bereitgestellt' });
    }

    // Get all videos and check permissions
    const videos = await prisma.video.findMany({
      where: { id: { in: videoIds } },
      include: { event: true },
    });

    // Check permissions for all videos
    for (const video of videos) {
      const isManager = req.userId ? await hasEventManageAccess(req, video.eventId) : false;
      const isOwner = video.guestId === req.userId;
      
      if (!isManager && !isOwner && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      if (req.userId && isManager && !isOwner && video.event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canModerate = await hasEventPermission(req, video.eventId, 'canModerate');
        if (!canModerate) {
          return res.status(404).json({ error: 'Video nicht gefunden' });
        }
      }
    }

    await prisma.video.updateMany({
      where: { id: { in: videoIds } },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        purgeAfter: null,
      },
    });

    // Invalidate cache for all affected events
    const eventIds = [...new Set(videos.map(v => v.eventId))];
    for (const eventId of eventIds) {
      await cache.delPattern(`videos:${eventId}:*`);
    }

    res.json({ success: true, message: `${videoIds.length} Video(s) gelöscht (soft)` });
  } catch (error: any) {
    logger.error('Fehler bei Bulk-Löschung der Videos', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Download selected videos as ZIP
router.post(
  '/bulk/download',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { videoIds } = req.body;

      if (!Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ error: 'Keine Videos ausgewählt' });
      }

      // Get videos with event info
      const videos = await prisma.video.findMany({
        where: {
          id: { in: videoIds },
          deletedAt: null,
        },
        include: {
          event: true,
        },
      });

      if (videos.length === 0) {
        return res.status(404).json({ error: 'Keine Videos gefunden' });
      }

      const event = videos[0].event;

      // Ensure all videos belong to the same event
      const eventId = event.id;
      if (videos.some((v) => v.eventId !== eventId)) {
        return res.status(400).json({ error: 'Videos müssen aus demselben Event stammen' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Only host/co-host/admin can bulk-download
      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (req.userId && event.hostId !== req.userId && !isPrivilegedRole(req.userRole)) {
        const canDownload = await hasEventPermission(req, eventId, 'canDownload');
        if (!canDownload) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }

      // Storage period enforcement - Host/Admin can still bulk-download after lock (for backup)
      // Note: hasEventManageAccess already verified above, so we skip lock for managers

      const featuresConfig = (event.featuresConfig || {}) as any;

      const enforceVirusScan =
        process.env.VIRUS_SCAN_ENFORCE === 'true' ||
        (featuresConfig as any)?.virusScan?.enforce === true;
      const videosToDownload = enforceVirusScan
        ? videos.filter((v: any) => v.scanStatus === 'CLEAN')
        : videos;

      // Check download time restriction
      // NOTE: Storage period policy is enforced elsewhere (lifecycle rules); do not hardcode date limits here.

      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${event.slug}-videos-${Date.now()}.zip"`);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      archive.on('error', (err) => {
        logger.error('ZIP-Erstellungsfehler:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Fehler beim Erstellen der ZIP-Datei' });
        }
      });

      archive.pipe(res);

      // Add videos to ZIP
      for (const video of videosToDownload) {
        try {
          const fileBuffer = await storageService.getFile(video.storagePath);
          const extension = video.storagePath.split('.').pop() || 'mp4';
          archive.append(fileBuffer, { name: `${video.id}.${extension}` });
        } catch (err) {
          logger.warn(`Fehler beim Hinzufügen von Video ${video.id}:`, err);
        }
      }

      archive.finalize();
    } catch (error) {
      logger.error('Fehler beim Bulk-Download:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Interner Serverfehler' });
      }
    }
  }
);

// Move videos to album
router.post(
  '/bulk/move-to-album',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { videoIds, categoryId } = req.body;

      if (!Array.isArray(videoIds) || videoIds.length === 0) {
        return res.status(400).json({ error: 'Keine Videos ausgewählt' });
      }

      // Get videos with event info
      const videos = await prisma.video.findMany({
        where: { id: { in: videoIds } },
        include: { event: true },
      });

      // Check permissions
      for (const video of videos) {
        if (!(await hasEventManageAccess(req, video.eventId))) {
          return res.status(404).json({ error: 'Event nicht gefunden' });
        }
      }

      // Update videos
      await prisma.video.updateMany({
        where: { id: { in: videoIds } },
        data: { categoryId: categoryId || null },
      });

      // Invalidate cache
      const eventIds = [...new Set(videos.map(v => v.eventId))];
      for (const eventId of eventIds) {
        await cache.delPattern(`videos:${eventId}:*`);
      }

      res.json({ success: true, message: `${videoIds.length} Video(s) verschoben` });
    } catch (error) {
      logger.error('Fehler beim Verschieben der Videos:', error);
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Serve video file - permanent proxy route
router.get(
  '/:videoId/file',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { videoId } = req.params;

      // Get video with event info
      const video = await (prisma as any).video.findUnique({
        where: { id: videoId },
        include: {
          event: {
            select: {
              id: true,
              hostId: true,
              featuresConfig: true,
              deletedAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!video) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      if (video.deletedAt) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      if (video.event.deletedAt || video.event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const storageEndsAt = await getEventStorageEndsAt(video.event.id);
      if (storageEndsAt && Date.now() > storageEndsAt.getTime()) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      if (!video.storagePath) {
        return res.status(404).json({ error: 'Video-Datei nicht gefunden' });
      }

      const enforceVirusScan =
        process.env.VIRUS_SCAN_ENFORCE === 'true' ||
        (video.event.featuresConfig as any)?.virusScan?.enforce === true;
      const scanStatus = (video as any)?.scanStatus;
      if (enforceVirusScan && scanStatus && scanStatus !== 'CLEAN') {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      // Access control: host JWT OR event access cookie
      const eventId = video.event.id;
      const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
      if (!isManager && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      try {
        // Get file from SeaweedFS
        const fileBuffer = await storageService.getFile(video.storagePath);
        
        // Determine content type from storage path
        const contentType = video.storagePath.endsWith('.mp4')
          ? 'video/mp4'
          : video.storagePath.endsWith('.webm')
          ? 'video/webm'
          : video.storagePath.endsWith('.mov')
          ? 'video/quicktime'
          : 'video/mp4';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.setHeader('Content-Disposition', `inline; filename="video-${videoId}"`);
        res.setHeader('Accept-Ranges', 'bytes');
        res.send(fileBuffer);
      } catch (error: any) {
        logger.error('Error serving video file', { message: (error as any)?.message || String(error), videoId });
        res.status(500).json({ error: 'Fehler beim Laden des Videos' });
      }
    } catch (error: any) {
      logger.error('Fehler beim Bereitstellen des Videos', { message: (error as any)?.message || String(error), videoId: req.params.videoId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

router.post(
  '/:videoId/scan/mark-clean',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { videoId } = req.params;

      const video = await (prisma as any).video.findUnique({
        where: { id: videoId },
        include: {
          event: {
            select: {
              id: true,
              hostId: true,
              deletedAt: true,
              isActive: true,
            },
          },
        },
      });

      if (!video || video.deletedAt || video.status === 'DELETED') {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      if (video.event.deletedAt || video.event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isManager = req.userId ? await hasEventManageAccess(req, video.eventId) : false;
      if (!isManager) {
        return res.status(404).json({ error: 'Video nicht gefunden' });
      }

      await (prisma as any).video.update({
        where: { id: videoId },
        data: {
          scanStatus: 'CLEAN',
          scannedAt: new Date(),
          scanError: null,
        },
        select: { id: true },
      });

      res.json({ ok: true, videoId });
    } catch (error: any) {
      logger.error('Mark video scan CLEAN failed', { message: (error as any)?.message || String(error), videoId: req.params.videoId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
