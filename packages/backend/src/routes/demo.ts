/**
 * One-Click-Demo Route
 * 
 * Creates a temporary demo event with sample data so visitors
 * can experience the app without registering.
 */

import { Router, Request, Response } from 'express';
import prisma from '../config/database';
import { randomString, generateEventSlug, DEFAULT_EVENT_FEATURES_CONFIG, normalizeEventFeaturesConfig } from '@gaestefotos/shared';
import { logger } from '../utils/logger';

const router = Router();

const DEMO_TITLES = [
  'Hochzeit Anna & Max',
  'Firmenfeier 2026',
  'Geburtstag Lisa (30)',
  'Sommerfest im Garten',
  'Team-Event Zürich',
  'Weihnachtsfeier Office',
];

const DEMO_CATEGORIES = [
  { name: 'Highlights', order: 0 },
  { name: 'Gäste', order: 1 },
  { name: 'Party', order: 2 },
  { name: 'Deko & Location', order: 3 },
];

const DEMO_GUESTBOOK_ENTRIES = [
  { guestName: 'Marie', message: 'Was für ein wunderschöner Abend! 🥰' },
  { guestName: 'Thomas', message: 'Die Location war traumhaft. Danke für die Einladung!' },
  { guestName: 'Julia & Ben', message: 'Wir hatten so viel Spaß! Die Fotobox war genial 📸' },
];

async function getUniqueSlug(preferred: string): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? preferred : `${preferred}-${randomString(4).toLowerCase()}`;
    const existing = await prisma.event.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${preferred}-${randomString(8).toLowerCase()}`;
}

/**
 * POST /api/demo/create
 * Creates a demo event and returns the slug.
 * No auth required, but rate-limited.
 */
router.post('/create', async (_req: Request, res: Response) => {
  try {
    // Find or create a demo host user
    const DEMO_HOST_EMAIL = 'demo@gaestefotos.com';
    let demoHost = await prisma.user.findUnique({ where: { email: DEMO_HOST_EMAIL } });

    if (!demoHost) {
      const bcrypt = require('bcryptjs');
      demoHost = await prisma.user.create({
        data: {
          email: DEMO_HOST_EMAIL,
          name: 'Demo Gastgeber',
          password: await bcrypt.hash(randomString(32), 10),
          role: 'HOST',
        },
      });
    }

    // Pick random title
    const title = DEMO_TITLES[Math.floor(Math.random() * DEMO_TITLES.length)];
    const slug = await getUniqueSlug(generateEventSlug(`demo-${title}`));

    // Create event with all features enabled
    const featuresConfig = normalizeEventFeaturesConfig({
      ...DEFAULT_EVENT_FEATURES_CONFIG,
      allowUploads: true,
      allowGuestbook: true,
      allowLikes: true,
      allowComments: true,
      allowDownload: true,
      moderationEnabled: false,
      isPublic: true,
    });

    const event = await prisma.event.create({
      data: {
        hostId: demoHost.id,
        title,
        slug,
        dateTime: new Date(),
        locationName: 'Demo Location',
        featuresConfig,
        designConfig: {
          colorScheme: 'sunset',
          welcomeMessage: `Willkommen zur Demo! 📸\nLade Fotos hoch, hinterlasse einen Gästebucheintrag oder stöbere durch die Galerie.`,
        },
        categories: {
          create: DEMO_CATEGORIES,
        },
      },
    });

    // Add demo guestbook entries
    for (const entry of DEMO_GUESTBOOK_ENTRIES) {
      try {
        await (prisma as any).guestbookEntry.create({
          data: {
            eventId: event.id,
            guestName: entry.guestName,
            message: entry.message,
          },
        });
      } catch {
        // Guestbook model might not exist
      }
    }

    logger.info('[Demo] Created demo event', { eventId: event.id, slug });

    res.json({
      slug,
      eventId: event.id,
      url: `/e3/${slug}`,
    });
  } catch (error: any) {
    logger.error('[Demo] Failed to create demo event', { error: error?.message });
    res.status(500).json({ error: 'Demo-Event konnte nicht erstellt werden' });
  }
});

export default router;
