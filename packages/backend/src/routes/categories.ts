import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware, hasEventAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schema
const createCategorySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  iconKey: z.string().nullable().optional(),
  order: z.number().int().default(0),
  isVisible: z.boolean().default(true),
  uploadLocked: z.boolean().default(false),
  uploadLockUntil: z.string().datetime().nullable().optional(),
  challengeEnabled: z.boolean().default(false),
  challengeDescription: z.string().nullable().optional(),
  dateTime: z.string().datetime().nullable().optional(),
  locationName: z.string().nullable().optional(),
});

// Get all categories for an event
router.get(
  '/:eventId/categories',
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
    const { public: isPublic } = req.query; // If public=true, only return visible categories

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const where: any = { eventId };
    if (isPublic === 'true') {
      where.isVisible = true;
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({ categories });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Kategorien', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create category
router.post(
  '/:eventId/categories',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const data = createCategorySchema.parse(req.body);

      // Check if event exists and user owns it
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const category = await prisma.category.create({
        data: {
          eventId,
          name: data.name,
          iconKey: data.iconKey ?? null,
          order: data.order,
          isVisible: data.isVisible ?? true,
          uploadLocked: data.uploadLocked ?? false,
          uploadLockUntil: data.uploadLockUntil ? new Date(data.uploadLockUntil) : null,
          challengeEnabled: data.challengeEnabled ?? false,
          challengeDescription: data.challengeDescription || null,
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          locationName: data.locationName || null,
        },
      });

      res.status(201).json({ category });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Fehler beim Erstellen der Kategorie', { message: (error as any)?.message || String(error) });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Update category
router.put(
  '/:eventId/categories/:categoryId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, categoryId } = req.params;
      const data = createCategorySchema.partial().parse(req.body);

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.iconKey !== undefined) updateData.iconKey = data.iconKey;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
      if (data.uploadLocked !== undefined) updateData.uploadLocked = data.uploadLocked;
      if (data.uploadLockUntil !== undefined) {
        updateData.uploadLockUntil = data.uploadLockUntil ? new Date(data.uploadLockUntil) : null;
      }
      if (data.challengeEnabled !== undefined) updateData.challengeEnabled = data.challengeEnabled;
      if (data.challengeDescription !== undefined) updateData.challengeDescription = data.challengeDescription || null;
      if (data.dateTime !== undefined) updateData.dateTime = data.dateTime ? new Date(data.dateTime) : null;
      if (data.locationName !== undefined) updateData.locationName = data.locationName || null;

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
      });

      res.json({ category });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Fehler beim Aktualisieren der Kategorie', { message: (error as any)?.message || String(error), eventId: req.params.eventId, categoryId: req.params.categoryId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Delete category
router.delete(
  '/:eventId/categories/:categoryId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, categoryId } = req.params;

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      await prisma.category.delete({
        where: { id: categoryId },
      });

      res.json({ message: 'Kategorie gelöscht' });
    } catch (error) {
      logger.error('Fehler beim Löschen der Kategorie', { message: (error as any)?.message || String(error), eventId: req.params.eventId, categoryId: req.params.categoryId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Assign photo to category
router.put(
  '/photos/:photoId/category',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { photoId } = req.params;
      const { categoryId } = req.body;

      const photo = await prisma.photo.findUnique({
        where: { id: photoId },
        include: {
          event: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      // Check permissions
      if (photo.event.hostId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      // Validate category belongs to event
      if (categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: categoryId,
            eventId: photo.eventId,
          },
        });

        if (!category) {
          return res.status(404).json({ error: 'Kategorie nicht gefunden' });
        }
      }

      const updatedPhoto = await prisma.photo.update({
        where: { id: photoId },
        data: {
          categoryId: categoryId || null,
        },
      });

      res.json({ photo: updatedPhoto });
    } catch (error) {
      logger.error('Fehler beim Zuweisen der Kategorie', { message: (error as any)?.message || String(error), photoId: req.params.photoId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;














