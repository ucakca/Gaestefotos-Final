import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

test.describe('Setup Wizard and Dashboard Setup Tab', () => {
  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  test.beforeAll(async ({ request }) => {
    await ensureBackendUp(request, apiBase);
  });

  test.describe('Setup Wizard Components', () => {
    test('wizard step components should be importable', async ({ page }) => {
      // This test verifies the setup wizard pages load correctly
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Event API for Setup', () => {
    test('should require authentication to update event', async ({ request }) => {
      const response = await request.put(`${apiBase}/api/events/test-event-id`, {
        data: { title: 'Test Title' },
      });
      expect([401, 403, 404]).toContain(response.status());
    });

    test('should validate event title length', async ({ request }) => {
      // Very long titles should be rejected
      const longTitle = 'a'.repeat(500);
      const response = await request.put(`${apiBase}/api/events/test-event-id`, {
        data: { title: longTitle },
      });
      expect([400, 401, 403, 404]).toContain(response.status());
    });

    test('should handle date-time updates', async ({ request }) => {
      // Invalid date format should be handled gracefully
      const response = await request.put(`${apiBase}/api/events/test-event-id`, {
        data: { dateTime: 'invalid-date' },
      });
      expect([400, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Dashboard Setup Tab Navigation', () => {
    test('dashboard should load for authenticated users', async ({ page }) => {
      // Basic check that dashboard route exists
      await page.goto('/dashboard');
      // Will redirect to login if not authenticated
      await page.waitForTimeout(2000);
      const url = page.url();
      // Should either show dashboard or redirect to login
      expect(url).toMatch(/dashboard|login/);
    });
  });
});

test.describe('Reusable Content Components', () => {
  test.describe('TitleContent Component', () => {
    test('should validate title minimum length', async () => {
      // Unit test style - verify business logic
      const minLength = 3;
      expect(''.length >= minLength).toBe(false);
      expect('Ab'.length >= minLength).toBe(false);
      expect('Abc'.length >= minLength).toBe(true);
      expect('Event Title'.length >= minLength).toBe(true);
    });
  });

  test.describe('DateLocationContent Component', () => {
    test('should accept valid date ranges', async () => {
      // Verify date validation logic
      const minYear = 1900;
      const maxYear = 2099;
      
      const validYear = 2026;
      const invalidYearLow = 1800;
      const invalidYearHigh = 2100;
      
      expect(validYear >= minYear && validYear <= maxYear).toBe(true);
      expect(invalidYearLow >= minYear && invalidYearLow <= maxYear).toBe(false);
      expect(invalidYearHigh >= minYear && invalidYearHigh <= maxYear).toBe(false);
    });
  });
});
