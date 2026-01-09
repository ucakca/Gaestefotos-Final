import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, optionalAuthMiddleware, hasEventAccess, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const createChallengeSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  description: z.string().optional().nullable(),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isVisible: z.boolean().default(true),
  categoryId: z.string().uuid().nullable().optional(), // null = globale Challenge
});

// Get all challenges for an event (optionally filtered by category)
router.get(
  '/:eventId/challenges',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Challenges nicht gefunden' });
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const { categoryId, public: isPublic } = req.query;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, hostId: true, deletedAt: true, isActive: true },
    });

    if (!event || event.deletedAt || event.isActive === false) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
    if (!isManager && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Challenges nicht gefunden' });
    }

    const where: any = { eventId };
    if (categoryId) {
      where.categoryId = categoryId === 'null' ? null : categoryId;
    }
    if (isPublic === 'true') {
      where.isActive = true;
    }

    const challenges = await prisma.challenge.findMany({
      where,
      include: {
        completions: {
          include: {
            photo: {
              select: {
                id: true,
                url: true,
                createdAt: true,
              },
            },
            guest: isManager
              ? true
              : {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    res.json({ challenges });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Challenges', { message: (error as any)?.message || String(error) });
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
});

// Create challenge
router.post(
  '/:eventId/challenges',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId } = req.params;
      const data = createChallengeSchema.parse(req.body);

      // Check if event exists and user owns it
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // If categoryId is provided, verify it belongs to the event
      if (data.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            eventId,
          },
        });

        if (!category) {
          return res.status(404).json({ error: 'Album nicht gefunden' });
        }
      }

      const challenge = await prisma.challenge.create({
        data: {
          eventId,
          categoryId: data.categoryId || null,
          title: data.title,
          description: data.description || null,
          order: data.order,
          isActive: data.isActive ?? true,
          isVisible: data.isVisible ?? true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({ challenge });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Fehler beim Erstellen der Challenge', { message: (error as any)?.message || String(error), eventId: req.params.eventId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Update challenge
router.put(
  '/:eventId/challenges/:challengeId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const data = createChallengeSchema.partial().parse(req.body);

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Verify challenge exists and belongs to event
      const existingChallenge = await prisma.challenge.findFirst({
        where: {
          id: challengeId,
          eventId,
        },
      });

      if (!existingChallenge) {
        return res.status(404).json({ error: 'Challenge nicht gefunden' });
      }

      // If categoryId is being updated, verify it belongs to the event
      if (data.categoryId !== undefined) {
        if (data.categoryId) {
          const category = await prisma.category.findFirst({
            where: {
              id: data.categoryId,
              eventId,
            },
          });

          if (!category) {
            return res.status(404).json({ error: 'Album nicht gefunden' });
          }
        }
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null;

      const challenge = await prisma.challenge.update({
        where: { id: challengeId },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({ challenge });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      logger.error('Fehler beim Aktualisieren der Challenge', { message: (error as any)?.message || String(error), eventId: req.params.eventId, challengeId: req.params.challengeId });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Delete challenge
router.delete(
  '/:eventId/challenges/:challengeId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      await prisma.challenge.delete({
        where: { id: challengeId },
      });

      res.json({ message: 'Challenge gelöscht' });
    } catch (error) {
      logger.error('Fehler beim Löschen der Challenge', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
        challengeId: req.params.challengeId,
      });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Copy challenge to other categories
router.post(
  '/:eventId/challenges/:challengeId/copy',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const { categoryIds } = req.body; // Array of category IDs

      if (!Array.isArray(categoryIds)) {
        return res.status(400).json({ error: 'categoryIds muss ein Array sein' });
      }

      // Check ownership
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      // Get original challenge
      const originalChallenge = await prisma.challenge.findFirst({
        where: {
          id: challengeId,
          eventId,
        },
      });

      if (!originalChallenge) {
        return res.status(404).json({ error: 'Challenge nicht gefunden' });
      }

      // Verify all categories belong to the event
      const categories = await prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          eventId,
        },
      });

      if (categories.length !== categoryIds.length) {
        return res.status(400).json({ error: 'Ein oder mehrere Alben wurden nicht gefunden' });
      }

      // Create copies
      const copies = await Promise.all(
        categoryIds.map((categoryId: string) =>
          prisma.challenge.create({
            data: {
              eventId,
              categoryId,
              title: originalChallenge.title,
              description: originalChallenge.description,
              order: originalChallenge.order,
              isActive: originalChallenge.isActive,
              isVisible: originalChallenge.isVisible,
            },
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          })
        )
      );

      res.json({ challenges: copies });
    } catch (error) {
      logger.error('Fehler beim Kopieren der Challenge', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
        challengeId: req.params.challengeId,
      });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Complete challenge (upload photo)
router.post(
  '/:eventId/challenges/:challengeId/complete',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Challenge nicht gefunden' });
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, challengeId } = req.params;
      const { photoId, uploaderName } = req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isManager = req.userId ? await hasEventManageAccess(req, eventId) : false;
      if (!isManager && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Challenge nicht gefunden' });
      }

      if (!photoId) {
        return res.status(400).json({ error: 'photoId ist erforderlich' });
      }

      // Verify challenge exists and is active
      const challenge = await prisma.challenge.findFirst({
        where: {
          id: challengeId,
          eventId,
          isActive: true,
        },
      });

      if (!challenge) {
        return res.status(404).json({ error: 'Challenge nicht gefunden oder nicht aktiv' });
      }

      // Verify photo exists and belongs to event
      const photo = await prisma.photo.findFirst({
        where: {
          id: photoId,
          eventId,
        },
        include: {
          guest: true,
        },
      });

      if (!photo) {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      if (photo.deletedAt || photo.status === 'DELETED') {
        return res.status(404).json({ error: 'Foto nicht gefunden' });
      }

      // Check if challenge already completed (one photo per challenge)
      const existingCompletion = await prisma.challengeCompletion.findUnique({
        where: { photoId },
      });

      if (existingCompletion) {
        return res.status(400).json({ error: 'Dieses Foto wurde bereits für eine Challenge verwendet' });
      }

      // Check if user already completed this challenge
      const guestId = photo.guestId;
      const userCompletion = await prisma.challengeCompletion.findFirst({
        where: {
          challengeId,
          OR: [
            guestId ? { guestId } : {},
            uploaderName ? { uploaderName } : {},
          ],
        },
      });

      if (userCompletion) {
        return res.status(400).json({ error: 'Sie haben diese Challenge bereits erfüllt' });
      }

      // Create completion - always save uploaderName if provided, even if guestId exists
      const completion = await prisma.challengeCompletion.create({
        data: {
          challengeId,
          photoId,
          guestId: guestId || null,
          uploaderName: uploaderName && uploaderName.trim() ? uploaderName.trim() : null,
        },
        include: {
          photo: true,
          guest: true,
          challenge: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({ completion });
    } catch (error) {
      logger.error('Fehler beim Erfüllen der Challenge', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
        challengeId: req.params.challengeId,
      });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

// Rate challenge completion
router.post(
  '/:eventId/challenges/completions/:completionId/rate',
  optionalAuthMiddleware,
  (req: AuthRequest, res: Response, next) => {
    const eventId = (req as any).params.eventId as string;
    if (!req.userId && !hasEventAccess(req, eventId)) {
      return res.status(404).json({ error: 'Challenge-Erfüllung nicht gefunden' });
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, completionId } = req.params;
      const { rating, raterName } = req.body;

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, hostId: true, deletedAt: true, isActive: true },
      });

      if (!event || event.deletedAt || event.isActive === false) {
        return res.status(404).json({ error: 'Event nicht gefunden' });
      }

      const isHost = req.userId && req.userId === event.hostId;
      if (!isHost && !hasEventAccess(req, eventId)) {
        return res.status(404).json({ error: 'Challenge-Erfüllung nicht gefunden' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen' });
      }

      // Verify completion exists
      const completion = await prisma.challengeCompletion.findFirst({
        where: {
          id: completionId,
          challenge: {
            eventId,
          },
        },
      });

      if (!completion) {
        return res.status(404).json({ error: 'Challenge-Erfüllung nicht gefunden' });
      }

      // Check if already rated
      const existingRating = await prisma.challengeRating.findFirst({
        where: {
          completionId,
        },
      });

      if (existingRating) {
        // Update existing rating
        await prisma.challengeRating.update({
          where: { id: existingRating.id },
          data: { rating },
        });
      } else {
        // Create new rating
        await prisma.challengeRating.create({
          data: {
            completionId,
            raterName: raterName || null,
            rating,
          },
        });
      }

      // Recalculate average rating
      const ratings = await prisma.challengeRating.findMany({
        where: { completionId },
      });

      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : null;

      await prisma.challengeCompletion.update({
        where: { id: completionId },
        data: {
          ratingCount: ratings.length,
          averageRating,
        },
      });

      res.json({ success: true, averageRating, ratingCount: ratings.length });
    } catch (error) {
      logger.error('Fehler beim Bewerten', {
        message: (error as any)?.message || String(error),
        eventId: req.params.eventId,
        completionId: req.params.completionId,
      });
      res.status(500).json({ error: 'Interner Serverfehler' });
    }
  }
);

export default router;

