import { Router, Response } from 'express';
import prisma from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/slideshow/:slug — Get slideshow data for an event
 * Public endpoint — no auth required (for fullscreen display on TVs/projectors)
 */
router.get('/:slug', async (req: any, res: Response) => {
  try {
    const { slug } = req.params;
    const { max = '100', shuffle = '0' } = req.query;

    const event = await prisma.event.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        designConfig: true,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const take = Math.min(parseInt(max as string) || 100, 500);

    const photos = await prisma.photo.findMany({
      where: {
        eventId: event.id,
        status: 'APPROVED',
      },
      orderBy: shuffle === '1' ? undefined : { createdAt: 'desc' },
      take,
      select: {
        id: true,
        storagePath: true,
        storagePathThumb: true,
        description: true,
        uploadedBy: true,
        createdAt: true,
      },
    });

    // If shuffle, randomize in JS
    const photoList = shuffle === '1'
      ? photos.sort(() => Math.random() - 0.5)
      : photos;

    const baseUrl = process.env.FRONTEND_URL || 'https://gästefotos.com';

    const slides = photoList.map((p) => ({
      id: p.id,
      imageUrl: `${baseUrl}/api/photos/${p.id}/image`,
      thumbnailUrl: p.storagePathThumb ? `${baseUrl}/api/photos/${p.id}/thumbnail` : undefined,
      caption: p.description || undefined,
      guestName: p.uploadedBy || undefined,
      createdAt: p.createdAt,
    }));

    const designConfig = event.designConfig as any;

    res.json({
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        primaryColor: designConfig?.primaryColor || '#295B4D',
        logoUrl: designConfig?.logoUrl || undefined,
      },
      slides,
      totalPhotos: slides.length,
    });
  } catch (error) {
    logger.error('Slideshow data error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden der Slideshow' });
  }
});

/**
 * GET /api/slideshow/:slug/latest — Get latest photos since a timestamp
 * Used for live updates during an event (polling from slideshow client)
 */
router.get('/:slug/latest', async (req: any, res: Response) => {
  try {
    const { slug } = req.params;
    const { since } = req.query;

    if (!since) {
      return res.status(400).json({ error: 'since Parameter erforderlich (ISO 8601)' });
    }

    const event = await prisma.event.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event nicht gefunden' });
    }

    const sinceDate = new Date(since as string);
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({ error: 'Ungültiges Datum' });
    }

    const newPhotos = await prisma.photo.findMany({
      where: {
        eventId: event.id,
        status: 'APPROVED',
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: {
        id: true,
        storagePath: true,
        storagePathThumb: true,
        description: true,
        uploadedBy: true,
        createdAt: true,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://gästefotos.com';

    const slides = newPhotos.map((p) => ({
      id: p.id,
      imageUrl: `${baseUrl}/api/photos/${p.id}/image`,
      thumbnailUrl: p.storagePathThumb ? `${baseUrl}/api/photos/${p.id}/thumbnail` : undefined,
      caption: p.description || undefined,
      guestName: p.uploadedBy || undefined,
      createdAt: p.createdAt,
    }));

    res.json({
      newSlides: slides,
      count: slides.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Slideshow latest error', { message: (error as Error).message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;
