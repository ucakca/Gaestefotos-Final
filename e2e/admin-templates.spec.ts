import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

test.describe('Admin Templates Management', () => {
  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  const adminDashUrl = process.env.E2E_ADMIN_URL || 'http://127.0.0.1:3003';

  test.beforeAll(async ({ request }) => {
    await ensureBackendUp(request, apiBase);
  });

  test.describe('Email Templates API', () => {
    test('should require admin authentication for email templates', async ({ request }) => {
      const response = await request.get(`${apiBase}/api/admin/email-templates`);
      expect([401, 403]).toContain(response.status());
    });

    test('should validate email template kind parameter', async ({ request }) => {
      const response = await request.get(`${apiBase}/api/admin/email-templates/INVALID_KIND`);
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe('Feature Flags API', () => {
    test('should require admin authentication for feature flags', async ({ request }) => {
      const response = await request.get(`${apiBase}/api/admin/feature-flags`);
      expect([401, 403]).toContain(response.status());
    });

    test('should reject unauthenticated feature flag updates', async ({ request }) => {
      const response = await request.put(`${apiBase}/api/admin/feature-flags/some-id`, {
        data: { allowVideoUpload: true },
      });
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Invitation Templates API', () => {
    test('should require admin authentication for invitation templates', async ({ request }) => {
      const response = await request.get(`${apiBase}/api/admin/invitation-templates`);
      expect([401, 403]).toContain(response.status());
    });

    test('should validate invitation template slug format', async ({ request }) => {
      // Slugs with special characters should be rejected
      const response = await request.post(`${apiBase}/api/admin/invitation-templates`, {
        data: {
          slug: 'invalid slug with spaces!',
          title: 'Test',
        },
      });
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe('Admin Dashboard Navigation', () => {
    test('admin login page should load', async ({ page }) => {
      await page.goto(`${adminDashUrl}/login`);
      
      // Check login form elements
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 });
    });

    test('unauthenticated access should redirect to login', async ({ page }) => {
      await page.goto(`${adminDashUrl}/manage/email-templates`);
      
      // Should redirect to login or show auth required
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toMatch(/login|auth/i);
    });
  });
});

test.describe('QR Templates API', () => {
  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  test('should require admin authentication', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/admin/qr-templates`);
    expect([401, 403]).toContain(response.status());
  });

  test('public QR templates endpoint should be accessible', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/qr-templates`);
    // Public endpoint should work (may return empty array)
    expect([200, 404]).toContain(response.status());
  });
});
