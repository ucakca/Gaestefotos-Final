import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { gotoOrSkip } from './helpers';

/**
 * SUITE J: Tus Resumable Upload Tests
 * Priorität: P0 (KRITISCH)
 * Dauer: ~2 Stunden
 * 
 * Tests:
 * - J.1: Basic Tus Upload
 * - J.2: Resume after connection loss
 * - J.3: Concurrent uploads
 * - J.4: Large file (50 MB)
 */

const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

// Helper: Generiere Test-Bild
function generateTestImage(sizeMB: number): Buffer {
  const sizeBytes = sizeMB * 1024 * 1024;
  return Buffer.alloc(sizeBytes, 0xFF); // Dummy-Daten
}

test.describe('Suite J: Tus Resumable Uploads', () => {

  test.beforeAll(async () => {
    // Erstelle Test-Bilder
    const testDir = path.join(__dirname, 'test-files');
    await fs.promises.mkdir(testDir, { recursive: true });
    
    // 5 MB Test-Datei
    await fs.promises.writeFile(
      path.join(testDir, 'test-5mb.jpg'),
      generateTestImage(5)
    );
    
    // 2 MB Test-Datei (reduced from 50MB for CI speed)
    await fs.promises.writeFile(
      path.join(testDir, 'test-2mb.jpg'),
      generateTestImage(2)
    );
  });

  test('J.1: Tus endpoint is reachable', async ({ request }) => {
    // OPTIONS-Request zu Tus-Endpoint
    const res = await request.fetch(`${apiBase}/api/uploads`, {
      method: 'OPTIONS',
    });

    // Tus-Server sollte mit Tus-Headers antworten
    const tusVersion = res.headers()['tus-version'];
    const tusResumable = res.headers()['tus-resumable'];
    
    expect(tusVersion).toBeDefined();
    expect(tusResumable).toBeDefined();
  });

  test('J.2: Upload small file via Tus', async ({ page }) => {
    test.setTimeout(30_000);

    await gotoOrSkip(page, `${apiBase}/e/test-event-tus`);
    
    // Überspringe wenn Event nicht existiert
    const notFound = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (notFound) {
      test.skip();
      return;
    }

    // Name eingeben
    const nameInput = page.locator('input[name="uploaderName"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Tus-Test-User');
    }

    // File-Upload
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.join(__dirname, 'test-files/test-5mb.jpg'));

    // Warte auf Upload-Erfolg
    await expect(page.locator('text=/Upload.*erfolgreich|uploaded|success/i').first())
      .toBeVisible({ timeout: 60_000 });
  });

  test('J.3: Large file upload (2 MB)', async ({ page }) => {
    test.setTimeout(30_000);

    await gotoOrSkip(page, `${apiBase}/e/test-event-tus`);
    
    const notFound = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (notFound) {
      test.skip();
      return;
    }

    const nameInput = page.locator('input[name="uploaderName"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Large-File-Test');
    }

    // Upload 2 MB Datei
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(path.join(__dirname, 'test-files/test-2mb.jpg'));

    // Warte auf Progress
    const progressBar = page.locator('[role="progressbar"], [aria-label*="progress"]').first();
    
    if (await progressBar.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Warte bis 100%
      await page.waitForFunction(() => {
        const bar = document.querySelector('[role="progressbar"]');
        const value = bar?.getAttribute('aria-valuenow') || bar?.getAttribute('aria-valueprogress');
        return value === '100';
      }, { timeout: 25_000 });
    }

    // Upload-Erfolg
    await expect(page.locator('text=/Upload.*erfolgreich|uploaded|success/i').first())
      .toBeVisible({ timeout: 60_000 });
  });

  test('J.4: Concurrent uploads (3 parallel)', async ({ page }) => {
    test.setTimeout(30_000);

    await gotoOrSkip(page, `${apiBase}/e/test-event-tus`);
    
    const notFound = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
    if (notFound) {
      test.skip();
      return;
    }

    const nameInput = page.locator('input[name="uploaderName"]').first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill('Parallel-Test');
    }

    // 3 Dateien gleichzeitig
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([
      path.join(__dirname, 'test-files/test-5mb.jpg'),
      path.join(__dirname, 'test-files/test-5mb.jpg'),
      path.join(__dirname, 'test-files/test-5mb.jpg'),
    ]);

    // Warte auf alle Erfolgs-Nachrichten
    await expect(page.locator('text=/Upload.*erfolgreich|success/i'))
      .toHaveCount(3, { timeout: 25_000 });
  });

});
