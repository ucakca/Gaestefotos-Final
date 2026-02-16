import { test, expect } from '@playwright/test';
import { ensureBackendUp } from './ensureBackendUp';

/**
 * E2E Tests: Workflow Builder Phase 4
 *
 * - XState engine (tested via existing workflow-runtime tests — regression)
 * - Optimistic Concurrency Control (version conflict detection)
 * - Editing Sessions (soft-lock for multi-user)
 * - Sub-Workflow node type support
 */

const apiBase = (
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8001'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

interface TestCtx {
  db: any;
  userId: string;
  userId2: string;
  token: string;
  token2: string;
  workflowId: string | null;
}

async function seedTestData(unique: string): Promise<TestCtx> {
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  const db = new PrismaClient();

  const bcrypt = await import('bcryptjs');
  const hash = await (bcrypt as any).default.hash('test1234', 10);

  const user1 = await db.user.create({
    data: { email: `e2e-p4-a-${unique}@example.com`, name: 'Admin A', password: hash, role: 'ADMIN' },
  });
  const user2 = await db.user.create({
    data: { email: `e2e-p4-b-${unique}@example.com`, name: 'Admin B', password: hash, role: 'ADMIN' },
  });

  const jwtMod: any = await import('jsonwebtoken');
  const secret = process.env.JWT_SECRET || '';
  const sign = jwtMod?.sign || jwtMod?.default?.sign;

  const token1 = sign({ userId: user1.id, role: 'ADMIN' }, secret, { expiresIn: '1h' });
  const token2 = sign({ userId: user2.id, role: 'ADMIN' }, secret, { expiresIn: '1h' });

  return {
    db,
    userId: user1.id,
    userId2: user2.id,
    token: token1,
    token2: token2,
    workflowId: null,
  };
}

async function cleanup(ctx: TestCtx) {
  try {
    if (ctx.workflowId) {
      await ctx.db.workflowBackup.deleteMany({ where: { workflowId: ctx.workflowId } });
      await ctx.db.boothWorkflow.deleteMany({ where: { id: ctx.workflowId } });
    }
    await ctx.db.user.deleteMany({ where: { id: { in: [ctx.userId, ctx.userId2] } } });
  } finally {
    await ctx.db.$disconnect();
  }
}

// ─── Optimistic Concurrency Control ─────────────────────────────────────────

test.describe('Phase 4: Optimistic Concurrency Control', () => {
  let ctx: TestCtx;

  test.beforeAll(async () => {
    ctx = await seedTestData(`occ-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanup(ctx);
  });

  test('version conflict is detected on concurrent edits', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    // Create a workflow
    const createRes = await request.post(`${apiBase}/api/workflows`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: {
        name: 'OCC Test Workflow',
        steps: { nodes: [], edges: [] },
        flowType: 'CUSTOM',
      },
    });
    expect(createRes.status()).toBe(201);
    const { workflow } = await createRes.json();
    ctx.workflowId = workflow.id;
    const initialVersion = workflow.version;

    // User A updates with correct version
    const updateA = await request.put(`${apiBase}/api/workflows/${workflow.id}`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: { name: 'Updated by A', expectedVersion: initialVersion },
    });
    expect(updateA.status()).toBe(200);
    const bodyA = await updateA.json();
    expect(bodyA.workflow.version).toBe(initialVersion + 1);

    // User B tries to update with the OLD version → should get 409
    const updateB = await request.put(`${apiBase}/api/workflows/${workflow.id}`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
      data: { name: 'Updated by B', expectedVersion: initialVersion },
    });
    expect(updateB.status()).toBe(409);
    const bodyB = await updateB.json();
    expect(bodyB.code).toBe('VERSION_CONFLICT');
    expect(bodyB.currentVersion).toBe(initialVersion + 1);

    // User B retries with correct version → should succeed
    const updateB2 = await request.put(`${apiBase}/api/workflows/${workflow.id}`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
      data: { name: 'Updated by B (retry)', expectedVersion: initialVersion + 1 },
    });
    expect(updateB2.status()).toBe(200);
    const bodyB2 = await updateB2.json();
    expect(bodyB2.workflow.name).toBe('Updated by B (retry)');
    expect(bodyB2.workflow.version).toBe(initialVersion + 2);
  });

  test('update without expectedVersion still works (backward compatible)', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    if (!ctx.workflowId) test.skip(true, 'No workflow created');

    const res = await request.put(`${apiBase}/api/workflows/${ctx.workflowId}`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: { description: 'No version check' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.workflow.description).toBe('No version check');
  });
});

// ─── Editing Sessions ────────────────────────────────────────────────────────

test.describe('Phase 4: Editing Sessions', () => {
  let ctx: TestCtx;

  test.beforeAll(async () => {
    ctx = await seedTestData(`edit-${Date.now().toString(36)}`);
  });

  test.afterAll(async () => {
    await cleanup(ctx);
  });

  test('editing session lifecycle: claim → check → conflict → release', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    // Create a workflow
    const createRes = await request.post(`${apiBase}/api/workflows`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: {
        name: 'Edit Session Test',
        steps: { nodes: [], edges: [] },
        flowType: 'CUSTOM',
      },
    });
    expect(createRes.status()).toBe(201);
    const { workflow } = await createRes.json();
    ctx.workflowId = workflow.id;

    // 1. User A claims editing session
    const claimA = await request.post(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: { userName: 'Admin A' },
    });
    expect(claimA.status()).toBe(200);
    const claimABody = await claimA.json();
    expect(claimABody.editing).toBe(true);

    // 2. Check: shows Admin A is editing
    const check = await request.get(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
    });
    expect(check.status()).toBe(200);
    const checkBody = await check.json();
    expect(checkBody.editing).toBe(true);
    expect(checkBody.editingBy).toBe('Admin A');
    expect(checkBody.isMe).toBe(false);

    // 3. User B tries to claim → should get 423 Locked
    const claimB = await request.post(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
      data: { userName: 'Admin B' },
    });
    expect(claimB.status()).toBe(423);
    const claimBBody = await claimB.json();
    expect(claimBBody.code).toBe('EDITING_LOCKED');
    expect(claimBBody.editingBy).toBe('Admin A');

    // 4. User A releases session
    const releaseA = await request.delete(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token}` },
    });
    expect(releaseA.status()).toBe(200);

    // 5. Now User B can claim
    const claimB2 = await request.post(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
      data: { userName: 'Admin B' },
    });
    expect(claimB2.status()).toBe(200);

    // Cleanup
    await request.delete(`${apiBase}/api/workflows/${workflow.id}/editing`, {
      headers: { Authorization: `Bearer ${ctx.token2}` },
    });
  });
});

// ─── Sub-Workflow Node Type ──────────────────────────────────────────────────

test.describe('Phase 4: Sub-Workflow Support', () => {
  test('workflow with SUB_WORKFLOW node can be created and retrieved', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    // Seed admin
    const prisma = await import('@prisma/client');
    const { PrismaClient } = prisma as any;
    const db = new PrismaClient();
    const bcrypt = await import('bcryptjs');
    const hash = await (bcrypt as any).default.hash('test1234', 10);
    const unique = `sub-${Date.now().toString(36)}`;

    const user = await db.user.create({
      data: { email: `e2e-sub-${unique}@example.com`, name: 'Sub Admin', password: hash, role: 'ADMIN' },
    });

    const jwtMod: any = await import('jsonwebtoken');
    const sign = jwtMod?.sign || jwtMod?.default?.sign;
    const token = sign({ userId: user.id, role: 'ADMIN' }, process.env.JWT_SECRET || '', { expiresIn: '1h' });

    try {
      // Create parent workflow with SUB_WORKFLOW node
      const createRes = await request.post(`${apiBase}/api/workflows`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: 'Parent with Sub-Workflow',
          flowType: 'CUSTOM',
          steps: {
            nodes: [
              {
                id: 'trigger-1',
                type: 'workflowStep',
                position: { x: 0, y: 0 },
                data: {
                  type: 'TRIGGER_MANUAL',
                  label: 'Start',
                  category: 'trigger',
                  stepNumber: 1,
                  config: {},
                  color: '#000',
                  bgColor: '#fff',
                  borderColor: '#ccc',
                  icon: 'play',
                  outputs: [{ id: 'default', label: 'Weiter', type: 'default' }],
                },
              },
              {
                id: 'sub-1',
                type: 'workflowStep',
                position: { x: 300, y: 0 },
                data: {
                  type: 'SUB_WORKFLOW',
                  label: 'Nested Upload',
                  category: 'action',
                  stepNumber: 2,
                  config: {
                    workflowType: 'UPLOAD',
                    label: 'Upload Sub-Flow',
                    passData: true,
                  },
                  color: '#000',
                  bgColor: '#f0f0f0',
                  borderColor: '#ccc',
                  icon: 'workflow',
                  outputs: [
                    { id: 'default', label: 'Fertig', type: 'default' },
                    { id: 'skip', label: 'Übersprungen', type: 'skip' },
                  ],
                },
              },
              {
                id: 'done-1',
                type: 'workflowStep',
                position: { x: 600, y: 0 },
                data: {
                  type: 'AFTER_SHARE',
                  label: 'Fertig',
                  category: 'output',
                  stepNumber: 3,
                  config: { message: 'Alles erledigt!' },
                  color: '#000',
                  bgColor: '#e0ffe0',
                  borderColor: '#ccc',
                  icon: 'check',
                  outputs: [],
                },
              },
            ],
            edges: [
              { id: 'e1', source: 'trigger-1', target: 'sub-1', sourceHandle: 'default' },
              { id: 'e2', source: 'sub-1', target: 'done-1', sourceHandle: 'default' },
            ],
          },
        },
      });

      expect(createRes.status()).toBe(201);
      const { workflow } = await createRes.json();

      // Verify SUB_WORKFLOW node exists
      const subNode = workflow.steps.nodes.find((n: any) => n.data.type === 'SUB_WORKFLOW');
      expect(subNode).toBeTruthy();
      expect(subNode.data.config.workflowType).toBe('UPLOAD');

      // Retrieve and verify
      const getRes = await request.get(`${apiBase}/api/workflows/${workflow.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes.status()).toBe(200);
      const getBody = await getRes.json();
      const subNode2 = getBody.workflow.steps.nodes.find((n: any) => n.data.type === 'SUB_WORKFLOW');
      expect(subNode2).toBeTruthy();
      expect(subNode2.data.config.workflowType).toBe('UPLOAD');

      // Cleanup
      await db.boothWorkflow.deleteMany({ where: { id: workflow.id } });
    } finally {
      await db.user.deleteMany({ where: { id: user.id } });
      await db.$disconnect();
    }
  });
});

// ─── Event Bus (verified via existing workflow tests — regression) ───────────

test.describe('Phase 4: Regression — Existing Workflows Still Work', () => {
  test('UPLOAD workflow definition still valid after XState migration', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/UPLOAD`);
    expect(res.status()).toBe(200);
    const { workflow } = await res.json();

    expect(workflow.steps.nodes.length).toBeGreaterThanOrEqual(3);
    expect(workflow.steps.edges.length).toBeGreaterThanOrEqual(2);

    // Verify trigger node exists
    const trigger = workflow.steps.nodes.find((n: any) => n.data.type.startsWith('TRIGGER_'));
    expect(trigger).toBeTruthy();
  });

  test('GUESTBOOK workflow definition still valid', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/GUESTBOOK`);
    expect(res.status()).toBe(200);
    const { workflow } = await res.json();
    expect(workflow.steps.nodes.length).toBeGreaterThanOrEqual(3);
  });

  test('FACE_SEARCH workflow definition still valid', async ({ request }) => {
    await ensureBackendUp(request, apiBase);

    const res = await request.get(`${apiBase}/api/workflows/by-type/FACE_SEARCH`);
    expect(res.status()).toBe(200);
    const { workflow } = await res.json();
    expect(workflow.steps.nodes.length).toBeGreaterThanOrEqual(3);
  });
});
