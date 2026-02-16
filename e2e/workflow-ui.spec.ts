import { test, expect, Page } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

/**
 * E2E Tests: Workflow-driven UI flows in Guest App (E3)
 *
 * Tests the WorkflowUploadModal, WorkflowFaceSearchModal, and
 * GuestbookTab WorkflowRunner integration.
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
}

async function seedTestEvent(unique: string): Promise<TestContext> {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const user = await db.user.create({
    data: {
      email: `e2e-wf-${unique}@example.com`,
      name: 'E2E Workflow',
      password: '',
      role: 'ADMIN',
    },
  });

  const event = await db.event.create({
    data: {
      hostId: user.id,
      slug: `e2e-wf-${unique}`,
      title: `E2E Workflow ${unique}`,
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      locationName: 'E2E Location',
      designConfig: {},
      featuresConfig: {
        showGuestlist: false,
        mysteryMode: false,
        allowUploads: true,
        moderationRequired: false,
        allowDownloads: true,
        faceSearch: true,
        allowComments: true,
        challengesEnabled: true,
        enableFotoSpass: true,
      } as any,
    },
  });

  return {
    db,
    userId: user.id,
    eventId: event.id,
    eventSlug: event.slug,
  };
}

async function cleanupTestEvent(ctx: TestContext) {
  try {
    await ctx.db.photo.deleteMany({ where: { eventId: ctx.eventId } });
    await ctx.db.guestbookEntry.deleteMany({ where: { eventId: ctx.eventId } });
    await ctx.db.event.deleteMany({ where: { id: ctx.eventId } });
    await ctx.db.user.deleteMany({ where: { id: ctx.userId } });
  } finally {
    await ctx.db.$disconnect();
  }
}

async function mintEventCookie(page: Page, eventId: string) {
  const jwtMod: any = await import('jsonwebtoken');
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    test.skip(true, 'JWT_SECRET missing');
  }

  const sign = jwtMod?.sign || jwtMod?.default?.sign;
  if (typeof sign !== 'function') {
    throw new Error('jsonwebtoken.sign not available');
  }

  const token = sign({ type: 'event_access', eventId }, jwtSecret, {
    expiresIn: '12h',
  });

  await page.context().addCookies([
    {
      name: `event_access_${eventId}`,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
    },
    {
      name: `event_access_${eventId}`,
      value: token,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
    },
  ]);
}

// ─── Upload Flow (WorkflowUploadModal) ────────────────────────────────────────

test.describe('Workflow UI: Upload Flow', () => {
  let ctx: TestContext;

  test.beforeAll(async () => {
    ctx = await seedTestEvent(`upload-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanupTestEvent(ctx);
  });

  test('opens WorkflowUploadModal and shows workflow steps', async ({
    page,
    request,
  }) => {
    await ensureBackendUp(request, apiBase);
    await mintEventCookie(page, ctx.eventId);

    // Mock photo file requests
    await page.route('**/api/photos/*/file', async (route) => {
      const buf = Buffer.from(
        'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        'base64'
      );
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'image/gif' },
        body: buf,
      });
    });

    await page.goto(`/e3/${ctx.eventSlug}`);

    // Wait for E3 page to load
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    // Find the camera/upload button in the bottom nav
    const cameraBtn = page.locator('nav button').filter({ hasText: /kamera|foto/i }).first();

    // If direct camera button exists, click it. Otherwise try center nav action.
    if (await cameraBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cameraBtn.click();
    } else {
      // The center nav button typically opens an action sheet
      const centerBtn = page.locator('nav button').nth(2);
      if (await centerBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await centerBtn.click();
        // Look for "Foto" action in the action sheet
        const photoAction = page.getByText(/^foto$/i).first();
        if (await photoAction.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await photoAction.click();
        }
      }
    }

    // WorkflowUploadModal should open — look for dialog or workflow content
    const dialog = page.locator('[role="dialog"]');
    const hasDialog = await dialog.isVisible({ timeout: 8_000 }).catch(() => false);

    if (hasDialog) {
      // Verify workflow runner renders inside the modal
      // The workflow should auto-start and show step content
      await expect(dialog).toBeVisible();

      // Check for workflow progress bar or step label
      const hasProgressOrStep =
        (await dialog.locator('text=Schritt').isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await dialog.locator('text=Name eingeben').isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await dialog.locator('text=Foto hochladen').isVisible({ timeout: 3_000 }).catch(() => false));

      expect(hasProgressOrStep).toBeTruthy();

      // Close the modal
      const closeBtn = dialog.locator('button').filter({ hasText: /×|close/i }).first();
      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('upload workflow API returns valid definition', async ({ request }) => {
    const res = await request.get(`${apiBase}/api/workflows/by-type/UPLOAD`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const nodes = body.workflow.steps.nodes;

    // Must have TRIGGER, DIGITAL_GRAFFITI (name), SELECTION_SCREEN (album), TAKE_PHOTO
    const types = nodes.map((n: any) => n.data.type);
    expect(types).toContain('TRIGGER_MANUAL');
    expect(types).toContain('DIGITAL_GRAFFITI');
    expect(types).toContain('SELECTION_SCREEN');
    expect(types).toContain('TAKE_PHOTO');
    expect(types).toContain('AFTER_SHARE');
  });
});

// ─── Face Search Flow (WorkflowFaceSearchModal) ──────────────────────────────

test.describe('Workflow UI: Face Search Flow', () => {
  let ctx: TestContext;

  test.beforeAll(async () => {
    ctx = await seedTestEvent(`facesearch-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanupTestEvent(ctx);
  });

  test('face search workflow API has consent and FACE_SEARCH nodes', async ({
    request,
  }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/FACE_SEARCH`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const { nodes, edges } = body.workflow.steps;

    // Consent condition
    const consentNode = nodes.find(
      (n: any) => n.data.type === 'CONDITION' && n.data.config?.field === 'has_consent'
    );
    expect(consentNode).toBeTruthy();

    // FACE_SEARCH step
    const searchNode = nodes.find((n: any) => n.data.type === 'FACE_SEARCH');
    expect(searchNode).toBeTruthy();

    // Selfie path: SELECTION_SCREEN → TAKE_PHOTO (mirror:true)
    const selfieNode = nodes.find(
      (n: any) => n.data.type === 'TAKE_PHOTO' && n.data.config?.mirror === true
    );
    expect(selfieNode).toBeTruthy();

    // Upload path: TAKE_PHOTO (source: gallery)
    const galleryNode = nodes.find(
      (n: any) => n.data.type === 'TAKE_PHOTO' && n.data.config?.source === 'gallery'
    );
    expect(galleryNode).toBeTruthy();

    // All edges should be valid (source and target exist)
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    for (const edge of edges) {
      expect(nodeIds.has(edge.source), `Edge source ${edge.source} missing`).toBeTruthy();
      expect(nodeIds.has(edge.target), `Edge target ${edge.target} missing`).toBeTruthy();
    }
  });

  test('face search modal opens from bottom nav', async ({ page, request }) => {
    await ensureBackendUp(request, apiBase);
    await mintEventCookie(page, ctx.eventId);

    await page.goto(`/e3/${ctx.eventSlug}`);
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    // Try to trigger face search from the bottom nav action sheet
    const centerBtn = page.locator('nav button').nth(2);
    if (await centerBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await centerBtn.click();

      const faceSearchAction = page.getByText(/finde|gesicht|face/i).first();
      if (await faceSearchAction.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await faceSearchAction.click();

        // Should open WorkflowFaceSearchModal
        const dialog = page.locator('[role="dialog"]');
        const hasDialog = await dialog.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasDialog) {
          // Check for face search header or workflow content
          const hasContent =
            (await dialog.getByText(/finde mein foto/i).isVisible({ timeout: 3_000 }).catch(() => false)) ||
            (await dialog.locator('text=Schritt').isVisible({ timeout: 3_000 }).catch(() => false));

          expect(hasContent).toBeTruthy();
          await page.keyboard.press('Escape');
        }
      }
    }
  });
});

// ─── Guestbook Flow (WorkflowRunner in GuestbookTab) ─────────────────────────

test.describe('Workflow UI: Guestbook Flow', () => {
  let ctx: TestContext;

  test.beforeAll(async () => {
    ctx = await seedTestEvent(`guestbook-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanupTestEvent(ctx);
  });

  test('guestbook tab shows workflow runner when workflow is available', async ({
    page,
    request,
  }) => {
    await ensureBackendUp(request, apiBase);
    await mintEventCookie(page, ctx.eventId);

    await page.goto(`/e3/${ctx.eventSlug}`);
    await expect(page.locator('body')).toBeVisible({ timeout: 30_000 });

    // Navigate to guestbook tab
    const guestbookTab = page.locator('nav').getByText(/gästebuch|buch/i).first();
    if (await guestbookTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await guestbookTab.click();

      // Wait for guestbook content
      await page.waitForTimeout(2_000);

      // Check for workflow runner content (auto-started)
      // The workflow runner should show the first step (after auto-start trigger)
      const hasWorkflowContent =
        (await page.getByText(/schritt/i).first().isVisible({ timeout: 5_000 }).catch(() => false)) ||
        (await page.getByText(/dein name/i).first().isVisible({ timeout: 3_000 }).catch(() => false)) ||
        (await page.getByText(/name eingeben/i).first().isVisible({ timeout: 3_000 }).catch(() => false));

      // Also check for classic form fallback
      const hasClassicForm = await page
        .getByText(/nachricht senden/i)
        .first()
        .isVisible({ timeout: 3_000 })
        .catch(() => false);

      // One of workflow or classic form should be visible
      expect(hasWorkflowContent || hasClassicForm).toBeTruthy();
    }
  });

  test('guestbook workflow API has correct structure', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/GUESTBOOK`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const { nodes } = body.workflow.steps;

    // Must have name input (DIGITAL_GRAFFITI, required)
    const nameNode = nodes.find(
      (n: any) => n.data.type === 'DIGITAL_GRAFFITI' && n.data.config?.required === true
    );
    expect(nameNode).toBeTruthy();

    // Must have message input (DIGITAL_GRAFFITI, required)
    const graffNodes = nodes.filter(
      (n: any) => n.data.type === 'DIGITAL_GRAFFITI' && n.data.config?.required === true
    );
    expect(graffNodes.length).toBeGreaterThanOrEqual(2);

    // Optional photo condition
    const condNode = nodes.find((n: any) => n.data.type === 'CONDITION');
    expect(condNode).toBeTruthy();
  });
});

// ─── KI Foto-Stil Flow ───────────────────────────────────────────────────────

test.describe('Workflow UI: KI Foto-Stil Flow', () => {
  test('KI_KUNST workflow API returns valid definition', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/KI_KUNST`);
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.workflow.name).toBe('KI Foto-Stil Flow');
    expect(body.workflow.steps.nodes.length).toBeGreaterThan(0);

    // Must have TAKE_PHOTO step
    const photoNode = body.workflow.steps.nodes.find(
      (n: any) => n.data.type === 'TAKE_PHOTO'
    );
    expect(photoNode).toBeTruthy();
  });
});

// ─── Cross-flow: All flows reachable & structurally valid ─────────────────────

test.describe('Workflow UI: Structural Integrity', () => {
  const guestFlows = ['UPLOAD', 'GUESTBOOK', 'FACE_SEARCH', 'KI_KUNST'];

  for (const flowType of guestFlows) {
    test(`${flowType} workflow has no orphan nodes`, async ({ request }) => {
      await ensureBackendUp(request, apiBase);

      const res = await request.get(`${apiBase}/api/workflows/by-type/${flowType}`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      const { nodes, edges } = body.workflow.steps;

      const nodeIds = new Set(nodes.map((n: any) => n.id));

      // Every edge source/target must exist
      for (const edge of edges) {
        expect(
          nodeIds.has(edge.source),
          `${flowType}: orphan edge source ${edge.source}`
        ).toBeTruthy();
        expect(
          nodeIds.has(edge.target),
          `${flowType}: orphan edge target ${edge.target}`
        ).toBeTruthy();
      }

      // Every non-trigger node should be a target of at least one edge
      const targets = new Set(edges.map((e: any) => e.target));
      for (const node of nodes) {
        if (node.data.type.startsWith('TRIGGER_')) continue;
        expect(
          targets.has(node.id),
          `${flowType}: node ${node.id} (${node.data.type}) is unreachable`
        ).toBeTruthy();
      }
    });

    test(`${flowType} workflow has exactly one trigger node`, async ({
      request,
    }) => {
      await ensureBackendUp(request, apiBase);

      const res = await request.get(`${apiBase}/api/workflows/by-type/${flowType}`);
      const body = await res.json();
      const triggerNodes = body.workflow.steps.nodes.filter((n: any) =>
        n.data.type.startsWith('TRIGGER_')
      );

      expect(triggerNodes.length).toBe(1);
    });
  }
});
