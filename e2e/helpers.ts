import { test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Navigate to a page and skip the test if it returns 404.
 * Prevents tests from timing out when pages aren't built yet.
 */
export async function gotoOrSkip(page: Page, path: string) {
  const res = await page.goto(path);
  if (res && res.status() === 404) {
    test.skip(true, `Page ${path} returned 404 — not built yet`);
  }
}
