import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Get active stories for an event
router.get(
  '/:eventId/stories',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const now = new Date();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isHost = req.userId && req.userId === event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Stories nicht gefunden' });
    }

    const stories = await prisma.story.findMany({
      where: {
        eventId,
        isActive: true,
        expiresAt: {
          gt: now, // Only not expired
        },
      },
      include: {
        photo: {
          select: {
            id: true,
            url: true,
            uploadedBy: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ stories });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Stories', {
      message: (error as any)?.message || String(error),
      eventId: req.params.eventId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create story from photo (Gast entscheidet)
router.post(
  '/:photoId/story',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { photoId } = req.params;
    const { isActive = true } = req.body; // Gast kann Story aktivieren/deaktivieren

    // Check if photo exists
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        event: true,
      },
    });

    if (!photo) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.deletedAt || photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    if (photo.event.deletedAt || photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const eventId = photo.eventId;
    const isHost = req.userId && req.userId === photo.event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Foto nicht gefunden' });
    }

    // Check if photo is approved
    if (photo.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Nur freigegebene Fotos können als Story verwendet werden' });
    }

    // Check if story already exists
    const existingStory = await prisma.story.findFirst({
      where: {
        photoId,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
    });

    if (existingStory) {
      // Update existing story
      const updatedStory = await prisma.story.update({
        where: { id: existingStory.id },
        data: {
          isActive,
        },
        include: {
          photo: {
            select: {
              id: true,
              url: true,
              uploadedBy: true,
            },
          },
        },
      });

      return res.json({ story: updatedStory });
    }

    // Create new story (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        eventId: photo.eventId,
        photoId,
        isActive,
        expiresAt,
      },
      include: {
        photo: {
          select: {
            id: true,
            url: true,
            uploadedBy: true,
          },
        },
      },
    });

    res.status(201).json({ story });
  } catch (error) {
    logger.error('Fehler beim Erstellen der Story', {
      message: (error as any)?.message || String(error),
      photoId: req.params.photoId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Update story (activate/deactivate)
router.put(
  '/:storyId',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { storyId } = req.params;
    const { isActive } = req.body;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        photo: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!story) {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    if (story.photo?.deletedAt || story.photo?.status === 'DELETED') {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    if (story.photo?.event?.deletedAt || story.photo?.event?.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const eventId = story.photo.eventId;
    const isHost = req.userId && req.userId === story.photo.event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    const updatedStory = await prisma.story.update({
      where: { id: storyId },
      data: {
        isActive: isActive !== undefined ? isActive : story.isActive,
      },
      include: {
        photo: {
          select: {
            id: true,
            url: true,
            uploadedBy: true,
          },
        },
      },
    });

    res.json({ story: updatedStory });
  } catch (error) {
    logger.error('Fehler beim Aktualisieren der Story', {
      message: (error as any)?.message || String(error),
      storyId: req.params.storyId,
    });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Track story view
router.post(
  '/:storyId/view',
  optionalAuthMiddleware,
  async (req: AuthRequest, res: Response) => {
  try {
    const { storyId } = req.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: {
        photo: {
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
        },
      },
    });

    if (!story || !story.photo) {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    if (story.photo.deletedAt || story.photo.status === 'DELETED') {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    if (story.photo.event.deletedAt || story.photo.event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const eventId = story.photo.eventId;
    const isHost = req.userId && req.userId === story.photo.event.hostId;
    if (!isHost && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Story nicht gefunden' });
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    res.json({ message: 'View gezählt' });
  } catch (error) {
    logger.error('Fehler beim Zählen der Story-Views:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

export default router;



