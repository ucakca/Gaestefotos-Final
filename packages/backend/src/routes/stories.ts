import { Router, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest, hasEventAccess, optionalAuthMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const storyInclude = {
  photo: {
    select: {
      id: true,
      url: true,
      uploadedBy: true,
      createdAt: true,
    },
  },
  video: {
    select: {
      id: true,
      url: true,
      uploadedBy: true,
      createdAt: true,
      duration: true,
    },
  },
} as const;

const withProxyUrls = (s: any) => {
  if (s?.photo?.id) {
    return {
      ...s,
      photo: {
        ...s.photo,
        url: `/api/photos/${s.photo.id}/file`,
      },
    };
  }

  if (s?.video?.id) {
    return {
      ...s,
      video: {
        ...s.video,
        url: `/api/videos/${s.video.id}/file`,
      },
    };
  }

  return s;
};

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
            gt: now,
          },
        },
        include: storyInclude,
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ stories: stories.map(withProxyUrls) });
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
      const { isActive = true } = req.body;

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

      if (photo.status !== 'APPROVED') {
        return res.status(400).json({ error: 'Nur freigegebene Fotos können als Story verwendet werden' });
      }

      const existingStory = await prisma.story.findFirst({
        where: {
          photoId,
          expiresAt: {
            gt: new Date(),
          },
        },
        select: { id: true },
      });

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = await prisma.$transaction(async (tx) => {
        await tx.photo.update({
          where: { id: photoId },
          data: { isStoryOnly: true },
        });

        if (existingStory?.id) {
          return tx.story.update({
            where: { id: existingStory.id },
            data: { isActive },
            include: storyInclude,
          });
        }

        return tx.story.create({
          data: {
            eventId: photo.eventId,
            photoId,
            isActive,
            expiresAt,
          },
          include: storyInclude,
        });
      });

      const status = existingStory?.id ? 200 : 201;
      res.status(status).json({ story: withProxyUrls(story) });
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
          video: {
            include: {
              event: true,
            },
          },
        },
      });

      if (!story) {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      const storyMedia = story.photo ?? story.video;
      const storyEvent = story.photo?.event ?? story.video?.event;

      if (!storyMedia || !storyEvent) {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      if ((storyMedia as any).deletedAt || (storyMedia as any).status === 'DELETED') {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      if (storyEvent.deletedAt || storyEvent.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const eventId = storyEvent.id;
      const isHost = req.userId && req.userId === storyEvent.hostId;
      if (!isHost && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      const updatedStory = await prisma.story.update({
        where: { id: storyId },
        data: {
          isActive: isActive !== undefined ? isActive : story.isActive,
        },
        include: storyInclude,
      });

      res.json({ story: withProxyUrls(updatedStory) });
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
          video: {
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

      if (!story) {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      const storyMedia = story.photo ?? story.video;
      const storyEvent = story.photo?.event ?? story.video?.event;

      if (!storyMedia || !storyEvent) {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      if ((storyMedia as any).deletedAt || (storyMedia as any).status === 'DELETED') {
        return res.status(404).json({ error: 'Story nicht gefunden' });
      }

      if (storyEvent.deletedAt || storyEvent.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const eventId = storyEvent.id;
      const isHost = req.userId && req.userId === storyEvent.hostId;
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



