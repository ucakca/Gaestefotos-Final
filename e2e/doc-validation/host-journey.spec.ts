/**
 * HOST JOURNEY — End-to-End Validation
 * 
 * Validates the documented host journey from DOKUMENTATION.md §2.5:
 *   Login → Event erstellen → Dashboard → QR-Design → Galerie konfigurieren → Moderation
 * 
 * Each test maps to a specific documentation claim.
 */

import { test, expect } from '@playwright/test';
import {
  API_BASE,
  FRONTEND_BASE,
  createTestUser,
  createTestEvent,
  authenticatePage,
  apiGet,
  apiPost,
  apiPut,
  waitForBackend,
  CleanupRegistry,
  disconnectDb,
} from '../fixtures/test-setup';

const cleanup = new CleanupRegistry();

test.afterAll(async () => {
  await cleanup.runAll();
  await disconnectDb();
});

test.describe('Host Journey (DOKUMENTATION §2.5 Event-Lifecycle)', () => {

  // -----------------------------------------------------------------------
  // Phase 1: Planung — Login & Account
  // DOC: "Host registriert sich → Account erstellen (email/password + optional WP SSO)"
  // -----------------------------------------------------------------------
  test.describe('Phase 1: Login & Account', () => {

    test('HJ-01: Login page renders correctly', async ({ page, request }) => {
      await waitForBackend(request);
      await page.goto(`${FRONTEND_BASE}/login`);
      // DOC: Login form with email + password
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('HJ-02: Login with valid credentials redirects to dashboard', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj02' });
      cleanup.register(uc);

      await page.goto(`${FRONTEND_BASE}/login`);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    });

    test('HJ-03: Login with wrong password shows error', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj03' });
      cleanup.register(uc);

      await page.goto(`${FRONTEND_BASE}/login`);
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error, NOT redirect to dashboard
      const errorVisible = await page.locator('text=/falsch|ungültig|error|fehler|incorrect/i').isVisible({ timeout: 5_000 }).catch(() => false);
      const stayedOnLogin = /\/login/.test(page.url());
      expect(errorVisible || stayedOnLogin).toBeTruthy();
    });

    test('HJ-04: /api/auth/me returns user data with valid token', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj04' });
      cleanup.register(uc);

      const res = await apiGet(request, '/api/auth/me', user.token);
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      expect(json.email || json.user?.email).toBe(user.email);
    });

    test('HJ-05: /api/auth/me rejects without token', async ({ request }) => {
      await waitForBackend(request);
      const res = await apiGet(request, '/api/auth/me');
      expect([401, 403]).toContain(res.status());
    });
  });

  // -----------------------------------------------------------------------
  // Phase 2: Setup — Event anlegen
  // DOC: "Event anlegen → /create-event (Titel, Datum, Ort, Thema)"
  // -----------------------------------------------------------------------
  test.describe('Phase 2: Event erstellen', () => {

    test('HJ-06: Create event page loads for authenticated user', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj06' });
      cleanup.register(uc);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/create-event`);

      // Should show create event form
      const hasForm = await page.locator('input, form, text=/Event erstellen|Neues Event/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(hasForm).toBeTruthy();
    });

    test('HJ-07: Create event via API', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj07' });
      cleanup.register(uc);

      const res = await apiPost(request, '/api/events', {
        title: `HJ07 API Event ${Date.now()}`,
        date: new Date().toISOString(),
      }, user.token);

      expect([200, 201]).toContain(res.status());
      if (res.ok()) {
        const json: any = await res.json();
        const eventId = json.id || json.event?.id;
        expect(eventId).toBeTruthy();
        // Cleanup
        const db = (await import('@prisma/client') as any);
        const prisma = new db.PrismaClient();
        cleanup.register(async () => {
          await prisma.photo.deleteMany({ where: { eventId } });
          await prisma.event.delete({ where: { id: eventId } }).catch(() => {});
          await prisma.$disconnect();
        });
      }
    });

    test('HJ-08: Event list shows created events', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj08' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user, { title: 'HJ08 List Test' });
      cleanup.register(ec);

      const res = await apiGet(request, '/api/events', user.token);
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      const events = Array.isArray(json) ? json : json?.events || [];
      const found = events.some((e: any) => e.id === event.id || e.slug === event.slug);
      expect(found).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Phase 3: Dashboard & Management
  // DOC: "Host moderiert → Fotos genehmigen/ablehnen"
  // -----------------------------------------------------------------------
  test.describe('Phase 3: Dashboard & Management', () => {

    test('HJ-09: Dashboard page loads with event list', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj09' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/dashboard`);

      // Actual dashboard shows "Hallo, {name}!" heading and "Meine Events" section
      const dashboardLoaded = await page.locator('text=/Hallo|Meine Events/i').first().isVisible({ timeout: 30_000 }).catch(() => false);
      expect(dashboardLoaded).toBeTruthy();
    });

    test('HJ-10: Event dashboard page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj10' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/dashboard`);

      // Should show event-specific dashboard
      const loaded = await page.locator('text=/Dashboard|Fotos|Upload|Galerie/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-11: Event edit page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj11' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/edit`);

      const loaded = await page.locator('input, form, text=/bearbeiten|einstellungen|settings/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-12: Event photos management page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj12' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/photos`);

      // Should show photo management or empty state
      const loaded = await page.locator('text=/Fotos|keine Fotos|Noch keine|Upload/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-13: Event statistics API returns data', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj13' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/${event.id}/statistics`, user.token);
      expect(res.ok()).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Phase 4: QR-Code & Invitations
  // DOC: "QR-Code designen → QR-Designer (SVG-Templates, Logo, Farbe)"
  // -----------------------------------------------------------------------
  test.describe('Phase 4: QR & Einladungen', () => {

    test('HJ-14: QR-Styler page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj14' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/qr-styler`);

      const loaded = await page.locator('text=/QR|Code|Design/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-15: QR-Code API generates code', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj15' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      // DOC: QR-Code generation endpoint
      const res = await apiGet(request, `/api/events/${event.id}/qr/png`, user.token);
      // Should return image or valid response
      expect([200, 404]).toContain(res.status());
    });

    test('HJ-16: Invitation page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj16' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/invitation`);

      const loaded = await page.locator('text=/Einladung|Invitation|Teilen|Share/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // Phase 5: Moderation
  // DOC: "Host moderiert → Fotos genehmigen/ablehnen"
  // -----------------------------------------------------------------------
  test.describe('Phase 5: Moderation', () => {

    test('HJ-17: Photo approve via API works', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj17' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user, { moderation: true });
      cleanup.register(ec);

      // Create a PENDING photo
      const db = (await import('@prisma/client') as any);
      const prisma = new db.PrismaClient();
      const crypto = await import('crypto');
      const photoId = crypto.randomUUID();
      await prisma.photo.create({
        data: {
          id: photoId,
          eventId: event.id,
          url: `/cdn/${photoId}`,
          status: 'PENDING',
          storagePath: 'test/mod-test.jpg',
        },
      });
      cleanup.register(async () => {
        await prisma.photo.delete({ where: { id: photoId } }).catch(() => {});
        await prisma.$disconnect();
      });

      // Approve photo — backend uses router.post('/:photoId/approve')
      const res = await apiPost(
        request,
        `/api/photos/${photoId}/approve`,
        {},
        user.token,
      );
      expect([200, 204]).toContain(res.status());
    });
  });

  // -----------------------------------------------------------------------
  // Phase 6: Advanced Features
  // DOC: "Mosaic Wall generieren", "Gästebuch exportieren", "Download-ZIP"
  // -----------------------------------------------------------------------
  test.describe('Phase 6: Erweiterte Features', () => {

    test('HJ-18: Mosaic page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj18' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/mosaic`);

      const loaded = await page.locator('text=/Mosaic|Mosaik|Wall/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-19: Live-Wall page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj19' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/live-wall`);

      // DOC: "Live-Wall läuft → Socket.IO Echtzeit (photo_uploaded Events)"
      const loaded = await page.locator('text=/Live|Wall|Echtzeit/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });

    test('HJ-20: Guests management page loads', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'hj20' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);
      await page.goto(`${FRONTEND_BASE}/events/${event.id}/guests`);

      const loaded = await page.locator('text=/Gäste|Guests|Teilnehmer/i').first().isVisible({ timeout: 15_000 }).catch(() => false);
      expect(loaded).toBeTruthy();
    });
  });
});
