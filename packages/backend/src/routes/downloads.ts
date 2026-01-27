import { Router, Response } from 'express';
import archiver from 'archiver';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import { PassThrough } from 'stream';

const router = Router();

const bulkDownloadSchema = z.object({
  photoIds: z.array(z.string().uuid()).optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  includeVideos: z.boolean().optional().default(false),
});

/**
 * Bulk Download Photos as ZIP (Stream-based)
 * Supports filtering by photoIds, category, or date range
 */
router.post('/events/:eventId/download/zip', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const filters = bulkDownloadSchema.parse(req.body);

    // Check access
    const hasAccess = await hasEventManageAccess(req, eventId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { 
        id: true, 
        title: true, 
        slug: true, 
        deletedAt: true,
        featuresConfig: true,
      },
    });

    if (!event || event.deletedAt) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Check if downloads are allowed
    const featuresConfig = event.featuresConfig as any;
    if (featuresConfig?.allowDownloads === false && req.userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Downloads sind für dieses Event deaktiviert' });
    }

    // Build photo query
    const photoWhere: any = {
      eventId,
      status: 'APPROVED',
    };

    if (filters.photoIds && filters.photoIds.length > 0) {
      photoWhere.id = { in: filters.photoIds };
    }

    if (filters.categoryId) {
      photoWhere.categoryId = filters.categoryId;
    }

    if (filters.dateFrom || filters.dateTo) {
      photoWhere.takenAt = {};
      if (filters.dateFrom) photoWhere.takenAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) photoWhere.takenAt.lte = new Date(filters.dateTo);
    }

    // Fetch photos
    const photos = await prisma.photo.findMany({
      where: photoWhere,
      select: {
        id: true,
        storagePath: true,
        url: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (photos.length === 0) {
      return res.status(404).json({ error: 'Keine Fotos gefunden' });
    }

    // Log download
    logger.info('[downloads] Bulk download started', {
      eventId,
      userId: req.userId,
      photoCount: photos.length,
      filters,
    });

    // Set response headers for streaming ZIP
    const zipFilename = `${event.slug || event.id}-photos-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 6 }, // Compression level (0-9)
    });

    // Pipe archive to response
    archive.pipe(res);

    // Handle archiver errors
    archive.on('error', (err) => {
      logger.error('[downloads] Archive error', {
        error: err.message,
        eventId,
        userId: req.userId,
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Fehler beim Erstellen des ZIP-Archivs' });
      }
    });

    // Add photos to archive
    let addedCount = 0;
    let errorCount = 0;

    for (const photo of photos) {
      try {
        // Fetch file from storage
        const fileBuffer = await storageService.getFile(photo.storagePath);
        const fileStream = Buffer.isBuffer(fileBuffer) ? fileBuffer : null;
        
        if (fileStream) {
          // Use original filename with counter to avoid duplicates
          const safeFilename = `photo-${photo.id}.jpg`;
          const uniqueFilename = `${String(addedCount + 1).padStart(4, '0')}_${safeFilename}`;
          
          archive.append(fileStream, { name: uniqueFilename });
          addedCount++;
        }
      } catch (err) {
        logger.error('[downloads] Failed to add photo to archive', {
          photoId: photo.id,
          error: (err as Error).message,
        });
        errorCount++;
      }
    }

    // Finalize archive (triggers 'end' event)
    await archive.finalize();

    logger.info('[downloads] Bulk download completed', {
      eventId,
      userId: req.userId,
      addedCount,
      errorCount,
      totalRequested: photos.length,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('[downloads] Bulk download error', {
      error: (error as Error).message,
      eventId: req.params.eventId,
      userId: req.userId,
    });
    
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Fehler beim Download' });
    }
  }
});

/**
 * Get download statistics for an event
 */
router.get('/events/:eventId/download/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    const hasAccess = await hasEventManageAccess(req, eventId);
    if (!hasAccess) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const totalPhotos = await prisma.photo.count({
      where: {
        eventId,
        status: 'APPROVED',
      },
    });

    const totalVideos = await prisma.video.count({
      where: {
        eventId,
        status: 'APPROVED',
      },
    });

    const totalSize = await prisma.photo.aggregate({
      where: {
        eventId,
        status: 'APPROVED',
      },
      _sum: {
        sizeBytes: true,
      },
    });

    const categories = await prisma.category.findMany({
      where: { eventId },
      include: {
        _count: {
          select: {
            photos: {
              where: { status: 'APPROVED' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json({
      totalPhotos,
      totalVideos,
      totalSizeBytes: totalSize._sum.sizeBytes ? Number(totalSize._sum.sizeBytes) : 0,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        photoCount: cat._count.photos,
      })),
    });
  } catch (error) {
    logger.error('[downloads] Stats error', {
      error: (error as Error).message,
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

export default router;
