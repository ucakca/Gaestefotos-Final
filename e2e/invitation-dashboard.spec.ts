import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

test('invitation dashboard: edit invitation (set password) -> public page requires password', async ({ page, request }) => {

  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const bcrypt = await import('bcryptjs');

  const unique = `${Date.now().toString(36)}-dash`;
  const password = 'test1234';
  const adminPassword = 'admin1234';

  const adminPasswordHash = await (bcrypt as any).default.hash(adminPassword, 10);

  const user = await db.user.create({
    data: {
      email: `e2e-admin-${unique}@example.com`,
      name: 'E2E Admin',
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const loginRes = await request.post(`${apiBase}/api/auth/login`, {
    data: {
      email: user.email,
      password: adminPassword,
      rememberMe: true,
    },
  });
  if (!loginRes.ok()) {
    const body = await loginRes.text();
    const snippet = body.length > 800 ? `${body.slice(0, 800)}\n…(truncated)…` : body;
    throw new Error(`Login failed: ${loginRes.status()} ${loginRes.url()}\n${snippet}`);
  }
  const loginJson: any = await loginRes.json();
  const token = loginJson?.token as string;
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(10);

  const event = await db.event.create({
    data: {
      hostId: user.id,
      slug: `e2e-event-${unique}`,
      title: `E2E Event ${unique}`,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
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

  const invitation = await db.invitation.create({
    data: {
      eventId: event.id,
      slug: `e2e-invite-${unique}`,
      name: 'E2E Einladung',
      isActive: true,
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
    const pageErrors: string[] = [];
    const consoleLogs: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(String(err?.message || err));
    });
    page.on('console', (msg) => {
      // Keep it short to avoid huge logs
      const text = msg.text();
      consoleLogs.push(`${msg.type()}: ${text.length > 300 ? `${text.slice(0, 300)}…` : text}`);
    });

    // Sanity-check backend access. If this fails, the dashboard won't be able to load data either.
    const headers = { Authorization: `Bearer ${token}` };

    const eventApiRes = await request.get(`${apiBase}/api/events/${event.id}`, { headers });
    if (!eventApiRes.ok()) {
      const body = await eventApiRes.text();
      const snippet = body.length > 800 ? `${body.slice(0, 800)}\n…(truncated)…` : body;
      throw new Error(`Event API failed: ${eventApiRes.status()} ${eventApiRes.url()}\n${snippet}`);
    }

    const invApiRes = await request.get(`${apiBase}/api/events/${event.id}/invitations`, { headers });
    if (!invApiRes.ok()) {
      const body = await invApiRes.text();
      const snippet = body.length > 800 ? `${body.slice(0, 800)}\n…(truncated)…` : body;
      throw new Error(`Invitations API failed: ${invApiRes.status()} ${invApiRes.url()}\n${snippet}`);
    }

    // Auth in the frontend via localStorage token (frontend axios interceptor uses it).
    await page.addInitScript((t: string) => {
      window.localStorage.setItem('token', t);
    }, token);

    const gotoDashboardWithRetries = async () => {
      const url = `/events/${event.id}/dashboard`;
      for (let attempt = 1; attempt <= 3; attempt++) {
        pageErrors.length = 0;
        consoleLogs.length = 0;

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // If Next.js dev server is still compiling / HMR swapped chunks, we can see ChunkLoadError.
        const hadChunkLoadError =
          pageErrors.some((e) => e.includes('ChunkLoadError') || e.includes('Loading chunk')) ||
          consoleLogs.some((l) => l.includes('ChunkLoadError') || l.includes('Loading chunk'));

        if (!hadChunkLoadError) return;

        // Try a hard reload once the server finished compiling.
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
      }
    };

    await gotoDashboardWithRetries();

    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
    // Give React a moment to hydrate.
    await page.waitForTimeout(500);
    // Wait for network to settle (helps catch stuck requests)
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {
      // If network never goes idle (polling etc.), we still continue and inspect DOM.
    });

    const urlNow = page.url();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');

    if (urlNow.includes('/login')) {
      const html = await page.content();
      throw new Error(
        `Dashboard redirected to /login.\nURL: ${urlNow}\nPage errors: ${pageErrors.join(' | ') || 'none'}\nConsole: ${consoleLogs.join(' | ') || 'none'}\nHTML snippet:\n${html.slice(0, 1200)}\n…`
      );
    }

    if (bodyText.includes('Event nicht gefunden')) {
      const html = await page.content();
      throw new Error(
        `Dashboard shows 'Event nicht gefunden'.\nURL: ${urlNow}\nPage errors: ${pageErrors.join(' | ') || 'none'}\nConsole: ${consoleLogs.join(' | ') || 'none'}\nHTML snippet:\n${html.slice(0, 1200)}\n…`
      );
    }

    if (!bodyText.includes('Einladungsseiten')) {
      const html = await page.content();
      throw new Error(
        `Dashboard did not render 'Einladungsseiten'.\nURL: ${urlNow}\nPage errors: ${pageErrors.join(' | ') || 'none'}\nConsole: ${consoleLogs.join(' | ') || 'none'}\nBodyText snippet:\n${bodyText.slice(0, 800)}\n…\nHTML snippet:\n${html.slice(0, 1200)}\n…`
      );
    }

    // The invitations section is below the fold; prefer a stable selector for the edit button.
    const editBtn = page.getByTestId(`invitation-edit-${invitation.id}`);
    await editBtn.scrollIntoViewIfNeeded();
    await expect(editBtn).toBeVisible({ timeout: 30_000 });

    // Enter edit mode for invitation
    await expect(editBtn).toBeVisible();
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click();

    // Set password and save
    const visibilityToggle = page.getByTestId(`invitation-edit-visibility-${invitation.id}`);
    await visibilityToggle.check();
    await expect(visibilityToggle).toBeChecked();
    await page.getByTestId(`invitation-edit-password-${invitation.id}`).fill(password);

    const updateResPromise = page.waitForResponse((res) => {
      const u = res.url();
      return u.includes(`/api/events/${event.id}/invitations/${invitation.id}`) || u.includes(`/events/${event.id}/invitations/${invitation.id}`);
    });
    await page.getByTestId(`invitation-save-${invitation.id}`).click();

    const updateRes = await updateResPromise;
    if (!updateRes.ok()) {
      const body = await updateRes.text();
      throw new Error(`Invitation update failed: ${updateRes.status()} ${updateRes.url()}\n${body.slice(0, 1200)}`);
    }

    // Verify persisted visibility via backend API
    const listRes = await request.get(`${apiBase}/api/events/${event.id}/invitations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const listJson: any = await listRes.json();
    const updated = (listJson?.invitations || []).find((i: any) => i.id === invitation.id);
    expect(updated?.visibility).toBe('PUBLIC');

    // Verify public page now requires password
    await page.goto(`/i/${invitation.slug}`);
    await expect(page.getByText('Passwort erforderlich')).toBeVisible();
  } finally {
    await db.invitationRsvp.deleteMany({ where: { invitationId: invitation.id } });
    await db.invitationVisit.deleteMany({ where: { invitationId: invitation.id } });
    await db.invitationShortLink.deleteMany({ where: { invitationId: invitation.id } });
    await db.invitation.delete({ where: { id: invitation.id } });
    await db.event.delete({ where: { id: event.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
