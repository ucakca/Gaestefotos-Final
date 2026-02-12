import { Router, Response } from 'express';
import multer from 'multer';
import { io } from '../index';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { imageProcessor } from '../services/imageProcessor';
import { addLogoOverlay } from '../services/logoOverlay';
import { mosaicEngine } from '../services/mosaicEngine';
import { serializeBigInt } from '../utils/serializers';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

// ─── GET Hashtag Config ─────────────────────────────────────────────────────

router.get('/:eventId/hashtag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const hasAccess = await hasEventManageAccess(req, eventId);
    if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { featuresConfig: true, slug: true },
    });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    const config = (event.featuresConfig as any) || {};

    res.json({
      hashtagEnabled: config.hashtagEnabled ?? true,
      hashtagText: config.hashtagText || `#gästefotos`,
      hashtagLogoOverlay: config.hashtagLogoOverlay ?? true,
      eventSlug: event.slug,
    });
  } catch (err) {
    logger.error('Get hashtag config error', { error: (err as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Hashtag-Konfiguration' });
  }
});

// ─── UPDATE Hashtag Config ──────────────────────────────────────────────────

router.put('/:eventId/hashtag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const hasAccess = await hasEventManageAccess(req, eventId);
    if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { featuresConfig: true },
    });
    if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

    const config = (event.featuresConfig as any) || {};
    const { hashtagEnabled, hashtagText, hashtagLogoOverlay } = req.body;

    if (hashtagEnabled !== undefined) config.hashtagEnabled = Boolean(hashtagEnabled);
    if (hashtagText !== undefined) {
      // Sanitize: ensure starts with #, no spaces, lowercase
      let tag = String(hashtagText).trim();
      if (!tag.startsWith('#')) tag = '#' + tag;
      tag = tag.replace(/\s+/g, '').toLowerCase();
      config.hashtagText = tag;
    }
    if (hashtagLogoOverlay !== undefined) config.hashtagLogoOverlay = Boolean(hashtagLogoOverlay);

    await prisma.event.update({
      where: { id: eventId },
      data: { featuresConfig: config },
    });

    res.json({ success: true, config: {
      hashtagEnabled: config.hashtagEnabled,
      hashtagText: config.hashtagText,
      hashtagLogoOverlay: config.hashtagLogoOverlay,
    }});
  } catch (err) {
    logger.error('Update hashtag config error', { error: (err as Error).message });
    res.status(500).json({ error: 'Fehler beim Speichern der Hashtag-Konfiguration' });
  }
});

// ─── IMPORT Hashtag Photo ───────────────────────────────────────────────────
// Accepts a photo upload tagged as coming from a hashtag source.
// Always FREE — no feature gate required.
// Optionally adds gästefotos.com logo overlay.

router.post(
  '/:eventId/hashtag/import',
  authMiddleware,
  upload.single('photo'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const hasAccess = await hasEventManageAccess(req, eventId);
      if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

      const file = req.file;
      if (!file) return res.status(400).json({ error: 'Kein Bild hochgeladen' });

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { featuresConfig: true },
      });
      if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

      const config = (event.featuresConfig as any) || {};
      if (config.hashtagEnabled === false) {
        return res.status(403).json({ error: 'Hashtag-Import ist für dieses Event deaktiviert' });
      }

      let imageBuffer = file.buffer;

      // Apply logo overlay if enabled
      if (config.hashtagLogoOverlay !== false) {
        imageBuffer = await addLogoOverlay(imageBuffer);
      }

      // Process image (original, optimized, thumbnail)
      const processed = await imageProcessor.processImage(imageBuffer);

      const baseFilename = file.originalname.replace(/\.[^/.]+$/, '');
      const ext = file.originalname.match(/\.[^/.]+$/)?.[0] || '.jpg';

      const [storagePath, storagePathOriginal, storagePathThumb] = await Promise.all([
        storageService.uploadFile(eventId, `hashtag_${baseFilename}_opt${ext}`, processed.optimized, 'image/jpeg'),
        storageService.uploadFile(eventId, `hashtag_${baseFilename}_orig${ext}`, processed.original, file.mimetype),
        storageService.uploadFile(eventId, `hashtag_${baseFilename}_thumb${ext}`, processed.thumbnail, 'image/jpeg'),
      ]);

      const uploaderName = (req.body?.uploaderName || '').trim() || config.hashtagText || '#gästefotos';

      const photo = await prisma.photo.create({
        data: {
          eventId,
          storagePath,
          storagePathOriginal,
          storagePathThumb,
          url: '',
          status: 'APPROVED',
          sizeBytes: file.size,
          uploadedBy: uploaderName,
          tags: ['hashtag-import', config.hashtagText || '#gästefotos'],
        },
      });

      // Emit WebSocket event
      io.to(`event:${eventId}`).emit('photo_uploaded', {
        photo: serializeBigInt(photo),
      });

      // Mosaic auto-hook (same as regular uploads)
      prisma.mosaicWall.findUnique({
        where: { eventId },
        select: { id: true, status: true },
      }).then(async (wall) => {
        if (wall?.status === 'ACTIVE') {
          try {
            const photoBuffer = await storageService.getFile(storagePath);
            const result = await mosaicEngine.placePhoto(wall.id, photo.id, photoBuffer, 'SMARTPHONE');
            if (result) {
              io.to(`event:${eventId}`).emit('mosaic_tile_placed', {
                tileId: result.tileId,
                position: result.position,
                printNumber: result.printNumber,
                photoId: photo.id,
              });
            }
          } catch (err: any) {
            logger.warn('Hashtag mosaic auto-place failed', { error: err.message, eventId, photoId: photo.id });
          }
        }
      }).catch(() => {});

      logger.info('Hashtag photo imported', { eventId, photoId: photo.id, hashtag: config.hashtagText });

      res.status(201).json({
        photo: serializeBigInt(photo),
        logoOverlayApplied: config.hashtagLogoOverlay !== false,
      });
    } catch (err) {
      logger.error('Hashtag import error', { error: (err as Error).message });
      res.status(500).json({ error: 'Fehler beim Hashtag-Import' });
    }
  }
);

// ─── GET Hashtag Import Stats ───────────────────────────────────────────────

router.get('/:eventId/hashtag/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const hasAccess = await hasEventManageAccess(req, eventId);
    if (!hasAccess) return res.status(403).json({ error: 'Kein Zugriff' });

    const count = await prisma.photo.count({
      where: {
        eventId,
        tags: { has: 'hashtag-import' },
        deletedAt: null,
      },
    });

    res.json({ hashtagPhotoCount: count });
  } catch (err) {
    logger.error('Hashtag stats error', { error: (err as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Hashtag-Statistiken' });
  }
});

export default router;
