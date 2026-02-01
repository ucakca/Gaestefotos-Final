import { Router, Response } from 'express';
import { z } from 'zod';
import { randomString } from '@gaestefotos/shared';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, hasEventManageAccess } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/typeHelpers';

const router = Router();

// Validation schemas
const createGuestSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  dietaryRequirements: z.string().optional(),
  plusOneCount: z.number().int().min(0).default(0),
});

// Get all guests for an event
router.get('/:eventId/guests', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ guests });
  } catch (error) {
    logger.error('Get guests error', { error: getErrorMessage(error), eventId: req.params.eventId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create guest
router.post('/:eventId/guests', async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const data = createGuestSchema.parse(req.body);

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Generate access token
    const accessToken = randomString(32);

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        dietaryRequirements: data.dietaryRequirements,
        plusOneCount: data.plusOneCount,
        accessToken,
      },
    });

    res.status(201).json({ guest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logger.error('Create guest error', { error: getErrorMessage(error), eventId: req.params.eventId });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update guest (RSVP)
router.put(
  '/:eventId/guests/:guestId',
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, guestId } = req.params;
      const { status, dietaryRequirements, plusOneCount } = req.body;

      // Check if guest exists and belongs to event
      const guest = await prisma.guest.findFirst({
        where: {
          id: guestId,
          eventId,
        },
      });

      if (!guest) {
        return res.status(404).json({ error: 'Guest not found' });
      }

      const updatedGuest = await prisma.guest.update({
        where: { id: guestId },
        data: {
          status: status || undefined,
          dietaryRequirements: dietaryRequirements || undefined,
          plusOneCount: plusOneCount !== undefined ? plusOneCount : undefined,
        },
      });

      res.json({ guest: updatedGuest });
    } catch (error) {
      logger.error('Update guest error', { error: getErrorMessage(error), eventId: req.params.eventId, guestId: req.params.guestId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete guest
router.delete(
  '/:eventId/guests/:guestId',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { eventId, guestId } = req.params;

      // Check if event exists and user owns it
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (!(await hasEventManageAccess(req, eventId))) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.guest.delete({
        where: { id: guestId },
      });

      res.json({ message: 'Guest deleted' });
    } catch (error) {
      logger.error('Delete guest error', { error: getErrorMessage(error), eventId: req.params.eventId, guestId: req.params.guestId });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

