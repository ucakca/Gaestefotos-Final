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

const backendPort = process.env.E2E_BACKEND_PORT || '8011';

const apiBaseForFrontend = (() => {
  try {
    const u = new URL(apiBase);
    // E2E: use localhost so the browser Origin matches the backend's allowedOrigins defaults.
    if (u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0') u.hostname = 'localhost';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return apiBase;
  }
})();

const frontendEnv = `NODE_ENV=development ${frontendPort ? `PORT=${frontendPort} ` : ''}NEXT_PUBLIC_API_URL=${apiBaseForFrontend} API_URL=${apiBaseForFrontend} NEXT_PUBLIC_WS_URL=${apiBaseForFrontend} NEXT_PUBLIC_DISABLE_REALTIME=true`.trim();
const backendDatabaseUrl = process.env.DATABASE_URL || process.env.E2E_DATABASE_URL || '';
const backendEnv = `E2E=true NODE_ENV=development PORT=${backendPort}${backendDatabaseUrl ? ` DATABASE_URL=${backendDatabaseUrl}` : ''}`.trim();

export default defineConfig({
  testDir: './e2e',
  workers: process.env.CI ? undefined : 1,
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
