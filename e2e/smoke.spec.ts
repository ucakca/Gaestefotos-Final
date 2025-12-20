import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

test('smoke: login -> dashboard loads', async ({ page, request }) => {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const bcrypt = await import('bcryptjs');

  const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '');

  await ensureBackendUp(request, apiBase);

  const unique = `${Date.now().toString(36)}-smoke`;
  const email = `e2e-smoke-${unique}@example.com`;
  const password = 'smoke1234';
  const passwordHash = await (bcrypt as any).default.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      name: 'E2E Smoke',
      password: passwordHash,
      role: 'HOST',
    },
  });

  try {
    const loginRes = await request.post(`${apiBase}/api/auth/login`, {
      data: { email, password },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson: any = await loginRes.json();
    const token = loginJson?.token as string;
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    await page.addInitScript((t: string) => {
      window.localStorage.setItem('token', t);
    }, token);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard(\?.*)?$/);

    // Dashboard page always renders the welcome heading when loaded.
    await expect(page.getByText('Willkommen zurück!')).toBeVisible({ timeout: 30_000 });
  } finally {
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
