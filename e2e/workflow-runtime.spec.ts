import { test, expect } from '@playwright/test';

const API_BASE = process.env.E2E_API_URL || 'http://localhost:8001';

test.describe('Workflow Runtime API', () => {
  test('GET /api/workflows/by-type/GUESTBOOK returns guestbook workflow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/GUESTBOOK`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow).toBeTruthy();
    expect(body.workflow.name).toBe('Gästebuch Flow');
    expect(body.workflow.flowType).toBe('GUESTBOOK');
    expect(body.workflow.steps).toBeTruthy();
    expect(body.workflow.steps.nodes).toBeInstanceOf(Array);
    expect(body.workflow.steps.edges).toBeInstanceOf(Array);
    expect(body.workflow.steps.nodes.length).toBeGreaterThan(0);
  });

  test('GET /api/workflows/by-type/UPLOAD returns upload workflow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/UPLOAD`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow.name).toBe('Upload Flow');
    expect(body.workflow.flowType).toBe('UPLOAD');
  });

  test('GET /api/workflows/by-type/FACE_SEARCH returns face search workflow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/FACE_SEARCH`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow.name).toBe('Face Search Flow');
    expect(body.workflow.steps.nodes.length).toBeGreaterThanOrEqual(5);
  });

  test('GET /api/workflows/by-type/FOTO_SPIEL returns foto-spass workflow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/FOTO_SPIEL`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow.name).toBe('Foto-Spaß Flow');
  });

  test('GET /api/workflows/by-type/MOSAIC returns mosaic print terminal workflow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/MOSAIC`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow.name).toBe('Mosaic Print Terminal');
  });

  test('GET /api/workflows/by-type/BOOTH returns photo booth template', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/BOOTH`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.workflow.name).toContain('Photo Booth');
  });

  test('GET /api/workflows/by-type/NONEXISTENT returns 404', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/NONEXISTENT`);
    expect(res.status()).toBe(404);
  });

  test('Guestbook workflow has correct node structure', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/GUESTBOOK`);
    const body = await res.json();
    const { nodes, edges } = body.workflow.steps;

    // Verify start node exists (gb1 = TRIGGER_MANUAL)
    const startNode = nodes.find((n: any) => n.id === 'gb1');
    expect(startNode).toBeTruthy();
    expect(startNode.data.type).toBe('TRIGGER_MANUAL');

    // Verify name input (gb2 = DIGITAL_GRAFFITI, required)
    const nameNode = nodes.find((n: any) => n.id === 'gb2');
    expect(nameNode).toBeTruthy();
    expect(nameNode.data.type).toBe('DIGITAL_GRAFFITI');
    expect(nameNode.data.config.required).toBe(true);

    // Verify message input (gb3 = DIGITAL_GRAFFITI, required)
    const messageNode = nodes.find((n: any) => n.id === 'gb3');
    expect(messageNode).toBeTruthy();
    expect(messageNode.data.type).toBe('DIGITAL_GRAFFITI');
    expect(messageNode.data.config.required).toBe(true);

    // Verify photo is optional via CONDITION node (gb4)
    const conditionNode = nodes.find((n: any) => n.id === 'gb4');
    expect(conditionNode).toBeTruthy();
    expect(conditionNode.data.type).toBe('CONDITION');

    // Verify edges: gb1 → gb2 → gb3 → gb4
    const edgeFrom1to2 = edges.find((e: any) => e.source === 'gb1' && e.target === 'gb2');
    expect(edgeFrom1to2).toBeTruthy();

    const edgeFrom2to3 = edges.find((e: any) => e.source === 'gb2' && e.target === 'gb3');
    expect(edgeFrom2to3).toBeTruthy();

    const edgeFrom3to4 = edges.find((e: any) => e.source === 'gb3' && e.target === 'gb4');
    expect(edgeFrom3to4).toBeTruthy();

    // Two paths from condition: with photo (gb5) and without (gb6)
    const conditionEdges = edges.filter((e: any) => e.source === 'gb4');
    expect(conditionEdges.length).toBe(2);
  });

  test('Mosaic workflow has PIN and QR paths', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/MOSAIC`);
    const body = await res.json();
    const { nodes, edges } = body.workflow.steps;

    // Selection screen with PIN and QR outputs
    const selectionNode = nodes.find((n: any) => n.id === 'pt2');
    expect(selectionNode).toBeTruthy();
    expect(selectionNode.data.type).toBe('SELECTION_SCREEN');
    expect(selectionNode.data.outputs.length).toBe(2);

    // PIN path
    const pinEdge = edges.find((e: any) => e.source === 'pt2' && e.target === 'pt3');
    expect(pinEdge).toBeTruthy();

    // QR path
    const qrEdge = edges.find((e: any) => e.source === 'pt2' && e.target === 'pt4');
    expect(qrEdge).toBeTruthy();

    // Both merge into condition check
    const pinToCondition = edges.find((e: any) => e.source === 'pt3' && e.target === 'pt5');
    expect(pinToCondition).toBeTruthy();
    const qrToCondition = edges.find((e: any) => e.source === 'pt4' && e.target === 'pt5');
    expect(qrToCondition).toBeTruthy();
  });

  test('Face Search workflow has consent check', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/workflows/by-type/FACE_SEARCH`);
    const body = await res.json();
    const { nodes } = body.workflow.steps;

    // f2 = CONDITION for consent
    const consentNode = nodes.find((n: any) => n.id === 'f2');
    expect(consentNode).toBeTruthy();
    expect(consentNode.data.type).toBe('CONDITION');
    expect(consentNode.data.config.field).toBe('has_consent');

    // f6 = FACE_SEARCH step
    const searchNode = nodes.find((n: any) => n.data.type === 'FACE_SEARCH');
    expect(searchNode).toBeTruthy();
  });

  test('All 11 workflows are seeded and accessible', async ({ request }) => {
    const flowTypes = [
      'UPLOAD', 'GUESTBOOK', 'FACE_SEARCH', 'FOTO_SPIEL',
      'KI_KUNST', 'MOSAIC', 'CUSTOM', 'BOOTH', 'MIRROR_BOOTH', 'KI_BOOTH',
    ];

    for (const ft of flowTypes) {
      const res = await request.get(`${API_BASE}/api/workflows/by-type/${ft}`);
      expect(res.status(), `Flow type ${ft} should return 200`).toBe(200);
      const body = await res.json();
      expect(body.workflow, `Flow type ${ft} should have workflow`).toBeTruthy();
      expect(body.workflow.steps.nodes.length, `Flow type ${ft} should have nodes`).toBeGreaterThan(0);
      expect(body.workflow.steps.edges.length, `Flow type ${ft} should have edges`).toBeGreaterThan(0);
    }
  });
});
