import { test, expect } from '@playwright/test';

/**
 * SUITE H: Load Tests (Simplified)
 * Priorität: P0 (KRITISCH)
 * Dauer: ~1 Stunde
 * 
 * Simplified version - tests basic load scenarios
 * For full load testing, use Artillery (see load-tests/ directory)
 */

const apiBase = (process.env.E2E_API_URL || 'https://app.gästefotos.com/api')
  .replace(/\/api$/, '');

test.describe('Suite H: Load Tests (Simplified)', () => {

  test('H.1: API handles 20 concurrent requests', async ({ request }) => {
    test.setTimeout(60_000);

    const promises = [];
    
    // 20 parallele Health-Checks
    for (let i = 0; i < 20; i++) {
      promises.push(
        request.get(`${apiBase}/api/health`)
      );
    }

    const results = await Promise.all(promises);
    
    // Alle sollten erfolgreich sein
    const successCount = results.filter(r => r.ok()).length;
    expect(successCount).toBe(20);

    // Response-Zeit sollte akzeptabel sein
    for (const res of results) {
      const timing = res.headers()['x-response-time'];
      if (timing) {
        const ms = parseFloat(timing);
        expect(ms).toBeLessThan(1000); // < 1 Sekunde
      }
    }
  });

  test('H.2: Multiple users can browse events simultaneously', async ({ browser }) => {
    test.setTimeout(120_000);

    // 10 parallele Browser-Contexts (simuliert 10 User)
    const contexts = await Promise.all(
      Array.from({ length: 10 }, () => browser.newContext())
    );

    const pages = await Promise.all(
      contexts.map(ctx => ctx.newPage())
    );

    // Alle laden gleichzeitig die Homepage
    await Promise.all(
      pages.map(page => page.goto(`${apiBase}/`))
    );

    // Alle sollten laden
    for (const page of pages) {
      await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
    }

    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
  });

  test('H.3: API remains responsive under moderate load', async ({ request }) => {
    test.setTimeout(120_000);

    // 50 Requests über 10 Sekunden (5 RPS)
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < 50; i++) {
      const reqStart = Date.now();
      const res = await request.get(`${apiBase}/api/health`);
      const reqEnd = Date.now();
      
      results.push({
        status: res.status(),
        latency: reqEnd - reqStart,
      });

      // Throttle: 100ms zwischen Requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Metrics
    const successCount = results.filter(r => r.status === 200).length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const p95Latency = results.map(r => r.latency).sort((a, b) => a - b)[Math.floor(results.length * 0.95)];

    console.log(`
    📊 Load Test Metrics:
    - Total Duration: ${totalDuration}ms
    - Success Rate: ${(successCount / 50 * 100).toFixed(1)}%
    - Avg Latency: ${avgLatency.toFixed(0)}ms
    - p95 Latency: ${p95Latency}ms
    `);

    // Assertions
    expect(successCount).toBeGreaterThan(45); // > 90% Success
    expect(avgLatency).toBeLessThan(500);     // < 500ms average
    expect(p95Latency).toBeLessThan(1000);    // < 1s p95
  });

});
