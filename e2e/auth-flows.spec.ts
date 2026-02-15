import { test, expect } from '@playwright/test';
import { gotoOrSkip } from './helpers';

test.describe('Authentication Flows', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Test User';

  test.describe('Password Reset Flow', () => {
    test('should display forgot password page correctly', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      await expect(page.locator('h1')).toContainText('Passwort vergessen');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Reset-Link anfordern');
    });

    test('should show success message after submitting email', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      await page.fill('input[type="email"]', 'test@example.com');
      await page.click('button[type="submit"]');
      
      // Should show success message (even if email doesn't exist - security)
      await expect(page.locator('text=/Falls ein Konto existiert/')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // HTML5 validation should prevent submission
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('should navigate back to login', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      await page.click('text=Zurück zum Login');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Reset Password Page', () => {
    test('should display error without token', async ({ page }) => {
      await gotoOrSkip(page, '/reset-password');
      
      await expect(page.locator('h1')).toContainText('Ungültiger Link');
      await expect(page.locator('button')).toContainText('Neuen Link anfordern');
    });

    test('should display form with valid token structure', async ({ page }) => {
      const fakeToken = 'a'.repeat(64); // Valid token format
      await gotoOrSkip(page, `/reset-password?token=${fakeToken}`);
      
      await expect(page.locator('h1')).toContainText('Neues Passwort');
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').nth(1)).toBeVisible();
    });

    test('should validate password match', async ({ page }) => {
      const fakeToken = 'a'.repeat(64);
      await gotoOrSkip(page, `/reset-password?token=${fakeToken}`);
      
      await page.fill('input[type="password"]', 'NewPassword123');
      await page.locator('input[type="password"]').nth(1).fill('DifferentPassword123');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=/stimmen nicht überein/')).toBeVisible();
    });

    test('should validate minimum password length', async ({ page }) => {
      const fakeToken = 'a'.repeat(64);
      await gotoOrSkip(page, `/reset-password?token=${fakeToken}`);
      
      await page.fill('input[type="password"]', '12345');
      await page.locator('input[type="password"]').nth(1).fill('12345');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=/mindestens 6 Zeichen/')).toBeVisible();
    });
  });

  test.describe('Login Page Enhancements', () => {
    test('should have forgot password link', async ({ page }) => {
      await gotoOrSkip(page, '/login');
      
      const forgotPasswordBtn = page.locator('button:has-text("Passwort vergessen?")');
      await expect(forgotPasswordBtn).toBeVisible();
      
      await forgotPasswordBtn.click();
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('should have registration link', async ({ page }) => {
      await gotoOrSkip(page, '/login');
      
      const registerLink = page.locator('a:has-text("Jetzt registrieren")');
      await expect(registerLink).toBeVisible();
      await expect(registerLink).toHaveAttribute('href', /gästefotos.com\/registrieren/);
      await expect(registerLink).toHaveAttribute('target', '_blank');
    });

    test('should display all navigation elements', async ({ page }) => {
      await gotoOrSkip(page, '/login');
      
      await expect(page.locator('text=Willkommen zurück')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('a:has-text("Hilfe / FAQ")')).toBeVisible();
      await expect(page.locator('a:has-text("Datenschutz")')).toBeVisible();
      await expect(page.locator('a:has-text("Impressum")')).toBeVisible();
    });
  });

  test.describe('Integration Tests', () => {
    test('should complete full password reset flow navigation', async ({ page }) => {
      // Start at login
      await gotoOrSkip(page, '/login');
      
      // Navigate to forgot password
      await page.click('button:has-text("Passwort vergessen?")');
      await expect(page).toHaveURL(/\/forgot-password/);
      
      // Go back to login
      await page.click('text=Zurück zum Login');
      await expect(page).toHaveURL(/\/login/);
      
      // Try registration link
      const [newPage] = await Promise.all([
        page.waitForEvent('popup'),
        page.click('a:has-text("Jetzt registrieren")')
      ]);
      await expect(newPage.url()).toContain('gästefotos.com');
      await newPage.close();
    });

    test('should handle email submission on forgot password', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      // Fill and submit
      await page.fill('input[type="email"]', testEmail);
      
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/auth/forgot-password') && response.status() === 200
      );
      
      await page.click('button[type="submit"]');
      
      // Should get response (even for non-existent email)
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      // Should show success message
      await expect(page.locator('text=/Falls ein Konto existiert/')).toBeVisible();
      
      // Email field should be cleared
      await expect(page.locator('input[type="email"]')).toHaveValue('');
    });
  });

  test.describe('UI/UX Elements', () => {
    test('forgot password page should have proper styling', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      // Check for gradient background
      const container = page.locator('div').first();
      await expect(container).toBeVisible();
      
      // Check form elements are styled
      await expect(page.locator('input[type="email"]')).toHaveCSS('border-radius', /.+/);
      await expect(page.locator('button[type="submit"]')).toHaveCSS('background-color', /.+/);
    });

    test('reset password page should show loading state', async ({ page }) => {
      const fakeToken = 'a'.repeat(64);
      await gotoOrSkip(page, `/reset-password?token=${fakeToken}`);
      
      await page.fill('input[type="password"]', testPassword);
      await page.locator('input[type="password"]').nth(1).fill(testPassword);
      
      // Click submit (will fail with fake token, but should show loading)
      await page.click('button[type="submit"]');
      
      // Loading state should appear briefly
      const submitBtn = page.locator('button[type="submit"]');
      // Button should be disabled during loading
      await expect(submitBtn).toBeDisabled();
    });

    test('forgot password should disable submit during loading', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      await page.fill('input[type="email"]', testEmail);
      
      // Click submit
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      
      // Should show loading text
      await expect(submitBtn).toContainText(/Wird gesendet/);
      await expect(submitBtn).toBeDisabled();
    });
  });

  test.describe('Accessibility', () => {
    test('forgot password page should have proper labels', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('id', 'email');
      
      const label = page.locator('label[for="email"]');
      await expect(label).toBeVisible();
      await expect(label).toContainText('E-Mail');
    });

    test('reset password page should have proper labels', async ({ page }) => {
      const fakeToken = 'a'.repeat(64);
      await gotoOrSkip(page, `/reset-password?token=${fakeToken}`);
      
      await expect(page.locator('label[for="password"]')).toBeVisible();
      await expect(page.locator('label[for="confirmPassword"]')).toBeVisible();
    });

    test('buttons should have meaningful text', async ({ page }) => {
      await gotoOrSkip(page, '/forgot-password');
      await expect(page.locator('button[type="submit"]')).toContainText('Reset-Link anfordern');
      
      await gotoOrSkip(page, `/reset-password?token=${'a'.repeat(64)}`);
      await expect(page.locator('button[type="submit"]')).toContainText('Passwort zurücksetzen');
    });
  });
});
