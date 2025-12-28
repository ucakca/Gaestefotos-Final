import { Router, Response } from 'express';
import prisma from '../config/database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get all duplicate groups for an event (Admin only)
router.get('/:eventId/duplicates', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if user is host
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (req.userId !== event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Get all photos with duplicate groups (limit fields to avoid leaking storage paths/hashes)
    const photosWithDuplicates = await prisma.photo.findMany({
      where: {
        eventId,
        deletedAt: null,
        duplicateGroupId: {
          not: null,
        },
        status: {
          not: 'DELETED',
        },
      },
      select: {
        id: true,
        url: true,
        status: true,
        createdAt: true,
        duplicateGroupId: true,
        isBestInGroup: true,
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
        _count: {
          select: {
            likes: true,
            comments: true,
            votes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by duplicateGroupId
    const groups: Record<string, typeof photosWithDuplicates> = {};
    for (const photo of photosWithDuplicates) {
      if (photo.duplicateGroupId) {
        if (!groups[photo.duplicateGroupId]) {
          groups[photo.duplicateGroupId] = [];
        }
        groups[photo.duplicateGroupId].push(photo);
      }
    }

    // Format response
    const duplicateGroups = Object.entries(groups).map(([groupId, photos]) => ({
      groupId,
      photos,
      bestPhoto: photos.find(p => p.isBestInGroup) || photos[0],
      count: photos.length,
    }));

    res.json({ duplicateGroups });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Duplikate:', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Set best photo in a duplicate group (Admin only)
router.post('/:eventId/duplicates/:groupId/best', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, groupId } = req.params;
    const { photoId } = req.body;

    // Check if user is host
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (req.userId !== event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Verify photo belongs to this group
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        eventId,
        duplicateGroupId: groupId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht in dieser Duplikat-Gruppe gefunden' });
    }

    // Reset all photos in group
    await prisma.photo.updateMany({
      where: {
        eventId,
        duplicateGroupId: groupId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
      data: {
        isBestInGroup: false,
      },
    });

    // Set new best photo
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        isBestInGroup: true,
      },
    });

    // Invalidate cache
    const { cache } = await import('../services/cache');
    await cache.delPattern(`photos:${eventId}:*`);

    res.json({ message: 'Beste Foto aktualisiert', photoId });
  } catch (error) {
    logger.error('Fehler beim Setzen des besten Fotos:', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Delete duplicates in a group (Admin only)
router.delete('/:eventId/duplicates/:groupId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, groupId } = req.params;
    const { keepPhotoId } = req.body; // Photo to keep, delete others

    // Check if user is host
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    if (req.userId !== event.hostId && req.userRole !== 'ADMIN') {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    // Get all photos in group
    const photosInGroup = await prisma.photo.findMany({
      where: {
        eventId,
        duplicateGroupId: groupId,
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    });

    if (photosInGroup.length === 0) {
      return res.status(404).json({ error: 'Keine Fotos in dieser Gruppe gefunden' });
    }

    // Always keep exactly one photo (avoid accidental deletion of all photos)
    const best = photosInGroup.find((p) => p.isBestInGroup);
    const resolvedKeepPhotoId = keepPhotoId || best?.id || photosInGroup[0].id;
    const photosToDelete = photosInGroup.filter((p) => p.id !== resolvedKeepPhotoId);

    const now = new Date();

    if (photosToDelete.length > 0) {
      await prisma.photo.updateMany({
        where: {
          id: { in: photosToDelete.map((p) => p.id) },
          eventId,
        },
        data: {
          status: 'DELETED',
          deletedAt: now,
          purgeAfter: null,
          duplicateGroupId: null,
          isBestInGroup: false,
        },
      });
    }

    // If only one photo left, remove duplicate group
    const remainingPhotos = photosInGroup.filter((p) => p.id === resolvedKeepPhotoId);
    if (remainingPhotos.length === 1) {
      await prisma.photo.update({
        where: { id: remainingPhotos[0].id },
        data: {
          duplicateGroupId: null,
          isBestInGroup: false,
        },
      });
    }

    // Invalidate cache
    const { cache } = await import('../services/cache');
    await cache.delPattern(`photos:${eventId}:*`);

    res.json({ 
      message: `${photosToDelete.length} Duplikat(e) gelöscht`,
      deleted: photosToDelete.length,
    });
  } catch (error) {
    logger.error('Fehler beim Löschen der Duplikate:', { error });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



