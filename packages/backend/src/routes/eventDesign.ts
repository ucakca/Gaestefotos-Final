import { Router, Response } from 'express';
import archiver from 'archiver';
import multer from 'multer';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware, hasEventAccess, isPrivilegedRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';
import { storageService } from '../services/storage';
import { getEventStorageEndsAt } from '../services/storagePolicy';
import { requireEventEditAccess } from './eventHelpers';

const router = Router();

const designUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (aligned with Nginx)
  fileFilter: (_req, file, cb) => {
    if (file.mimetype?.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt'));
    }
  },
});

const uploadSingleDesignImage = (fieldName: string) => (req: AuthRequest, res: Response, next: any) => {
  designUpload.single(fieldName)(req as any, res as any, (err: any) => {
    if (!err) return next();
    const code = (err as any)?.code;
    if (code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Datei zu groß. Maximum: 50MB' });
    }
    return res.status(400).json({ error: (err as any)?.message || String(err) });
  });
};

// Design cover image upload
router.post('/:id/design/cover', authMiddleware, uploadSingleDesignImage('file'), async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const coverUrl = await storageService.uploadFile(
      eventId, 
      `cover-${Date.now()}-${req.file.originalname}`, 
      req.file.buffer, 
      req.file.mimetype
    );
    
    const designConfig = (event.designConfig as any) || {};
    await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          coverImage: coverUrl,
        },
      },
    });

    return res.json({ coverUrl });
  } catch (error) {
    logger.error('Cover upload error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Cover upload failed' });
  }
});

// Design profile image upload
router.post('/:id/design/profile', authMiddleware, uploadSingleDesignImage('file'), async (req: AuthRequest, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await requireEventEditAccess(req, res, eventId);
    if (!event) return;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const profileUrl = await storageService.uploadFile(
      eventId, 
      `profile-${Date.now()}-${req.file.originalname}`, 
      req.file.buffer, 
      req.file.mimetype
    );
    
    const designConfig = (event.designConfig as any) || {};
    await prisma.event.update({
      where: { id: eventId },
      data: {
        designConfig: {
          ...designConfig,
          profileImage: profileUrl,
        },
      },
    });

    return res.json({ profileUrl });
  } catch (error) {
    logger.error('Profile upload error', { message: getErrorMessage(error), eventId: req.params.id });
    return res.status(500).json({ error: 'Profile upload failed' });
  }
});

// Download all photos as ZIP
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
      logger.error('Download zip error', { message: getErrorMessage(error) });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Design image proxy (cover, profile, logo)
router.get('/:eventId/design-image/:kind/*', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, kind } = req.params;
    const storagePath = req.params[0] || '';
    if (!['profile', 'cover', 'logo'].includes(kind)) {
      return res.status(404).json({ error: 'Nicht gefunden' });
    }

    const decoded = decodeURIComponent(storagePath);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true },
    });

    if (!event || event.deletedAt) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const buf = await storageService.getFile(decoded);
    const ext = (decoded.split('.').pop() || '').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buf);
  } catch (error) {
    logger.error('Design image proxy error', { message: getErrorMessage(error) });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Design file proxy (generic)
router.get('/:eventId/design/file/*', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const storagePath = req.params[0] || '';
    const decoded = decodeURIComponent(storagePath);

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, deletedAt: true },
    });

    if (!event || event.deletedAt) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const buf = await storageService.getFile(decoded);
    const ext = (decoded.split('.').pop() || '').toLowerCase();
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(buf);
  } catch (error) {
    logger.error('Design asset proxy error', { message: getErrorMessage(error) });
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Logo upload
router.post(
  '/:id/logo',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      const event = await requireEventEditAccess(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design-image/logo/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, logoUrl: url, logoStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload logo error', { message: getErrorMessage(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Profile image upload (wizard)
router.post(
  '/:id/upload-profile-image',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      const event = await requireEventEditAccess(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design/file/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, profileImage: url, profileImageStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload profile image error', { message: getErrorMessage(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Cover image upload (wizard)
router.post(
  '/:id/upload-cover-image',
  authMiddleware,
  uploadSingleDesignImage('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const eventId = req.params.id;

      const event = await requireEventEditAccess(req, res, eventId);
      if (!event) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Kein Bild hochgeladen' });
      }

      const storagePath = await storageService.uploadFile(eventId, file.originalname, file.buffer, file.mimetype);
      const url = `/api/events/${eventId}/design/file/${encodeURIComponent(storagePath)}`;

      const designConfig = (event.designConfig as any) || {};
      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { designConfig: { ...designConfig, coverImage: url, coverImageStoragePath: storagePath } },
      });

      return res.status(200).json({ ok: true, event: updated });
    } catch (error) {
      logger.error('Upload cover image error', { message: getErrorMessage(error), eventId: req.params.id });
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;
