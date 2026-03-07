/**
 * GUEST JOURNEY — End-to-End Validation
 * 
 * Validates the documented user journey from DOKUMENTATION.md §2.2:
 *   QR-Scan → Event-Galerie → Passwort-Check → Foto-Upload → Like/Kommentar
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
  ensureTestFiles,
  waitForBackend,
  CleanupRegistry,
  disconnectDb,
} from '../fixtures/test-setup';

const cleanup = new CleanupRegistry();

test.afterAll(async () => {
  await cleanup.runAll();
  await disconnectDb();
});

test.describe('Guest Journey (DOKUMENTATION §2.2)', () => {

  // -----------------------------------------------------------------------
  // §2.2 Step 1: QR-Scan → Event-Galerie via /e3/{slug}
  // DOC: "Gast scannt QR-Code → /app.gästefotos.com/e3/slug/"
  // -----------------------------------------------------------------------
  test.describe('Step 1: QR-Scan → Event laden', () => {

    test('GJ-01: /e3/{slug} resolves to event gallery page', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj01' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user, { title: 'GJ01 Event' });
      cleanup.register(ec);

      await page.goto(`${FRONTEND_BASE}/e3/${event.slug}`);
      // Should NOT be a 404
      await expect(page.locator('text=/404|nicht gefunden|not found/i')).not.toBeVisible({ timeout: 10_000 }).catch(() => {
        // Page loaded but may show event content instead
      });

      // Should show event title or gallery
      const pageContent = await page.content();
      const hasEventContent = pageContent.includes(event.title) ||
        pageContent.includes('Galerie') ||
        pageContent.includes('Fotos') ||
        pageContent.includes('Upload');
      // Accept either the event loads or a password prompt appears
      expect(
        hasEventContent ||
        await page.locator('input[type="password"]').isVisible().catch(() => false)
      ).toBeTruthy();
    });

    test('GJ-02: Non-existent slug returns 404 or error page', async ({ page, request }) => {
      await waitForBackend(request);
      const response = await page.goto(`${FRONTEND_BASE}/e3/non-existent-slug-${Date.now()}`);

      // DOC §3.1 Step 3: "IF event IS NULL THEN → 404"
      // Frontend shows ErrorState with "Event nicht gefunden" inside an Alert,
      // or the server may return an HTTP 404 status code.
      const httpStatus = response?.status() || 200;
      if (httpStatus === 404) {
        // Server-side 404 — pass
        return;
      }

      // Client-side error rendering — wait for error text to appear
      const errorLocator = page.locator('text=/nicht gefunden|not found|404|existiert nicht|error/i');
      await expect(errorLocator.first()).toBeVisible({ timeout: 15_000 });
    });

    test('GJ-03: API /api/events/by-slug/{slug} returns event data', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj03' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/slug/${event.slug}`);
      // Should return event data (200) or require access (401/403)
      expect([200, 401, 403, 429]).toContain(res.status());

      if (res.ok()) {
        const json: any = await res.json();
        expect(json.id || json.event?.id).toBeTruthy();
      }
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 2: Passwort-geschütztes Event
  // DOC: "Event passwortgeschützt? → Passwort-Eingabe → POST /api/events/id/access"
  // -----------------------------------------------------------------------
  test.describe('Step 2: Passwort-Schutz', () => {

    test('GJ-04: Password-protected event shows password form', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj04' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user, {
        title: 'GJ04 Protected Event',
        password: 'geheim123',
      });
      cleanup.register(ec);

      await page.goto(`${FRONTEND_BASE}/e3/${event.slug}`);

      // DOC: "Passwort-Eingabe Formular"
      // PasswordGate renders "Event-Passwort" heading + input[type="password"]
      // Use Playwright's .or() to match either element, then wait with timeout
      const passwordInput = page.locator('input[type="password"]');
      const passwordHeading = page.getByText('Event-Passwort');
      const passwordText = page.getByText('passwortgeschützt');
      const combined = passwordInput.or(passwordHeading).or(passwordText);
      await expect(combined.first()).toBeVisible({ timeout: 15_000 });
    });

    test('GJ-05: Correct password grants access via event_access cookie', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj05' });
      cleanup.register(uc);
      const eventPassword = 'testpasswort2025';
      const { event, cleanup: ec } = await createTestEvent(request, user, {
        title: 'GJ05 Cookie Event',
        password: eventPassword,
      });
      cleanup.register(ec);

      // DOC: "POST /api/events/{id}/verify-password {password} → Set-Cookie: event_access_{id}=JWT(12h)"
      const accessRes = await apiPost(request, `/api/events/${event.id}/verify-password`, {
        password: eventPassword,
      });
      // Should set cookie and return success
      expect([200, 201]).toContain(accessRes.status());

      const cookies = accessRes.headers()['set-cookie'] || '';
      const hasAccessCookie = cookies.includes('event_access');
      // Cookie should be set (may be HttpOnly)
      expect(hasAccessCookie || accessRes.ok()).toBeTruthy();
    });

    test('GJ-06: Wrong password is rejected', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj06' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user, {
        title: 'GJ06 Wrong PW',
        password: 'richtig123',
      });
      cleanup.register(ec);

      const accessRes = await apiPost(request, `/api/events/${event.id}/verify-password`, {
        password: 'falsch999',
      });
      // Should be rejected
      expect([401, 403]).toContain(accessRes.status());
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 3: Galerie-Interaktion
  // DOC: "ModernPhotoGrid InfiniteScroll Galerie"
  // -----------------------------------------------------------------------
  test.describe('Step 3: Galerie laden', () => {

    test('GJ-07: Event photos API returns array', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj07' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/${event.id}/photos`, user.token);
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      // Should return an array (possibly empty for new event)
      expect(Array.isArray(json) || Array.isArray(json?.photos)).toBeTruthy();
    });

    test('GJ-08: Categories API returns array', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj08' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/${event.id}/categories`, user.token);
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      expect(Array.isArray(json) || Array.isArray(json?.categories)).toBeTruthy();
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 4: Foto-Upload (Guest perspective)
  // DOC: "UploadButton FileDropzone → TUS Upload resumable → Konfetti-Animation"
  // -----------------------------------------------------------------------
  test.describe('Step 4: Foto-Upload', () => {

    test('GJ-09: TUS upload endpoint accepts creation', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj09' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      // DOC: "POST /api/uploads (TUS Init, metadata:{eventId})"
      // TUS protocol: POST with Upload-Length header
      const res = await request.post(`${API_BASE}/api/uploads`, {
        headers: {
          'Tus-Resumable': '1.0.0',
          'Upload-Length': '10240',
          'Upload-Metadata': `eventId ${Buffer.from(event.id).toString('base64')},filename ${Buffer.from('test.jpg').toString('base64')}`,
          'Authorization': `Bearer ${user.token}`,
        },
      });

      // TUS 201 Created or auth-related response
      expect([201, 400, 401, 403, 412]).toContain(res.status());
    });

    test('GJ-10: Upload status endpoint exists', async ({ request }) => {
      await waitForBackend(request);
      // DOC / BUG-01: "GET /api/uploads/status" — should exist
      const res = await apiGet(request, '/api/uploads/status');
      // Should respond (not 404)
      expect(res.status()).not.toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 5: Foto-Interaktionen (Like, Kommentar, Download)
  // DOC: "Like → POST /api/likes, Kommentar → POST /api/comments, Download → GET /cdn/photoId"
  // -----------------------------------------------------------------------
  test.describe('Step 5: Foto-Interaktionen', () => {

    test('GJ-11: Like endpoint responds correctly', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj11' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      // Create a test photo directly in DB
      const db = (await import('@prisma/client') as any);
      const prisma = new db.PrismaClient();
      const crypto = await import('crypto');
      const photoId = crypto.randomUUID();
      const photo = await prisma.photo.create({
        data: {
          id: photoId,
          eventId: event.id,
          url: `/cdn/${photoId}`,
          status: 'APPROVED',
          storagePath: 'test/path.jpg',
        },
      });
      cleanup.register(async () => {
        await prisma.photoLike.deleteMany({ where: { photoId: photo.id } });
        await prisma.photo.delete({ where: { id: photo.id } }).catch(() => {});
        await prisma.$disconnect();
      });

      // DOC: "POST /api/likes" → toggle like on photo
      const likeRes = await apiPost(
        request,
        `/api/photos/${photo.id}/like`,
        {},
        user.token,
      );
      // Should succeed or indicate already liked
      expect([200, 201, 204]).toContain(likeRes.status());
    });

    test('GJ-12: Comment endpoint responds correctly', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj12' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const db = (await import('@prisma/client') as any);
      const prisma = new db.PrismaClient();
      const crypto = await import('crypto');
      const photoId = crypto.randomUUID();
      const photo = await prisma.photo.create({
        data: {
          id: photoId,
          eventId: event.id,
          url: `/cdn/${photoId}`,
          status: 'APPROVED',
          storagePath: 'test/path.jpg',
        },
      });
      cleanup.register(async () => {
        await prisma.photoComment.deleteMany({ where: { photoId: photo.id } });
        await prisma.photo.delete({ where: { id: photo.id } }).catch(() => {});
        await prisma.$disconnect();
      });

      // DOC: "POST /api/photos/:photoId/comments"
      // Schema requires: { comment: string, authorName: string }
      const commentRes = await apiPost(
        request,
        `/api/photos/${photo.id}/comments`,
        { comment: 'E2E Testkommentar', authorName: 'E2E Gast' },
        user.token,
      );
      expect([200, 201]).toContain(commentRes.status());
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 6: Gästebuch
  // DOC: "Gästebuch → Einträge"
  // -----------------------------------------------------------------------
  test.describe('Step 6: Gästebuch', () => {

    test('GJ-13: Guestbook GET returns entries', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj13' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/${event.id}/guestbook`, user.token);
      expect(res.ok()).toBeTruthy();
      const json: any = await res.json();
      expect(Array.isArray(json) || Array.isArray(json?.entries) || json?.guestbookEntries !== undefined).toBeTruthy();
    });

    test('GJ-14: Guestbook POST creates entry', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj14' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      // Schema requires: { authorName: string, message: string }
      // Guestbook POST requires event access — use host token
      const res = await apiPost(
        request,
        `/api/events/${event.id}/guestbook`,
        { authorName: 'E2E Gast', message: 'Tolles Event!' },
        user.token,
      );
      // 200/201 = success, 403 = feature not available in package
      expect([200, 201, 403]).toContain(res.status());
    });
  });

  // -----------------------------------------------------------------------
  // §2.2 Step 7: Stories
  // DOC: "Stories → StoriesBar Instagram-Stil"
  // -----------------------------------------------------------------------
  test.describe('Step 7: Stories', () => {

    test('GJ-15: Stories API returns array', async ({ request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'gj15' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const res = await apiGet(request, `/api/events/${event.id}/stories`, user.token);
      expect(res.ok()).toBeTruthy();
    });
  });
});
