import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

// This test seeds its own data via Prisma to avoid relying on manual login.
// It assumes the dev stack uses the local Postgres from packages/backend/.env.

async function seedBase(db: any, unique: string) {
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

  return { user, event };
}

async function cleanupBase(db: any, ids: { userId: string; eventId: string; invitationId: string }) {
  await db.invitationRsvp.deleteMany({ where: { invitationId: ids.invitationId } });
  await db.invitationVisit.deleteMany({ where: { invitationId: ids.invitationId } });
  await db.invitationShortLink.deleteMany({ where: { invitationId: ids.invitationId } });
  await db.invitation.delete({ where: { id: ids.invitationId } });
  await db.event.delete({ where: { id: ids.eventId } });
  await db.user.delete({ where: { id: ids.userId } });
}

test('invitation: open -> RSVP -> download ICS', async ({ page, request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const unique = Date.now().toString(36);

  const { user, event } = await seedBase(db, unique);

  const invitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-${unique}`,
      name: 'E2E Einladung',
      isActive: true,
      visibility: 'PUBLIC',
      passwordHash: null,
      config: {
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
        sections: {
          hero: { enabled: true },
          rsvp: { enabled: true },
          calendar: { enabled: true },
        },
      },
    },
  });

  try {
    await page.goto(`/i/${invitation.slug}`);

    // Wait for the RSVP UI to be ready (more stable than title text rendering).
    await expect(page.getByTestId('rsvp-name')).toBeVisible();

    await page.getByTestId('rsvp-name').fill('E2E Guest');
    await page.getByTestId('rsvp-yes').click();

    await expect(page.getByText(/Deine Antwort:\s*YES/)).toBeVisible();

    // Verify ICS endpoint returns text/calendar.
    const icsRes = await request.get(`${apiBase}/api/invitations/slug/${encodeURIComponent(invitation.slug)}/ics`);
    expect(icsRes.ok()).toBeTruthy();

    const contentType = icsRes.headers()['content-type'] || '';
    expect(contentType).toContain('text/calendar');

    const ics = await icsRes.text();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
  } finally {
    await cleanupBase(db, { userId: user.id, eventId: event.id, invitationId: invitation.id });
    await db.$disconnect();
  }
});

test('invitation: public listing returns only PUBLIC invitations', async ({ request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const unique = `${Date.now().toString(36)}-publiclist`;
  const { user, event } = await seedBase(db, unique);

  const publicInvitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-public-${unique}`,
      name: 'E2E Einladung (PUBLIC)',
      isActive: true,
      visibility: 'PUBLIC',
      passwordHash: null,
      config: {
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
        sections: {
          hero: { enabled: true },
          rsvp: { enabled: true },
          calendar: { enabled: true },
        },
      },
    },
  });

  const unlistedInvitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-unlisted-${unique}`,
      name: 'E2E Einladung (UNLISTED)',
      isActive: true,
      visibility: 'UNLISTED',
      passwordHash: null,
      config: {
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
        sections: {
          hero: { enabled: true },
          rsvp: { enabled: true },
          calendar: { enabled: true },
        },
      },
    },
  });

  try {
    const res = await request.get(`${apiBase}/api/events/slug/${encodeURIComponent(event.slug)}/invitations/public`);
    expect(res.ok()).toBeTruthy();
    const json: any = await res.json();

    const slugs = (json?.invitations || []).map((i: any) => i.slug);
    expect(slugs).toContain(publicInvitation.slug);
    expect(slugs).not.toContain(unlistedInvitation.slug);
  } finally {
    // cleanupBase deletes event (cascade deletes all invitations), so don't delete unlisted separately afterwards.
    await cleanupBase(db, { userId: user.id, eventId: event.id, invitationId: publicInvitation.id });
    await db.$disconnect();
  }
});

test('invitation: UNLISTED requires access cookie (shortlink grants access)', async ({ page, request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const unique = `${Date.now().toString(36)}-unlisted`;
  const { user, event } = await seedBase(db, unique);

  const invitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-unlisted-${unique}`,
      name: 'E2E Einladung (UNLISTED) - Cookie required',
      isActive: true,
      visibility: 'UNLISTED',
      passwordHash: null,
      config: {
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
        sections: {
          hero: { enabled: true },
          rsvp: { enabled: true },
          calendar: { enabled: true },
        },
      },
    },
  });

  const code = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(0, 12);
  await db.invitationShortLink.create({
    data: {
      invitationId: invitation.id,
      code,
      channel: 'default',
    },
  });

  try {
    // Direct access should fail (UNLISTED without cookie).
    await page.goto(`/i/${invitation.slug}`);
    await expect(page.getByTestId('rsvp-name')).not.toBeVisible();
    await expect(page.getByText('Einladung nicht gefunden')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Neu laden' })).toBeVisible();

    // Visiting shortlink should set cookie (client-side fetch with credentials) and redirect to /i/:slug.
    await page.goto(`/s/${code}`);
    await page.waitForURL(new RegExp(`/i/${invitation.slug}$`), { timeout: 30_000 });
    await expect(page.getByTestId('rsvp-name')).toBeVisible({ timeout: 30_000 });

    // /s2 should behave the same.
    await page.goto(`/s2/${code}`);
    await page.waitForURL(new RegExp(`/i/${invitation.slug}$`), { timeout: 30_000 });
    await expect(page.getByTestId('rsvp-name')).toBeVisible({ timeout: 30_000 });
  } finally {
    await cleanupBase(db, { userId: user.id, eventId: event.id, invitationId: invitation.id });
    await db.$disconnect();
  }
});

test('invitation: password protected -> open -> RSVP -> download ICS', async ({ page, request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const bcrypt = await import('bcryptjs');
  const unique = `${Date.now().toString(36)}-pw`;
  const password = 'test1234';

  const { user, event } = await seedBase(db, unique);
  const passwordHash = await (bcrypt as any).default.hash(password, 10);

  const invitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-${unique}`,
      name: 'E2E Einladung (PW)',
      isActive: true,
      visibility: 'PUBLIC',
      passwordHash,
      config: {
        title: event.title,
        dateTime: event.dateTime,
        locationName: event.locationName,
        sections: {
          hero: { enabled: true },
          rsvp: { enabled: true },
          calendar: { enabled: true },
        },
      },
    },
  });

  try {
    await page.goto(`/i/${invitation.slug}`);

    // Stable selector for password gate.
    await expect(page.getByTestId('invite-password')).toBeVisible();
    await page.getByTestId('invite-password').fill(password);
    await page.getByTestId('invite-password-open').click();

    // After unlocking, RSVP UI should be available.
    await expect(page.getByTestId('rsvp-name')).toBeVisible();

    await page.getByTestId('rsvp-name').fill('E2E Guest');
    await page.getByTestId('rsvp-maybe').click();
    await expect(page.getByText(/Deine Antwort:\s*MAYBE/)).toBeVisible();

    const icsRes = await request.get(
      `${apiBase}/api/invitations/slug/${encodeURIComponent(invitation.slug)}/ics?password=${encodeURIComponent(password)}`
    );
    expect(icsRes.ok()).toBeTruthy();
    const contentType = icsRes.headers()['content-type'] || '';
    expect(contentType).toContain('text/calendar');
  } finally {
    await cleanupBase(db, { userId: user.id, eventId: event.id, invitationId: invitation.id });
    await db.$disconnect();
  }
});
