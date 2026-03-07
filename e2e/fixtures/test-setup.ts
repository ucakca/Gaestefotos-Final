/**
 * Shared E2E Test Fixtures
 * 
 * Provides reusable helpers for:
 * - User creation & login (Host, Guest)
 * - Event creation with configurable features
 * - API request helpers with auth
 * - Test data cleanup
 * 
 * Reference: DOKUMENTATION.md §2.5 Event-Lifecycle
 */

import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const API_BASE = (
  process.env.E2E_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8001'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
  password: string;
  token: string;
  role: 'HOST' | 'ADMIN';
}

export interface TestEvent {
  id: string;
  slug: string;
  title: string;
  password?: string;
}

export interface CleanupFn {
  (): Promise<void>;
}

// ---------------------------------------------------------------------------
// Database helpers (direct Prisma access for test setup)
// ---------------------------------------------------------------------------

let _prismaClient: any = null;

async function getPrisma() {
  if (_prismaClient) return _prismaClient;
  const prisma = await import('@prisma/client');
  const { PrismaClient } = prisma as any;
  _prismaClient = new PrismaClient();
  return _prismaClient;
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export async function createTestUser(
  request: APIRequestContext,
  opts: { role?: 'HOST' | 'ADMIN'; prefix?: string } = {},
): Promise<{ user: TestUser; cleanup: CleanupFn }> {
  const db = await getPrisma();
  const bcrypt = await import('bcryptjs');

  const unique = `${Date.now().toString(36)}-${opts.prefix || 'e2e'}`;
  const email = `e2e-${unique}@test.local`;
  const password = 'E2eTest!2025secure';
  const passwordHash = await (bcrypt as any).default.hash(password, 10);
  const role = opts.role || 'HOST';

  const user = await db.user.create({
    data: { email, name: `E2E ${role}`, password: passwordHash, role },
  });

  // Login via API to get JWT token
  const loginRes = await request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
  });

  let token = '';
  if (loginRes.ok()) {
    const json: any = await loginRes.json();
    token = json?.token || '';
  }

  // Fallback: if login was rate-limited (429) or failed, sign JWT directly
  if (!token) {
    try {
      const jwtMod = await import('jsonwebtoken');
      const sign = (jwtMod as any).default?.sign || (jwtMod as any).sign;
      const secret = process.env.JWT_SECRET || '';
      if (sign && secret) {
        token = sign({ userId: user.id, role }, secret, { expiresIn: '1h' });
      }
    } catch { /* jwt fallback unavailable */ }
  }

  const testUser: TestUser = { id: user.id, email, password, token, role };

  const cleanup: CleanupFn = async () => {
    try {
      await db.user.delete({ where: { id: user.id } });
    } catch { /* already deleted */ }
  };

  return { user: testUser, cleanup };
}

/**
 * Inject auth token into browser context so subsequent page navigations
 * are authenticated.
 *
 * The frontend uses an httpOnly cookie `auth_token` (set by the backend on
 * login).  We replicate that by adding the cookie directly to the browser
 * context via Playwright's addCookies API.
 */
export async function authenticatePage(page: Page, token: string) {
  const url = new URL(FRONTEND_BASE);
  await page.context().addCookies([
    {
      name: 'auth_token',
      value: token,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: false, // E2E runs over http://localhost
      sameSite: 'Lax',
    },
  ]);
}

// ---------------------------------------------------------------------------
// Event helpers
// ---------------------------------------------------------------------------

export async function createTestEvent(
  request: APIRequestContext,
  user: TestUser,
  opts: {
    title?: string;
    password?: string;
    moderation?: boolean;
    maxUploadsPerGuest?: number;
  } = {},
): Promise<{ event: TestEvent; cleanup: CleanupFn }> {
  const db = await getPrisma();
  const crypto = await import('crypto');

  const slug = `e2e-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  const title = opts.title || `E2E Test Event ${slug}`;

  const featuresConfig: Record<string, any> = {};
  if (opts.moderation !== undefined) featuresConfig.moderationRequired = opts.moderation;
  if (opts.maxUploadsPerGuest !== undefined) featuresConfig.maxUploadsPerGuest = opts.maxUploadsPerGuest;

  // Hash password with bcrypt (same as backend) so verify-password endpoint works
  let hashedPassword: string | null = null;
  if (opts.password) {
    const bcrypt = await import('bcryptjs');
    hashedPassword = await (bcrypt as any).default.hash(opts.password, 10);
  }

  const event = await db.event.create({
    data: {
      title,
      slug,
      host: { connect: { id: user.id } },
      isActive: true,
      password: hashedPassword,
      featuresConfig: Object.keys(featuresConfig).length > 0 ? featuresConfig : undefined,
    },
  });

  const testEvent: TestEvent = {
    id: event.id,
    slug: event.slug,
    title: event.title,
    password: opts.password,
  };

  const cleanup: CleanupFn = async () => {
    try {
      // Clean up photos first (FK constraint)
      await db.photo.deleteMany({ where: { eventId: event.id } });
      await db.event.delete({ where: { id: event.id } });
    } catch { /* already deleted */ }
  };

  return { event: testEvent, cleanup };
}

// ---------------------------------------------------------------------------
// API request helpers
// ---------------------------------------------------------------------------

export async function apiGet(
  request: APIRequestContext,
  path: string,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request.get(`${API_BASE}${path}`, { headers });
}

export async function apiPost(
  request: APIRequestContext,
  path: string,
  data: any,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request.post(`${API_BASE}${path}`, { headers, data });
}

export async function apiPut(
  request: APIRequestContext,
  path: string,
  data: any,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request.put(`${API_BASE}${path}`, { headers, data });
}

export async function apiDelete(
  request: APIRequestContext,
  path: string,
  token?: string,
) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return request.delete(`${API_BASE}${path}`, { headers });
}

// ---------------------------------------------------------------------------
// Test image helpers
// ---------------------------------------------------------------------------

const TEST_FILES_DIR = path.join(__dirname, '..', 'test-files');

/** Create a minimal valid JPEG buffer */
export function createTestJpeg(sizeKB: number = 10): Buffer {
  const header = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const padding = Buffer.alloc(Math.max(0, sizeKB * 1024 - header.length - 2), 0x00);
  const footer = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([header, padding, footer]);
}

/** Ensure test image files exist on disk */
export async function ensureTestFiles(count: number = 3): Promise<string[]> {
  await fs.promises.mkdir(TEST_FILES_DIR, { recursive: true });
  const paths: string[] = [];
  for (let i = 1; i <= count; i++) {
    const p = path.join(TEST_FILES_DIR, `e2e-test-${i}.jpg`);
    if (!fs.existsSync(p)) {
      await fs.promises.writeFile(p, createTestJpeg(50));
    }
    paths.push(p);
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Backend readiness helper
// ---------------------------------------------------------------------------

export async function waitForBackend(request: APIRequestContext, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request.get(`${API_BASE}/api/health/live`);
      if (res.status() < 500) return;
    } catch { /* keep polling */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Backend not reachable at ${API_BASE} within ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// Cleanup registry — ensures all cleanup fns run even if test fails
// ---------------------------------------------------------------------------

export class CleanupRegistry {
  private fns: CleanupFn[] = [];

  register(fn: CleanupFn) {
    this.fns.push(fn);
  }

  async runAll() {
    for (const fn of this.fns.reverse()) {
      try { await fn(); } catch { /* best effort */ }
    }
    this.fns = [];
  }
}

// ---------------------------------------------------------------------------
// Disconnect Prisma after all tests
// ---------------------------------------------------------------------------

export async function disconnectDb() {
  if (_prismaClient) {
    await _prismaClient.$disconnect();
    _prismaClient = null;
  }
}
