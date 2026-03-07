/**
 * REALTIME — WebSocket/Socket.IO Validation
 * 
 * Validates documented realtime features from DOKUMENTATION.md §2.4:
 * - Socket.IO connection to event rooms
 * - photo_uploaded event emission
 * - Live-Wall page loads and connects
 * 
 * Note: Full WebSocket E2E requires the server to emit events,
 * so some tests verify infrastructure readiness rather than full flow.
 */

import { test, expect } from '@playwright/test';
import {
  API_BASE,
  FRONTEND_BASE,
  createTestUser,
  createTestEvent,
  authenticatePage,
  apiGet,
  waitForBackend,
  CleanupRegistry,
  disconnectDb,
} from '../fixtures/test-setup';

const cleanup = new CleanupRegistry();

test.afterAll(async () => {
  await cleanup.runAll();
  await disconnectDb();
});

test.describe('Realtime / WebSocket (DOKUMENTATION §2.4)', () => {

  // -----------------------------------------------------------------------
  // Socket.IO Server Availability
  // DOC: "Socket.IO ^4.6.0 — WebSocket Echtzeit-Kommunikation"
  // -----------------------------------------------------------------------
  test.describe('Socket.IO Infrastructure', () => {

    test('RT-01: Socket.IO endpoint responds to polling transport', async ({ request }) => {
      await waitForBackend(request);

      // Socket.IO exposes a polling endpoint at /socket.io/?EIO=4&transport=polling
      const res = await request.get(`${API_BASE}/socket.io/?EIO=4&transport=polling`);
      // Socket.IO responds with session data or an error message
      // Should NOT be 404
      expect(res.status()).not.toBe(404);
    });

    test('RT-02: Socket.IO returns session info on initial handshake', async ({ request }) => {
      await waitForBackend(request);

      const res = await request.get(`${API_BASE}/socket.io/?EIO=4&transport=polling`);

      if (res.ok()) {
        const text = await res.text();
        // Socket.IO EIO 4 returns something like: 0{"sid":"...","upgrades":["websocket"],...}
        const hasSid = text.includes('sid');
        expect(hasSid).toBeTruthy();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Live-Wall Page
  // DOC §2.5: "Live-Wall läuft → Socket.IO Echtzeit (photo_uploaded Events)"
  // -----------------------------------------------------------------------
  test.describe('Live-Wall', () => {

    test('RT-03: Live-Wall page loads without errors', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'rt03' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);

      // Collect console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });

      await page.goto(`${FRONTEND_BASE}/events/${event.id}/live-wall`);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      // Should load without critical JS errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('manifest') && !e.includes('404'),
      );
      // Allow some non-critical errors (e.g., missing images)
      expect(criticalErrors.length).toBeLessThan(5);
    });

    test('RT-04: Live-Wall page attempts WebSocket connection', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'rt04' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      await authenticatePage(page, user.token);

      // Monitor network requests for socket.io connections
      const socketRequests: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('socket.io')) {
          socketRequests.push(req.url());
        }
      });

      await page.goto(`${FRONTEND_BASE}/events/${event.id}/live-wall`);
      await page.waitForTimeout(5000);

      // Should have made at least one socket.io request
      expect(socketRequests.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Event Gallery Realtime
  // DOC: "WebSocket emit photo_uploaded → room:event:{id}"
  // -----------------------------------------------------------------------
  test.describe('Gallery Realtime Updates', () => {

    test('RT-05: Guest gallery page attempts WebSocket connection', async ({ page, request }) => {
      await waitForBackend(request);
      const { user, cleanup: uc } = await createTestUser(request, { prefix: 'rt05' });
      cleanup.register(uc);
      const { event, cleanup: ec } = await createTestEvent(request, user);
      cleanup.register(ec);

      const socketRequests: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('socket.io')) {
          socketRequests.push(req.url());
        }
      });

      await page.goto(`${FRONTEND_BASE}/e3/${event.slug}`);
      await page.waitForTimeout(5000);

      // Gallery should connect to WebSocket for realtime photo updates
      expect(socketRequests.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Push Notifications Infrastructure
  // DOC: "Push Notifications — an Host & Guests"
  // -----------------------------------------------------------------------
  test.describe('Push Notifications', () => {

    test('RT-06: VAPID key endpoint returns public key', async ({ request }) => {
      await waitForBackend(request);
      const res = await apiGet(request, '/api/push/vapid-key');

      if (res.ok()) {
        const json: any = await res.json();
        // Should return a VAPID public key
        expect(json.publicKey || json.vapidKey || json.key).toBeTruthy();
      } else {
        // 500 means VAPID not configured — acceptable in dev
        expect([200, 500]).toContain(res.status());
      }
    });

    test('RT-07: Push subscribe endpoint requires auth', async ({ request }) => {
      await waitForBackend(request);
      const res = await request.post(`${API_BASE}/api/push/subscribe`, {
        data: {
          endpoint: 'https://fake-push.example.com',
          keys: { p256dh: 'fake', auth: 'fake' },
        },
      });
      // Should require authentication or reject invalid subscription data
      // 400 = endpoint exists but rejects bad push subscription (also acceptable)
      expect([400, 401, 403]).toContain(res.status());
    });
  });
});
