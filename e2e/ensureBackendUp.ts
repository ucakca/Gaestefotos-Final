import { test } from '@playwright/test';

export async function ensureBackendUp(request: any, apiBase: string) {
  const startedAt = Date.now();
  const deadlineMs = 30_000;
  const pollMs = 1_000;

  while (Date.now() - startedAt < deadlineMs) {
    try {
      const res = await request.get(`${apiBase}/api-docs`);
      const status = res.status();
      if (status < 500) {
        return;
      }
    } catch {
      // keep polling
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  test.skip(true, `Backend not reachable: ${apiBase} (timeout waiting for /api-docs)`);
}
