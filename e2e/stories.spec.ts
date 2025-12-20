import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

// E2E test for Stories MVP: seed a story and verify the public event page renders the story bar + viewer.

test('stories: public event shows stories bar and viewer opens', async ({ page, request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const unique = `${Date.now().toString(36)}-stories`;

  const user = await db.user.create({
    data: {
      email: `e2e-admin-${unique}@example.com`,
      name: 'E2E Admin',
      password: '',
      role: 'ADMIN',
    },
  });

  const event = await db.event.create({
    data: {
      hostId: user.id,
      slug: `e2e-event-${unique}`,
      title: `E2E Event ${unique}`,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      locationName: 'E2E Location',
      designConfig: {},
      featuresConfig: {
        showGuestlist: false,
        mysteryMode: false,
        allowUploads: true,
        moderationRequired: false,
        allowDownloads: true,
      } as any,
    },
  });

  // Use a data URI so the <img> does not depend on backend storage.
  const dataUri = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

  const photo = await db.photo.create({
    data: {
      eventId: event.id,
      storagePath: `e2e/${unique}.gif`,
      url: dataUri,
      status: 'APPROVED',
      uploadedBy: 'E2E Guest',
    },
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const story = await db.story.create({
    data: {
      eventId: event.id,
      photoId: photo.id,
      isActive: true,
      expiresAt,
    },
  });

  try {
    const jwtMod: any = await import('jsonwebtoken');
    const jwtSecret = process.env.JWT_SECRET || '';
    if (!jwtSecret) {
      test.skip(true, 'JWT_SECRET missing (required to mint event access cookie)');
    }

    const sign = jwtMod?.sign || jwtMod?.default?.sign;
    if (typeof sign !== 'function') {
      throw new Error('jsonwebtoken.sign not available');
    }

    const eventAccessToken = sign({ type: 'event_access', eventId: event.id }, jwtSecret, { expiresIn: '12h' });
    await page.context().addCookies([
      {
        name: `event_access_${event.id}`,
        value: eventAccessToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
    ]);

    await page.goto(`/e/${event.slug}`);

    await expect(page.getByTestId('stories-bar')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('story-item-0')).toBeVisible();

    await page.getByTestId('story-item-0').click();

    await expect(page.getByTestId('story-viewer')).toBeVisible();
    await expect(page.getByTestId('story-progress')).toBeVisible();
    await expect(page.getByTestId('story-image')).toBeVisible();

    await page.getByTestId('story-close').click();
    await expect(page.getByTestId('story-viewer')).not.toBeVisible();
  } finally {
    await db.story.deleteMany({ where: { id: story.id } });
    await db.photo.deleteMany({ where: { id: photo.id } });
    await db.event.deleteMany({ where: { id: event.id } });
    await db.user.deleteMany({ where: { id: user.id } });
    await db.$disconnect();
  }
});
