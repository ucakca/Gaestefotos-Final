import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import { storageService } from '../services/storage';

const router = Router();

// ─── Storage Stats für ein Event ──────────────────────────────────────────────

router.get('/storage-stats/:eventId', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, slug: true },
    });
    if (!event) {
      return res.status(404).json({ ok: false, error: 'Event nicht gefunden' });
    }

    const [photoStats, videoStats] = await Promise.all([
      prisma.photo.aggregate({
        where: { eventId },
        _count: true,
        _sum: { sizeBytes: true },
      }),
      prisma.video.aggregate({
        where: { eventId },
        _count: true,
        _sum: { sizeBytes: true },
      }),
    ]);

    const totalPhotos = photoStats._count || 0;
    const totalVideos = videoStats._count || 0;
    const photoSizeBytes = Number(photoStats._sum?.sizeBytes || 0);
    const videoSizeBytes = Number(videoStats._sum?.sizeBytes || 0);
    const totalSizeBytes = photoSizeBytes + videoSizeBytes;

    return res.json({
      ok: true,
      event,
      stats: {
        totalPhotos,
        totalVideos,
        photoSizeBytes,
        videoSizeBytes,
        totalSizeBytes,
        totalSizeMB: Math.round(totalSizeBytes / 1024 / 1024 * 100) / 100,
      },
    });
  } catch (error: any) {
    logger.error('[admin] storage stats error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Foto-Proxy (Thumbnail) ───────────────────────────────────────────────────

router.get('/proxy/:photoId/thumb', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.photoId },
      select: { storagePathThumb: true, storagePath: true },
    });
    if (!photo) return res.status(404).json({ error: 'Not found' });

    const path = photo.storagePathThumb || photo.storagePath;
    if (!path) return res.status(404).json({ error: 'No file' });

    const buffer = await storageService.getFile(path);
    const ext = path.split('.').pop()?.toLowerCase() || 'jpg';
    const ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  } catch (error: any) {
    logger.error('[admin] proxy thumb error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/proxy/:photoId/original', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const photo = await prisma.photo.findUnique({
      where: { id: req.params.photoId },
      select: { storagePathOriginal: true, storagePath: true },
    });
    if (!photo) return res.status(404).json({ error: 'Not found' });

    const path = photo.storagePathOriginal || photo.storagePath;
    if (!path) return res.status(404).json({ error: 'No file' });

    const buffer = await storageService.getFile(path);
    const ext = path.split('.').pop()?.toLowerCase() || 'jpg';
    const ct = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(buffer);
  } catch (error: any) {
    logger.error('[admin] proxy original error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Fotos eines Events mit Proxy-URLs laden ──────────────────────────────────

router.get('/event/:eventId', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string | undefined;

    const where: any = { eventId };
    if (status === 'pending') where.status = 'PENDING';
    else if (status === 'approved') where.status = 'APPROVED';
    else if (status === 'rejected') where.status = 'REJECTED';

    const [total, photos, event] = await Promise.all([
      prisma.photo.count({ where }),
      prisma.photo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          eventId: true,
          storagePath: true,
          storagePathThumb: true,
          storagePathOriginal: true,
          sizeBytes: true,
          status: true,
          uploadedBy: true,
          createdAt: true,
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, slug: true },
      }),
    ]);

    // Use proxy URLs instead of signed S3 URLs to avoid Mixed Content / CORS issues
    const photosWithUrls = photos.map((photo) => {
      const sizeBytes = photo.sizeBytes ? Number(photo.sizeBytes) : 0;
      const { sizeBytes: _sb, ...photoWithoutBigInt } = photo;
      return {
        ...photoWithoutBigInt,
        thumbnailUrl: `/api/admin/photos/proxy/${photo.id}/thumb`,
        mediumUrl: `/api/admin/photos/proxy/${photo.id}/thumb`,
        originalUrl: `/api/admin/photos/proxy/${photo.id}/original`,
        fileSize: sizeBytes,
        fileSizeMB: sizeBytes ? Math.round(sizeBytes / 1024 / 1024 * 100) / 100 : null,
      };
    });

    return res.json({ ok: true, event, total, photos: photosWithUrls });
  } catch (error: any) {
    logger.error('[admin] event photos error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Einzelnes Foto mit Download-URL ──────────────────────────────────────────

router.get('/:photoId', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: { select: { id: true, title: true, slug: true } },
        category: { select: { id: true, name: true } },
      },
    });

    if (!photo) {
      return res.status(404).json({ ok: false, error: 'Foto nicht gefunden' });
    }

    const sizeBytes = photo.sizeBytes ? Number(photo.sizeBytes) : 0;
    const { sizeBytes: _sb, ...photoWithoutBigInt } = photo;

    return res.json({
      ok: true,
      photo: {
        ...photoWithoutBigInt,
        thumbnailUrl: `/api/admin/photos/proxy/${photo.id}/thumb`,
        mediumUrl: `/api/admin/photos/proxy/${photo.id}/thumb`,
        originalUrl: `/api/admin/photos/proxy/${photo.id}/original`,
        fileSize: sizeBytes,
        fileSizeMB: sizeBytes ? Math.round(sizeBytes / 1024 / 1024 * 100) / 100 : null,
      },
    });
  } catch (error: any) {
    logger.error('[admin] get photo error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Download-Link für Original-Foto ──────────────────────────────────────────

router.get('/:photoId/download', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { id: true, storagePath: true },
    });

    if (!photo || !photo.storagePath) {
      return res.status(404).json({ ok: false, error: 'Foto nicht gefunden' });
    }

    // Use proxy URL for download (avoids Mixed Content)
    const downloadUrl = `/api/admin/photos/proxy/${photo.id}/original`;

    return res.json({ ok: true, downloadUrl });
  } catch (error: any) {
    logger.error('[admin] download photo error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const listSchema = z.object({
  q: z.string().optional(),
  eventId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

router.get('/', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'Ungültige Query Parameter' });
    }

    const { eventId, status, limit, offset } = parsed.data;
    const where: any = {};

    if (eventId) where.eventId = eventId;
    
    if (status === 'pending') {
      where.status = 'PENDING';
    } else if (status === 'approved') {
      where.status = 'APPROVED';
    } else if (status === 'rejected') {
      where.status = 'REJECTED';
    }

    const [total, photos] = await Promise.all([
      prisma.photo.count({ where }),
      prisma.photo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          eventId: true,
          createdAt: true,
          status: true,
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      }),
    ]);

    return res.json({ ok: true, total, photos });
  } catch (error: any) {
    logger.error('[admin] list photos error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bulk-moderate', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds, isApproved } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be non-empty array' });
    }

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ error: 'isApproved must be boolean' });
    }

    const result = await prisma.photo.updateMany({
      where: {
        id: { in: photoIds },
      },
      data: {
        status: isApproved ? 'APPROVED' : 'REJECTED',
      },
    });

    logger.info('[admin] bulk moderate photos', {
      adminUserId: req.userId,
      count: result.count,
      status: isApproved ? 'APPROVED' : 'REJECTED',
    });

    return res.json({ ok: true, count: result.count });
  } catch (error: any) {
    logger.error('[admin] bulk moderate error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bulk-delete', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ error: 'photoIds must be non-empty array' });
    }

    const result = await prisma.photo.deleteMany({
      where: {
        id: { in: photoIds },
      },
    });

    logger.info('[admin] bulk delete photos', {
      adminUserId: req.userId,
      count: result.count,
    });

    return res.json({ ok: true, count: result.count });
  } catch (error: any) {
    logger.error('[admin] bulk delete error', { message: error?.message || String(error) });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
