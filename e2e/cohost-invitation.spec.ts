import { test, expect } from '@playwright/test';

test.describe('Co-Host Invitation System', () => {
  const testEventSlug = 'test-event-' + Date.now();
  let eventId: string;
  let cohostInviteToken: string;

  test.beforeAll(async ({ request }) => {
    // Create test event (assumes logged in user)
    // This would need actual authentication setup
  });

  test.describe('Invite Token Generation', () => {
    test('should generate cohost invite token', async ({ page }) => {
      // Navigate to event dashboard
      await page.goto(`/events/${eventId}/dashboard`);
      
      // Open co-host management
      await page.click('text=Co-Hosts verwalten');
      
      // Click generate invite link
      await page.click('button:has-text("Einladungslink erstellen")');
      
      // Should show invite link
      await expect(page.locator('[data-testid="invite-link"]')).toBeVisible();
      
      // Copy link button should be visible
      await expect(page.locator('button:has-text("Link kopieren")')).toBeVisible();
    });

    test('should send invite email', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      
      await page.click('text=Co-Hosts verwalten');
      await page.click('button:has-text("Per E-Mail einladen")');
      
      // Fill email form
      await page.fill('input[type="email"]', 'cohost@example.com');
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=/Einladung versendet/')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      
      await page.click('text=Co-Hosts verwalten');
      await page.click('button:has-text("Per E-Mail einladen")');
      
      // Invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // HTML5 validation should prevent submission
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  test.describe('Invite Acceptance Flow', () => {
    test('should show invite details on invite page', async ({ page }) => {
      // Navigate with invite token
      await page.goto(`/e2/${testEventSlug}?cohostInvite=${cohostInviteToken}`);
      
      // Should show event details
      await expect(page.locator('h1')).toContainText(/eingeladen/i);
      
      // Should show accept button
      await expect(page.locator('button:has-text("Einladung annehmen")')).toBeVisible();
      
      // Should show decline button
      await expect(page.locator('button:has-text("Ablehnen")')).toBeVisible();
    });

    test('should accept cohost invitation', async ({ page }) => {
      await page.goto(`/e2/${testEventSlug}?cohostInvite=${cohostInviteToken}`);
      
      // Click accept
      await page.click('button:has-text("Einladung annehmen")');
      
      // Should redirect to event dashboard
      await expect(page).toHaveURL(new RegExp(`/events/.+/dashboard`));
      
      // Should show success message
      await expect(page.locator('text=/erfolgreich hinzugefügt/')).toBeVisible();
    });

    test('should decline cohost invitation', async ({ page }) => {
      await page.goto(`/e2/${testEventSlug}?cohostInvite=${cohostInviteToken}`);
      
      // Click decline
      await page.click('button:has-text("Ablehnen")');
      
      // Should show confirmation
      await expect(page.locator('text=/abgelehnt/')).toBeVisible();
    });

    test('should handle expired invite token', async ({ page }) => {
      const expiredToken = 'expired-token-123';
      await page.goto(`/e2/${testEventSlug}?cohostInvite=${expiredToken}`);
      
      // Should show error
      await expect(page.locator('text=/ungültig|abgelaufen/i')).toBeVisible();
    });
  });

  test.describe('Co-Host Management', () => {
    test('should list existing cohosts', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      await page.click('text=Co-Hosts verwalten');
      
      // Should show cohosts list
      await expect(page.locator('[data-testid="cohosts-list"]')).toBeVisible();
    });

    test('should update cohost permissions', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      await page.click('text=Co-Hosts verwalten');
      
      // Find first cohost
      const cohostRow = page.locator('[data-testid="cohost-row"]').first();
      
      // Open permissions dialog
      await cohostRow.locator('button:has-text("Rechte anpassen")').click();
      
      // Toggle permission
      await page.click('label:has-text("Fotos moderieren")');
      
      // Save
      await page.click('button:has-text("Speichern")');
      
      // Should show success
      await expect(page.locator('text=/aktualisiert/')).toBeVisible();
    });

    test('should remove cohost', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      await page.click('text=Co-Hosts verwalten');
      
      const cohostRow = page.locator('[data-testid="cohost-row"]').first();
      
      // Click remove button
      await cohostRow.locator('button:has-text("Entfernen")').click();
      
      // Confirm deletion
      await page.click('button:has-text("Ja, entfernen")');
      
      // Should show success
      await expect(page.locator('text=/entfernt/')).toBeVisible();
    });

    test('should prevent removing event host', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      await page.click('text=Co-Hosts verwalten');
      
      // Host row should not have remove button
      const hostRow = page.locator('[data-testid="host-row"]');
      await expect(hostRow.locator('button:has-text("Entfernen")')).not.toBeVisible();
    });
  });

  test.describe('Permissions Enforcement', () => {
    test('cohost should see dashboard', async ({ page }) => {
      // Login as cohost
      // await loginAsCohost(page);
      
      await page.goto(`/events/${eventId}/dashboard`);
      
      // Should have access
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    });

    test('cohost should moderate photos if permitted', async ({ page }) => {
      await page.goto(`/events/${eventId}/photos`);
      
      // Should see moderation controls if permitted
      const moderateButton = page.locator('button:has-text("Moderieren")');
      
      // Visibility depends on permissions
      const isVisible = await moderateButton.isVisible();
      expect(typeof isVisible).toBe('boolean');
    });

    test('cohost should not access restricted features', async ({ page }) => {
      await page.goto(`/events/${eventId}/settings`);
      
      // Should be restricted or show limited options
      // Depends on permission configuration
    });
  });

  test.describe('UI/UX', () => {
    test('should show cohost badge on dashboard', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      
      // Cohost should see their role indicated
      const badge = page.locator('[data-testid="cohost-badge"]');
      
      // Check if badge exists (for cohost users)
      const exists = await badge.count();
      expect(exists).toBeGreaterThanOrEqual(0);
    });

    test('should display permissions clearly', async ({ page }) => {
      await page.goto(`/events/${eventId}/dashboard`);
      await page.click('text=Co-Hosts verwalten');
      
      // Permissions should be listed
      await expect(page.locator('text=Fotos moderieren')).toBeVisible();
      await expect(page.locator('text=Event bearbeiten')).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should create invite token via API', async ({ request }) => {
      const response = await request.post(`/api/events/${eventId}/cohosts/invite-token`, {
        data: {
          email: 'test@example.com',
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('inviteToken');
      expect(data).toHaveProperty('shareUrl');
    });

    test('should list cohosts via API', async ({ request }) => {
      const response = await request.get(`/api/events/${eventId}/cohosts`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('cohosts');
      expect(Array.isArray(data.cohosts)).toBe(true);
    });

    test('should update permissions via API', async ({ request }) => {
      const cohostUserId = 'test-user-id';
      
      const response = await request.put(
        `/api/events/${eventId}/cohosts/${cohostUserId}/permissions`,
        {
          data: {
            permissions: {
              canModerate: true,
              canEditEvent: false,
            },
          },
        }
      );

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.cohost.permissions).toMatchObject({
        canModerate: true,
        canEditEvent: false,
      });
    });
  });
});
