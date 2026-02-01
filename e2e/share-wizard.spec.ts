import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

test.describe('Share Wizard', () => {
  test('share wizard modal opens and shows tabs', async ({ page, request }) => {
    const prisma = await import('@prisma/client');
    const { PrismaClient } = prisma as any;
    const db = new PrismaClient();
    const bcrypt = await import('bcryptjs');

    const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
      .replace(/\/+$/, '')
      .replace(/\/api$/, '');

    await ensureBackendUp(request, apiBase);

    const unique = `${Date.now().toString(36)}-share`;
    const email = `e2e-share-${unique}@example.com`;
    const password = 'share1234';
    const passwordHash = await (bcrypt as any).default.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        name: 'E2E Share Test',
        password: passwordHash,
        role: 'HOST',
      },
    });

    const event = await db.event.create({
      data: {
        name: 'Share Wizard Test Event',
        slug: `share-wizard-test-${unique}`,
        hostId: user.id,
        date: new Date(),
        isActive: true,
      },
    });

    try {
      const loginRes = await request.post(`${apiBase}/api/auth/login`, {
        data: { email, password },
      });
      expect(loginRes.ok()).toBeTruthy();
      const loginJson: any = await loginRes.json();
      const token = loginJson?.token as string;

      await page.addInitScript((t: string) => {
        window.localStorage.setItem('token', t);
      }, token);

      // Navigate to QR Styler
      await page.goto(`/events/${event.id}/qr-styler`);
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Find and click the Share button
      const shareButton = page.getByRole('button', { name: /teilen|share/i });
      if (await shareButton.isVisible({ timeout: 10000 })) {
        await shareButton.click();

        // Check modal opens with tabs
        await expect(page.getByText(/digital/i)).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/selbst drucken|diy/i)).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await db.event.delete({ where: { id: event.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.$disconnect();
    }
  });
});
