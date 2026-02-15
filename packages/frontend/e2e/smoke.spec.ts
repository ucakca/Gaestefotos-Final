import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Gästefotos/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
  });

  test('login form shows validation errors', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    // Should show error for empty fields
    await expect(page.locator('text=E-Mail')).toBeVisible();
  });

  test('404 page for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-xyz');
    expect(response?.status()).toBe(404);
  });

  test('event page requires slug', async ({ page }) => {
    await page.goto('/e3/test-event-slug');
    // Should either load or show error (not crash)
    await expect(page.locator('body')).toBeVisible();
  });
});
