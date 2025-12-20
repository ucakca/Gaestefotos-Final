import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const shouldStartWebServer = process.env.E2E_START_WEB_SERVER !== 'false';

const frontendPort = (() => {
  try {
    const u = new URL(baseURL);
    return u.port;
  } catch {
    return '';
  }
})();

const apiBase = (process.env.E2E_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const apiBaseForFrontend = (() => {
  try {
    const u = new URL(apiBase);
    // Access cookies are scoped to the backend host; the frontend uses localhost in dev.
    // Ensure shortlink resolution and invitation fetch hit the same host so cookies apply.
    if (u.hostname === '127.0.0.1') u.hostname = 'localhost';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return apiBase;
  }
})();

const frontendEnv = `${frontendPort ? `PORT=${frontendPort} ` : ''}NEXT_PUBLIC_API_URL=${apiBaseForFrontend} API_URL=${apiBaseForFrontend}`.trim();
const backendEnv = 'PORT=8001';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: shouldStartWebServer
    ? {
        command: `bash -lc "${frontendEnv} pnpm --filter frontend dev & ${backendEnv} pnpm --filter backend dev"`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
