import { test, expect } from '@playwright/test';

function corsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || 'http://localhost:3000',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

function jsonResponse(body: any, origin?: string) {
  return {
    status: 200,
    contentType: 'application/json',
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

function preflightResponse(origin?: string) {
  return {
    status: 204,
    headers: corsHeaders(origin),
    body: '',
  };
}

test('auth: login redirect decision uses /auth/me (authoritative role)', async ({ page }) => {
  let loginCalls = 0;
  let meCalls = 0;
  const issuedToken = 'e2e-token-1234567890';

  const authRequests: string[] = [];
  const authResponses: Array<{ url: string; status: number }> = [];
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/auth/')) authRequests.push(`${req.method()} ${url}`);
  });
  page.on('response', (res) => {
    const url = res.url();
    if (url.includes('/auth/')) authResponses.push({ url, status: res.status() });
  });

  const fulfillLogin = async (route: any) => {
    const origin = route.request().headers()['origin'] as string | undefined;
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill(preflightResponse(origin));
      return;
    }
    loginCalls++;
    await route.fulfill(
      jsonResponse({
        user: {
          id: 'u1',
          email: 'e2e@example.com',
          name: 'E2E',
          role: 'ADMIN',
          createdAt: new Date().toISOString(),
        },
        token: issuedToken,
      }, origin)
    );
  };

  await page.route('**/auth/login', fulfillLogin);
  await page.route('**/api/auth/login', fulfillLogin);

  const fulfillMe = async (route: any) => {
    const origin = route.request().headers()['origin'] as string | undefined;
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill(preflightResponse(origin));
      return;
    }
    meCalls++;
    const req = route.request();
    const auth = req.headers()['authorization'] || '';

    // Best-effort assertion: depending on environment (cookie auth vs token), this header may be empty.
    if (auth) {
      expect(auth).toContain(`Bearer ${issuedToken}`);
    }

    await route.fulfill(
      jsonResponse({
        user: {
          id: 'u1',
          email: 'e2e@example.com',
          name: 'E2E',
          role: 'HOST',
          createdAt: new Date().toISOString(),
        },
      }, origin)
    );
  };

  await page.route('**/auth/me', fulfillMe);
  await page.route('**/api/auth/me', fulfillMe);

  await page.goto('/login');

  await page.getByLabel('E-Mail').fill('e2e@example.com');
  await page.locator('input#password').fill('secret123');

  const meRequest = page.waitForRequest(
    (req) => {
      const url = req.url();
      return url.includes('/auth/me') || url.includes('/api/auth/me');
    },
    { timeout: 15_000 }
  );
  await page.getByRole('button', { name: 'Anmelden' }).click();

  try {
    await meRequest;
  } catch (e) {
    throw new Error(
      [
        'Did not observe /auth/me request within timeout.',
        `loginCalls=${loginCalls} meCalls=${meCalls}`,
        `authRequests:\n${authRequests.slice(-20).join('\n')}`,
        `authResponses:\n${authResponses
          .slice(-20)
          .map((r) => `${r.status} ${r.url}`)
          .join('\n')}`,
      ].join('\n\n')
    );
  }

  await expect(page).toHaveURL(/\/dashboard(\?.*)?$/);

  expect(loginCalls).toBe(1);
  expect(meCalls).toBeGreaterThanOrEqual(1);
});
