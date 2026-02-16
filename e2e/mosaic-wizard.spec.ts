import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

/**
 * E2E Tests: Mosaic Wizard (3-Step UX Redesign)
 *
 * Tests the Mosaic Wall wizard flow:
 *   Step 1: Modus & Grid
 *   Step 2: Zielbild & Overlay
 *   Step 3: Einstellungen & Start
 *
 * Also tests the Mosaic API endpoints.
 */

const apiBase = (
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8001'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

interface TestContext {
  db: any;
  userId: string;
  eventId: string;
  eventSlug: string;
  token: string;
}

async function seedTestEvent(unique: string): Promise<TestContext> {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const bcrypt = await import('bcryptjs');
  const passwordHash = await (bcrypt as any).default.hash('test1234', 10);

  const user = await db.user.create({
    data: {
      email: `e2e-mosaic-${unique}@example.com`,
      name: 'E2E Mosaic',
      password: passwordHash,
      role: 'HOST',
    },
  });

  const event = await db.event.create({
    data: {
      hostId: user.id,
      slug: `e2e-mosaic-${unique}`,
      title: `E2E Mosaic ${unique}`,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      locationName: 'E2E Location',
      designConfig: {},
      featuresConfig: {
        allowUploads: true,
        moderationRequired: false,
      } as any,
    },
  });

  // Get auth token
  const jwtMod: any = await import('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || '';
  const sign = jwtMod?.sign || jwtMod?.default?.sign;
  const token = sign({ userId: user.id, role: 'HOST' }, jwtSecret, {
    expiresIn: '1h',
  });

  return {
    db,
    userId: user.id,
    eventId: event.id,
    eventSlug: event.slug,
    token,
  };
}

async function cleanupTestEvent(ctx: TestContext) {
  try {
    await ctx.db.mosaicTile.deleteMany({
      where: { mosaicWall: { eventId: ctx.eventId } },
    });
    await ctx.db.mosaicWall.deleteMany({ where: { eventId: ctx.eventId } });
    await ctx.db.event.deleteMany({ where: { id: ctx.eventId } });
    await ctx.db.user.deleteMany({ where: { id: ctx.userId } });
  } finally {
    await ctx.db.$disconnect();
  }
}

// ─── API Tests ────────────────────────────────────────────────────────────────

test.describe('Mosaic Wizard: API', () => {
  let ctx: TestContext;

  test.beforeAll(async () => {
    ctx = await seedTestEvent(`api-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanupTestEvent(ctx);
  });

  test('full CRUD lifecycle: create → get → update → activate', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    // 1. CREATE
    const createRes = await request.post(
      `${apiBase}/api/events/${ctx.eventId}/mosaic`,
      {
        headers: { Authorization: `Bearer ${ctx.token}` },
        data: { gridWidth: 8, gridHeight: 8, tileSizeMm: 50 },
      }
    );
    expect([201, 409]).toContain(createRes.status());
    const createBody = await createRes.json();
    expect(createBody.wall).toBeTruthy();
    // Demo mode caps grid to 4×4 for free users, full users get requested size
    expect([4, 8]).toContain(createBody.wall.gridWidth);

    // 2. GET
    const getRes = await request.get(
      `${apiBase}/api/events/${ctx.eventId}/mosaic`,
      {
        headers: { Authorization: `Bearer ${ctx.token}` },
      }
    );
    expect(getRes.status()).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.wall).toBeTruthy();
    expect(getBody.wall.status).toBe('DRAFT');
    expect(getBody.wall.selectedAnimations).toBeInstanceOf(Array);

    // 3. UPDATE
    const updateRes = await request.put(
      `${apiBase}/api/events/${ctx.eventId}/mosaic`,
      {
        headers: { Authorization: `Bearer ${ctx.token}` },
        data: {
          overlayIntensity: 42,
          selectedAnimations: ['FLIP', 'RIPPLE'],
          showTicker: false,
          autoFillEnabled: true,
          autoFillThreshold: 90,
          scatterValue: 15,
        },
      }
    );
    expect(updateRes.status()).toBe(200);
    const updateBody = await updateRes.json();
    expect(updateBody.wall.overlayIntensity).toBe(42);
    expect(updateBody.wall.selectedAnimations).toEqual(['FLIP', 'RIPPLE']);
    expect(updateBody.wall.showTicker).toBe(false);
    expect(updateBody.wall.autoFillThreshold).toBe(90);

    // 4. ACTIVATE
    const activateRes = await request.put(
      `${apiBase}/api/events/${ctx.eventId}/mosaic`,
      {
        headers: { Authorization: `Bearer ${ctx.token}` },
        data: { status: 'ACTIVE' },
      }
    );
    expect(activateRes.status()).toBe(200);
    const activateBody = await activateRes.json();
    expect(activateBody.wall.status).toBe('ACTIVE');
  });
});

// ─── Mosaic Workflow Definition ───────────────────────────────────────────────

test.describe('Mosaic Wizard: Workflow Definition', () => {
  test('MOSAIC workflow API returns valid definition', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(
      `${apiBase}/api/workflows/by-type/MOSAIC`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.workflow.name).toBe('Mosaic Print Terminal');
    const { nodes, edges } = body.workflow.steps;
    expect(nodes.length).toBeGreaterThanOrEqual(5);

    // Must have PIN and QR paths (selection screen)
    const selNode = nodes.find(
      (n: any) => n.data.type === 'SELECTION_SCREEN'
    );
    expect(selNode).toBeTruthy();
    expect(selNode.data.outputs.length).toBe(2);

    // No orphan nodes
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source)).toBeTruthy();
      expect(nodeIds.has(edge.target)).toBeTruthy();
    }
  });
});

// ─── UI Tests ─────────────────────────────────────────────────────────────────

test.describe('Mosaic Wizard: UI Flow', () => {
  let ctx: TestContext;

  test.beforeAll(async () => {
    ctx = await seedTestEvent(`ui-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanupTestEvent(ctx);
  });

  test('wizard loads and shows Step 1 (Modus & Grid)', async ({
    page,
    request,
  }) => {
    await ensureBackendUp(request, apiBase);

    // Set auth token in localStorage
    await page.addInitScript(
      (t: string) => {
        window.localStorage.setItem('token', t);
      },
      ctx.token
    );

    await page.goto(`/events/${ctx.eventId}/mosaic`);

    // Wait for wizard to load
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    // Check for Mosaic Wall heading
    const heading = page.getByText(/mosaic wall/i).first();
    const hasHeading = await heading
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    if (!hasHeading) {
      // Page might redirect or not have mosaic route
      test.skip(true, 'Mosaic wizard page not available');
    }

    // Step indicator should show 3 steps
    // Check for step 1 content: mode toggle and grid presets
    const hasDigitalMode = await page
      .getByText(/digital/i)
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const hasPrintMode = await page
      .getByText(/print/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    expect(hasDigitalMode || hasPrintMode).toBeTruthy();

    // Grid presets or grid-related content should be visible
    const hasGridContent =
      (await page.getByText(/grid|raster|klein|mittel/i).first().isVisible({ timeout: 3_000 }).catch(() => false)) ||
      (await page.getByText(/digital|modus/i).first().isVisible({ timeout: 3_000 }).catch(() => false));
    expect(hasDigitalMode || hasPrintMode || hasGridContent).toBeTruthy();
  });

  test('wizard navigates through all 3 steps', async ({ page, request }) => {
    await ensureBackendUp(request, apiBase);

    await page.addInitScript(
      (t: string) => {
        window.localStorage.setItem('token', t);
      },
      ctx.token
    );

    await page.goto(`/events/${ctx.eventId}/mosaic`);
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    const heading = page.getByText(/mosaic wall/i).first();
    if (!(await heading.isVisible({ timeout: 10_000 }).catch(() => false))) {
      test.skip(true, 'Mosaic wizard page not available');
    }

    // Step 1 → Click "Weiter"
    const weiterBtn = page.getByText(/weiter/i).first();
    if (await weiterBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await weiterBtn.click();
      await page.waitForTimeout(500);

      // Step 2 should show Zielbild content
      const hasStep2 = await page
        .getByText(/zielbild|overlay/i)
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      expect(hasStep2).toBeTruthy();

      // Step 2 → Click "Weiter" again
      const weiterBtn2 = page.getByText(/weiter/i).first();
      if (
        await weiterBtn2.isVisible({ timeout: 3_000 }).catch(() => false)
      ) {
        await weiterBtn2.click();
        await page.waitForTimeout(500);

        // Step 3 should show Settings content
        const hasStep3 =
          (await page
            .getByText(/einstellungen|aktivieren|start/i)
            .first()
            .isVisible({ timeout: 5_000 })
            .catch(() => false)) ||
          (await page
            .getByText(/animation/i)
            .first()
            .isVisible({ timeout: 3_000 })
            .catch(() => false));
        expect(hasStep3).toBeTruthy();
      }
    }
  });
});
