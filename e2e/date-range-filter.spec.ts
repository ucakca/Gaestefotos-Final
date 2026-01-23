import { test, expect } from '@playwright/test';

test.describe('DateRangeFilter', () => {
  test.beforeEach(async ({ page }) => {
    // Login as host
    await page.goto('/login');
    await page.fill('input[type="email"]', 'host@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/events');
  });

  test('should render date range filter in photos page', async ({ page }) => {
    // Navigate to photos page
    await page.click('text=Mein Event'); // First event
    await page.click('text=Fotos');
    
    // Check if DateRangeFilter is visible
    await expect(page.locator('input[type="date"]').first()).toBeVisible();
    await expect(page.locator('text=bis')).toBeVisible();
    await expect(page.locator('button:has-text("Anwenden")')).toBeVisible();
  });

  test('should filter photos by date range', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Select start date
    await page.fill('input[type="date"]', '2026-01-01');
    
    // Select end date
    await page.locator('input[type="date"]').nth(1).fill('2026-01-31');
    
    // Apply filter
    await page.click('button:has-text("Anwenden")');
    
    // Wait for API call
    await page.waitForResponse(response => 
      response.url().includes('/photos') && 
      response.url().includes('startDate=2026-01-01') &&
      response.url().includes('endDate=2026-01-31')
    );
    
    // Verify photos are filtered
    const photoGrid = page.locator('[data-testid="photo-grid"]');
    await expect(photoGrid).toBeVisible();
  });

  test('should clear date range filter', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Apply filter first
    await page.fill('input[type="date"]', '2026-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-01-31');
    await page.click('button:has-text("Anwenden")');
    
    // Clear filter
    await page.click('button[aria-label="Zurücksetzen"]');
    
    // Wait for API call without date params
    await page.waitForResponse(response => 
      response.url().includes('/photos') && 
      !response.url().includes('startDate')
    );
    
    // Verify inputs are cleared
    const startInput = page.locator('input[type="date"]').first();
    await expect(startInput).toHaveValue('');
  });

  test('should combine date range with status filter', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Select status filter
    await page.click('button:has-text("Genehmigt")');
    
    // Apply date range
    await page.fill('input[type="date"]', '2026-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-01-31');
    await page.click('button:has-text("Anwenden")');
    
    // Wait for API call with both params
    await page.waitForResponse(response => 
      response.url().includes('/photos') && 
      response.url().includes('startDate=2026-01-01') &&
      response.url().includes('status=APPROVED')
    );
  });

  test('should validate end date is after start date', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Set end date before start date
    await page.fill('input[type="date"]', '2026-01-31');
    await page.locator('input[type="date"]').nth(1).fill('2026-01-01');
    
    // Try to apply
    await page.click('button:has-text("Anwenden")');
    
    // Should show validation error or not trigger API
    // (Implementation dependent - adjust based on actual behavior)
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/photos')) {
        apiCalls.push(request.url());
      }
    });
    
    // Wait a bit to see if API is called
    await page.waitForTimeout(500);
    
    // Verify no invalid API call was made
    const invalidCalls = apiCalls.filter(url => 
      url.includes('startDate=2026-01-31') && url.includes('endDate=2026-01-01')
    );
    expect(invalidCalls).toHaveLength(0);
  });

  test('should not show date range filter in trash view', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Switch to trash view
    await page.click('button:has-text("Papierkorb")');
    
    // DateRangeFilter should not be visible
    await expect(page.locator('text=bis')).not.toBeVisible();
  });

  test('should persist date range when switching between filters', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Set date range
    await page.fill('input[type="date"]', '2026-01-01');
    await page.locator('input[type="date"]').nth(1).fill('2026-01-31');
    await page.click('button:has-text("Anwenden")');
    
    // Switch status filter
    await page.click('button:has-text("Ausstehend")');
    
    // Date inputs should still have values
    const startInput = page.locator('input[type="date"]').first();
    await expect(startInput).toHaveValue('2026-01-01');
    
    const endInput = page.locator('input[type="date"]').nth(1);
    await expect(endInput).toHaveValue('2026-01-31');
  });

  test('should format date for API correctly', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Set dates
    await page.fill('input[type="date"]', '2026-01-15');
    await page.locator('input[type="date"]').nth(1).fill('2026-01-20');
    
    // Apply and capture API call
    const [request] = await Promise.all([
      page.waitForRequest(request => 
        request.url().includes('/photos') && 
        request.url().includes('startDate')
      ),
      page.click('button:has-text("Anwenden")'),
    ]);
    
    // Verify correct date format (YYYY-MM-DD)
    const url = request.url();
    expect(url).toContain('startDate=2026-01-15');
    expect(url).toContain('endDate=2026-01-20');
    expect(url).not.toContain('T'); // No timestamp
  });

  test('should reload photos when date range changes', async ({ page }) => {
    await page.goto('/events/test-event/photos');
    
    // Count initial API calls
    let apiCallCount = 0;
    page.on('request', request => {
      if (request.url().includes('/photos')) {
        apiCallCount++;
      }
    });
    
    // Apply first date range
    await page.fill('input[type="date"]', '2026-01-01');
    await page.click('button:has-text("Anwenden")');
    await page.waitForTimeout(500);
    
    const firstCallCount = apiCallCount;
    
    // Change date range
    await page.fill('input[type="date"]', '2026-01-15');
    await page.click('button:has-text("Anwenden")');
    await page.waitForTimeout(500);
    
    // Should have made additional API call
    expect(apiCallCount).toBeGreaterThan(firstCallCount);
  });
});
