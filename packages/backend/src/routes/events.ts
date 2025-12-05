import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';
import { slugify } from '@gaestefotos/shared';

const router = Router();

// Validation schemas
const createEventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  dateTime: z.string().datetime().optional(),
  locationName: z.string().optional(),
  designConfig: z.record(z.any()).optional(),
  featuresConfig: z.record(z.any()).optional(),
});

// Get all events (for current user)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        hostId: req.userId,
      },
      include: {
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by ID
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event by slug (public)
router.get('/slug/:slug', async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.findUnique({
      where: { slug: req.params.slug },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            photos: true,
            guests: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event by slug error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create event
router.post(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const data = createEventSchema.parse(req.body);

      // Generate slug if not provided
      const slug = data.slug || slugify(data.title);

      // Check if slug exists
      const existingEvent = await prisma.event.findUnique({
        where: { slug },
      });

      if (existingEvent) {
        return res.status(400).json({ error: 'Event slug already exists' });
      }

      const event = await prisma.event.create({
        data: {
          hostId: req.userId!,
          title: data.title,
          slug,
          dateTime: data.dateTime ? new Date(data.dateTime) : null,
          locationName: data.locationName,
          designConfig: data.designConfig || {},
          featuresConfig: data.featuresConfig || {
            showGuestlist: true,
            mysteryMode: false,
            allowUploads: true,
            moderationRequired: false,
            allowDownloads: true,
          },
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Create event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update event
router.put(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = createEventSchema.partial().parse(req.body);

      const event = await prisma.event.update({
        where: { id: req.params.id },
        data: {
          ...data,
          dateTime: data.dateTime ? new Date(data.dateTime) : undefined,
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ event });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Update event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete event
router.delete(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      // Check ownership
      const existingEvent = await prisma.event.findUnique({
        where: { id: req.params.id },
      });

      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (existingEvent.hostId !== req.userId && req.userRole !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await prisma.event.delete({
        where: { id: req.params.id },
      });

      res.json({ message: 'Event deleted' });
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

