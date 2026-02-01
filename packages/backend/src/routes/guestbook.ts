import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import prisma from '../config/database';
import { AuthRequest, authMiddleware, optionalAuthMiddleware, requireEventAccess, hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { validateUploadedFile } from '../middleware/uploadSecurity';
import { attachEventUploadRateLimits, photoUploadEventLimiter, photoUploadIpLimiter } from '../middleware/rateLimit';
import { assertUploadWithinLimit } from '../services/packageLimits';
import { assertFeatureEnabled } from '../services/featureGate';
import { extractCapturedAtFromImage, isWithinDateWindowPlusMinusDays } from '../services/uploadDatePolicy';
import { serializeBigInt } from '../utils/serializers';

const router = Router();


async function cleanupExpiredGuestbookPhotoUploads(eventId: string, now: Date): Promise<void> {
  type ExpiredUpload = { id: string; storagePath: string };
  const expired = (await (prisma as any).guestbookPhotoUpload.findMany({
    where: {
      eventId,
      claimedAt: null,
      expiresAt: { lt: now },
    },
    select: { id: true, storagePath: true },
  })) as ExpiredUpload[];

  if (expired.length > 0) {
    await (prisma as any).guestbookPhotoUpload.updateMany({
      where: { id: { in: expired.map((u) => u.id) } },
      data: { claimedAt: now },
    });
  }
}

async function cleanupExpiredGuestbookAudioUploads(eventId: string, now: Date): Promise<void> {
  type ExpiredUpload = { id: string; storagePath: string };
  const expired = (await (prisma as any).guestbookAudioUpload.findMany({
    where: {
      eventId,
      claimedAt: null,
      expiresAt: { lt: now },
    },
    select: { id: true, storagePath: true },
  })) as ExpiredUpload[];

  if (expired.length > 0) {
    await (prisma as any).guestbookAudioUpload.updateMany({
      where: { id: { in: expired.map((u) => u.id) } },
      data: { claimedAt: now },
    });
  }
}

// Multer setup for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (aligned with Nginx)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB (aligned with Nginx)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Audio-Dateien sind erlaubt'));
    }
  },
});

// Validation schema
const createEntrySchema = z.object({
  authorName: z.string().min(1, 'Name ist erforderlich').max(100),
  message: z.string().min(1, 'Nachricht ist erforderlich').max(2000, 'Nachricht zu lang'),
  photoUrl: z.string().url().optional().nullable(),
  photoUploadId: z.string().uuid().optional().nullable(),
  photoStoragePath: z.string().optional().nullable(), // Storage path for uploaded photos
  photoSizeBytes: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  audioUrl: z.string().url().optional().nullable(),
  audioUploadId: z.string().uuid().optional().nullable(),
  audioStoragePath: z.string().optional().nullable(),
  audioMimeType: z.string().optional().nullable(),
  audioDurationMs: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  audioSizeBytes: z.union([z.number().int().nonnegative(), z.string()]).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
});

// Get guestbook entries for an event
// Optional auth - check token if provided, but don't require it
router.get(
  '/:eventId/guestbook',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Get event first to check host
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        guestbookHostMessage: true,
        hostId: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHostCheck = req.userId ? req.userId === event.hostId : false;

    const where: any = { eventId };
    
    // Guests only see approved entries
    if (!isHostCheck) {
      where.status = 'APPROVED';
    }

    const entries = await (prisma as any).guestbookEntry.findMany({
      where,
      orderBy: {
        createdAt: 'asc', // Chronologisch für Chat-Ansicht
      },
    });

    // Generate photo URLs for entries that have storage paths
    // Use relative proxy route (works with Nginx)
    const entriesWithUrls = await Promise.all(entries.map(async (entry: any) => {
      let photoUrl = entry.photoUrl;
      let audioUrl = (entry as any).audioUrl;
      // Always regenerate URL from storagePath if available (use proxy route)
      if (entry.photoStoragePath) {
        // Use relative proxy route (works with Nginx)
        photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath)}`;
      } else if (entry.photoUrl && entry.photoUrl.startsWith('blob:')) {
        // Old entries with blob URLs - set to null (they're invalid)
        photoUrl = null;
      } else if (entry.photoUrl && !entry.photoUrl.startsWith('/api/') && !entry.photoUrl.startsWith('http')) {
        // If it's not a relative /api/ URL and not http, try to convert
        // Skip if it already starts with /api/ or http
        if (entry.photoStoragePath) {
          photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath)}`;
        }
      }

      if ((entry as any).audioStoragePath) {
        audioUrl = `/api/events/${eventId}/guestbook/audio/${encodeURIComponent((entry as any).audioStoragePath)}`;
      } else if (audioUrl && audioUrl.startsWith('blob:')) {
        audioUrl = null;
      }
      return {
        ...entry,
        photoUrl,
        audioUrl,
      };
    }));

    logger.info('Guestbook request:', { eventId, isHost: isHostCheck });
    res.json(
      serializeBigInt({
        entries: entriesWithUrls,
        hostMessage: event.guestbookHostMessage || null,
        isHost: isHostCheck,
      })
    );
  } catch (error) {
    logger.error('Fehler beim Abrufen der Gästebuch-Einträge:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

router.get(
  '/:eventId/guestbook/audio/:storagePath(*)',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, storagePath } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = !!req.userId && req.userId === event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Audio nicht gefunden' });
    }

    if (!storagePath) {
      return res.status(400).json({ error: 'Storage path fehlt' });
    }

    try {
      const fileBuffer = await storageService.getFile(storagePath);
      const row = await (prisma as any).guestbookAudioUpload.findFirst({
        where: { eventId, storagePath },
        select: { mimeType: true },
      });

      const contentType =
        (row?.mimeType && typeof row.mimeType === 'string' && row.mimeType.trim()) ||
        (storagePath.endsWith('.mp3')
          ? 'audio/mpeg'
          : storagePath.endsWith('.ogg')
          ? 'audio/ogg'
          : storagePath.endsWith('.wav')
          ? 'audio/wav'
          : storagePath.endsWith('.m4a')
          ? 'audio/mp4'
          : 'audio/webm');

      const total = fileBuffer.length;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Accept-Ranges', 'bytes');

      const range = req.headers.range;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/i.exec(String(range));
        if (!match) {
          res.setHeader('Content-Range', `bytes */${total}`);
          return res.status(416).end();
        }

        const start = Math.max(0, Number(match[1]));
        const endRaw = match[2] ? Number(match[2]) : total - 1;
        const end = Math.min(total - 1, Number.isFinite(endRaw) ? endRaw : total - 1);
        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
          res.setHeader('Content-Range', `bytes */${total}`);
          return res.status(416).end();
        }

        const chunk = fileBuffer.subarray(start, end + 1);
        res.status(206);
        res.setHeader('Content-Length', String(chunk.length));
        res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
        return res.send(chunk);
      }

      res.setHeader('Content-Length', String(total));
      return res.send(fileBuffer);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen des Audios', {
        message: getErrorMessage(error),
        eventId,
        storagePath,
      });
      res.status(404).json({ error: 'Audio nicht gefunden' });
    }
  } catch (error: any) {
    logger.error('Fehler beim Abrufen des Gästebuch-Audios', {
      message: getErrorMessage(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Get feed entries (public guestbook entries with photos)
router.get(
  '/:eventId/feed',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = !!req.userId && req.userId === event.hostId;

    const where: any = { 
      eventId,
      isPublic: true, // Nur öffentliche Einträge
      photoStoragePath: {
        not: null, // Nur Einträge mit Fotos
      },
    };
    
    // Guests only see approved entries
    if (!isHost) {
      where.status = 'APPROVED';
    }

    const entries = await (prisma as any).guestbookEntry.findMany({
      where,
      orderBy: {
        createdAt: 'desc', // Neueste zuerst
      },
    });

    // Generate permanent URLs for photos
    // Use relative proxy route (works with Nginx)
    const entriesWithUrls = await Promise.all(entries.map(async (entry: any) => {
      let photoUrl = entry.photoUrl;
      let audioUrl = (entry as any).audioUrl;
      // Always regenerate URL from storagePath if available (use proxy route)
      if (entry.photoStoragePath) {
        // Use relative proxy route (works with Nginx)
        photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath)}`;
      } else if (entry.photoUrl && entry.photoUrl.startsWith('blob:')) {
        // Old entries with blob URLs - set to null (they're invalid)
        photoUrl = null;
      } else if (entry.photoUrl && !entry.photoUrl.startsWith('/api/') && !entry.photoUrl.startsWith('http')) {
        // If it's not a relative /api/ URL and not http, try to convert
        // Skip if it already starts with /api/ or http
        photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(entry.photoStoragePath || '')}`;
      }

      if ((entry as any).audioStoragePath) {
        audioUrl = `/api/events/${eventId}/guestbook/audio/${encodeURIComponent((entry as any).audioStoragePath)}`;
      } else if (audioUrl && audioUrl.startsWith('blob:')) {
        audioUrl = null;
      }
      return {
        ...entry,
        photoUrl,
        audioUrl,
      };
    }));

    res.json(serializeBigInt({ entries: entriesWithUrls }));
  } catch (error) {
    logger.error('Fehler beim Abrufen der Feed-Einträge:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create guestbook entry
router.post(
  '/:eventId/guestbook',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const data = createEntrySchema.parse(req.body);

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        featuresConfig: true,
        hostId: true,
        dateTime: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check if guestbook feature is enabled for this event's package
    try {
      await assertFeatureEnabled(eventId, 'guestbook');
    } catch (err: any) {
      if (err.code === 'FEATURE_NOT_AVAILABLE') {
        return res.status(403).json({
          error: 'Gästebuch ist in deinem aktuellen Paket nicht verfügbar. Upgrade auf Basic oder höher.',
          code: 'FEATURE_NOT_AVAILABLE',
          requiredUpgrade: true,
        });
      }
      throw err;
    }

    // Check if guestbook is enabled
    const featuresConfig = event.featuresConfig as any;
    const guestbookEnabled = featuresConfig?.allowGuestbook !== false; // Default true

    if (!guestbookEnabled) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Determine status (moderation required?)
    const moderationRequired = featuresConfig?.moderateGuestbook === true;
    const initialStatus = moderationRequired ? 'PENDING' : 'APPROVED';

    // For photo entries, require a valid pending upload id to prevent limit bypass
    if ((data.photoStoragePath || data.photoSizeBytes) && !data.photoUploadId) {
      return res.status(400).json({ error: 'Foto-Upload ungültig oder fehlt' });
    }

    if ((data.audioStoragePath || data.audioSizeBytes || data.audioMimeType) && !data.audioUploadId) {
      return res.status(400).json({ error: 'Audio-Upload ungültig oder fehlt' });
    }

    const now = new Date();
    await cleanupExpiredGuestbookPhotoUploads(eventId, now);
    await cleanupExpiredGuestbookAudioUploads(eventId, now);

    let photoStoragePath: string | null = null;
    let photoSizeBytes: bigint | null = null;
    if (data.photoUploadId) {
      const pending = await (prisma as any).guestbookPhotoUpload.findFirst({
        where: {
          id: data.photoUploadId,
          eventId,
          claimedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, storagePath: true, sizeBytes: true },
      });

      if (!pending) {
        return res.status(400).json({ error: 'Foto-Upload ungültig oder abgelaufen' });
      }

      photoStoragePath = pending.storagePath;
      photoSizeBytes = pending.sizeBytes;
    }

    let audioStoragePath: string | null = null;
    let audioSizeBytes: bigint | null = null;
    let audioMimeType: string | null = null;
    let audioDurationMs: number | null = null;
    if (data.audioUploadId) {
      const pending = await (prisma as any).guestbookAudioUpload.findFirst({
        where: {
          id: data.audioUploadId,
          eventId,
          claimedAt: null,
          expiresAt: { gt: now },
        },
        select: { id: true, storagePath: true, sizeBytes: true, mimeType: true, durationMs: true },
      });

      if (!pending) {
        return res.status(400).json({ error: 'Audio-Upload ungültig oder abgelaufen' });
      }

      audioStoragePath = pending.storagePath;
      audioSizeBytes = pending.sizeBytes;
      audioMimeType = pending.mimeType;
      audioDurationMs = pending.durationMs ?? null;
    }

    // Generate photo URL from storage path if available (use proxy route)
    let photoUrl = null;
    if (photoStoragePath) {
      // Use relative proxy route (works with Nginx)
      photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(photoStoragePath)}`;
    }

    let audioUrl = null;
    if (audioStoragePath) {
      audioUrl = `/api/events/${eventId}/guestbook/audio/${encodeURIComponent(audioStoragePath)}`;
    }

    const entry = await prisma.$transaction(async (tx) => {
      if (data.photoUploadId) {
        await (tx as any).guestbookPhotoUpload.updateMany({
          where: { id: data.photoUploadId, eventId, claimedAt: null },
          data: { claimedAt: now },
        });
      }

      if (data.audioUploadId) {
        await (tx as any).guestbookAudioUpload.updateMany({
          where: { id: data.audioUploadId, eventId, claimedAt: null },
          data: { claimedAt: now },
        });
      }

      return (tx as any).guestbookEntry.create({
        data: {
          eventId,
          guestId: req.userId || null,
          authorName: data.authorName,
          message: data.message,
          photoUrl: photoUrl, // Use generated URL, not the one from request
          photoStoragePath,
          photoSizeBytes,
          audioUrl: audioUrl,
          audioStoragePath,
          audioMimeType,
          audioDurationMs,
          audioSizeBytes,
          isPublic: data.isPublic !== false, // Default true
          status: initialStatus,
        },
      });
    });

    res.status(201).json(serializeBigInt({ entry }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Fehler beim Erstellen des Gästebuch-Eintrags:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Approve/Reject entry (Admin only)
router.post('/guestbook/:entryId/:action', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entryId, action } = req.params;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Ungültige Aktion' });
    }

    const entry = await (prisma as any).guestbookEntry.findUnique({
      where: { id: entryId },
      include: {
        event: true,
      },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }

    if (entry.event.deletedAt || entry.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check permissions
    if (req.userId !== entry.event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }

    const updatedEntry = await (prisma as any).guestbookEntry.update({
      where: { id: entryId },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
      },
    });

    res.json(serializeBigInt({ entry: updatedEntry }));
  } catch (error) {
    logger.error('Fehler beim Aktualisieren des Eintrags:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Delete entry (Admin only)
router.delete('/guestbook/:entryId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { entryId } = req.params;

    const entry = await (prisma as any).guestbookEntry.findUnique({
      where: { id: entryId },
      include: {
        event: true,
      },
    });

    if (!entry) {
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }

    if (entry.event.deletedAt || entry.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check permissions
    if (req.userId !== entry.event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }

    await (prisma as any).guestbookEntry.delete({
      where: { id: entryId },
    });

    res.json({ message: 'Eintrag gelöscht' });
  } catch (error) {
    logger.error('Fehler beim Löschen des Eintrags:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Upload photo for guestbook entry
router.post(
  '/:eventId/guestbook/upload-photo',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  attachEventUploadRateLimits,
  photoUploadIpLimiter,
  photoUploadEventLimiter,
  upload.single('photo'),
  validateUploadedFile('image'),
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Foto hochgeladen' });
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        featuresConfig: true,
        hostId: true,
        dateTime: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const featuresConfig = event.featuresConfig as any;
    const guestbookEnabled = featuresConfig?.allowGuestbook !== false;
    if (!guestbookEnabled) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const datePolicy = (featuresConfig as any)?.uploadDatePolicy;
    const datePolicyEnabled = datePolicy?.enabled !== false;
    const datePolicyToleranceRaw = Number(datePolicy?.toleranceDays);
    const datePolicyToleranceDays = Number.isFinite(datePolicyToleranceRaw) && datePolicyToleranceRaw >= 0
      ? Math.min(7, Math.floor(datePolicyToleranceRaw))
      : 1;

    if (event.dateTime && datePolicyEnabled) {
      const uploadTime = new Date();
      const capturedAtResult = await extractCapturedAtFromImage(req.file.buffer, uploadTime);
      const ok = isWithinDateWindowPlusMinusDays({
        capturedAt: capturedAtResult.capturedAt,
        referenceDateTime: event.dateTime,
        toleranceDays: datePolicyToleranceDays,
      });

      if (!ok) {
        return res.status(400).json({
          error: 'Aufnahmedatum passt nicht zum Event (±1 Tag)',
        });
      }
    }

    // Process image
    const processed = await imageProcessor.processImage(req.file.buffer);

    const uploadBytes = BigInt(processed.optimized.length);
    try {
      await assertUploadWithinLimit(eventId, uploadBytes);
    } catch (e: any) {
      if (e?.httpStatus) {
        return res.status(e.httpStatus).json({ error: 'Speicherlimit erreicht' });
      }
      throw e;
    }

    // Upload to storage
    const storagePath = await storageService.uploadFile(
      eventId,
      req.file.originalname,
      processed.optimized,
      req.file.mimetype,
      undefined,
      undefined,
      event.hostId
    );

    // Track pending upload so it counts toward storage usage and can be claimed by the entry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    await cleanupExpiredGuestbookPhotoUploads(eventId, now);
    const pending = await (prisma as any).guestbookPhotoUpload.create({
      data: {
        eventId,
        storagePath,
        sizeBytes: uploadBytes,
        expiresAt,
      },
      select: { id: true },
    });

    // Generate proxy URL (will be used when entry is created)
    // Don't use direct SeaweedFS URL to avoid localhost:8333 issues
    // Generate absolute URL for frontend compatibility
    // Use relative proxy route (works with Nginx)
    const photoUrl = `/api/events/${eventId}/guestbook/photo/${encodeURIComponent(storagePath)}`;

    res.json({ photoUrl, storagePath, uploadId: pending.id, photoSizeBytes: uploadBytes.toString() });
  } catch (error: any) {
    logger.error('Fehler beim Hochladen des Fotos', {
      message: getErrorMessage(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Upload audio for guestbook entry
router.post(
  '/:eventId/guestbook/upload-audio',
  optionalAuthMiddleware,
  requireEventAccess((req) => (req as any).params.eventId),
  attachEventUploadRateLimits,
  photoUploadIpLimiter,
  photoUploadEventLimiter,
  audioUpload.single('audio'),
  validateUploadedFile('audio'),
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Kein Audio hochgeladen' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        featuresConfig: true,
        hostId: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const featuresConfig = event.featuresConfig as any;
    const guestbookEnabled = featuresConfig?.allowGuestbook !== false;
    if (!guestbookEnabled) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const durationMsRaw = (req.body as any)?.durationMs;
    const durationMsParsed =
      durationMsRaw === undefined || durationMsRaw === null || durationMsRaw === ''
        ? null
        : Number(durationMsRaw);
    const durationMs = Number.isFinite(durationMsParsed) && durationMsParsed !== null
      ? Math.max(0, Math.floor(durationMsParsed))
      : null;
    if (durationMs !== null && durationMs > 60_000) {
      return res.status(400).json({ error: 'Audio ist zu lang (max. 60 Sekunden)' });
    }

    const uploadBytes = BigInt(req.file.buffer.length);
    try {
      await assertUploadWithinLimit(eventId, uploadBytes);
    } catch (e: any) {
      if (e?.httpStatus) {
        return res.status(e.httpStatus).json({ error: 'Speicherlimit erreicht' });
      }
      throw e;
    }

    const storagePath = await storageService.uploadFile(
      eventId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      undefined,
      undefined,
      event.hostId
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    await cleanupExpiredGuestbookAudioUploads(eventId, now);
    const pending = await (prisma as any).guestbookAudioUpload.create({
      data: {
        eventId,
        storagePath,
        mimeType: req.file.mimetype,
        sizeBytes: uploadBytes,
        durationMs,
        expiresAt,
      },
      select: { id: true },
    });

    const audioUrl = `/api/events/${eventId}/guestbook/audio/${encodeURIComponent(storagePath)}`;
    res.json({
      audioUrl,
      storagePath,
      uploadId: pending.id,
      audioSizeBytes: uploadBytes.toString(),
      audioMimeType: req.file.mimetype,
      audioDurationMs: durationMs,
    });
  } catch (error: any) {
    logger.error('Fehler beim Hochladen des Audios', {
      message: getErrorMessage(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Update host message (Host only)
const updateHostMessageSchema = z.object({
  message: z.string().max(2000, 'Nachricht zu lang').optional().nullable(),
});

router.put('/:eventId/guestbook/host-message', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const data = updateHostMessageSchema.parse(req.body);

    // Check if event exists and user is host
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        hostId: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (req.userId !== event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: {
        guestbookHostMessage: data.message || null,
      },
      select: {
        guestbookHostMessage: true,
      },
    });

    res.json({ hostMessage: updated.guestbookHostMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Fehler beim Aktualisieren der Host-Nachricht', {
      message: getErrorMessage(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Proxy route for guestbook photos (similar to design-image route)
// This avoids localhost:8333 issues by serving files through the API
router.get(
  '/:eventId/guestbook/photo/:storagePath(*)',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, storagePath } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true, featuresConfig: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Access control: host JWT OR event access cookie (404-on-unauthorized)
    const isHost = !!req.userId && req.userId === event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (!storagePath) {
      return res.status(400).json({ error: 'Storage path fehlt' });
    }

    const enforceVirusScan =
      process.env.VIRUS_SCAN_ENFORCE === 'true' ||
      (event.featuresConfig as any)?.virusScan?.enforce === true;
    if (enforceVirusScan) {
      const photo = await prisma.photo.findFirst({
        where: {
          eventId,
          storagePath,
          deletedAt: null,
          status: { not: 'DELETED' },
        },
        select: {
          exifData: true,
        },
      });

      const scanStatus = (photo?.exifData as any)?.scanStatus;
      if (!photo || (scanStatus && scanStatus !== 'CLEAN')) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }
    }

    try {
      // Get file from SeaweedFS
      const fileBuffer = await storageService.getFile(storagePath);

      // Determine content type from storage path
      const contentType = storagePath.endsWith('.webp') 
        ? 'image/webp'
        : storagePath.endsWith('.jpg') || storagePath.endsWith('.jpeg')
        ? 'image/jpeg'
        : storagePath.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg'; // Default

      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Send file
      res.send(fileBuffer);
    } catch (error: any) {
      logger.error('Fehler beim Abrufen des Fotos', {
        message: getErrorMessage(error),
        eventId,
        storagePath,
      });
      res.status(404).json({ error: 'Foto nicht gefunden' });
    }
  } catch (error: any) {
    logger.error('Fehler beim Abrufen des Gästebuch-Fotos', {
      message: getErrorMessage(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



