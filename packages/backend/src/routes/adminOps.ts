import { Router, Response } from 'express';
import { domainToASCII } from 'node:url';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

const execFileAsync = promisify(execFile);

type HttpCheckResult = {
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type NextAssetCheckResult = {
  baseUrl: string;
  assetPath: string | null;
  assetUrl: string | null;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type WordpressVerifyCheckResult = {
  url: string | null;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type DiskUsage = {
  filesystem?: string;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  mount: string;
};

const canonicalAppHostUnicode = 'app.gästefotos.com';
const canonicalDashHostUnicode = 'dash.gästefotos.com';

const defaultAppBaseUrl = `https://${domainToASCII(canonicalAppHostUnicode)}`;
const defaultDashBaseUrl = `https://${domainToASCII(canonicalDashHostUnicode)}`;

const getUrlFromEnvOrDefault = (envValue: string | undefined, fallback: string): string => {
  if (!envValue) return fallback;
  try {
    // normalize unicode hostnames -> punycode
    const u = new URL(envValue);
    const asciiHost = domainToASCII(u.hostname);
    u.hostname = asciiHost;
    return u.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
};

const httpPostJsonStatus = async (
  url: string,
  body: any,
  okStatuses: number[],
  timeoutMs: number,
  extraHeaders?: Record<string, string>
): Promise<HttpCheckResult> => {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': 'gaestefotos-admin-ops-wordpress/1.0',
        accept: 'application/json',
        'content-type': 'application/json',
        ...(extraHeaders || {}),
      },
      body: JSON.stringify(body),
    });

    clearTimeout(t);

    const durationMs = Date.now() - started;
    return {
      url,
      status: res.status,
      ok: okStatuses.includes(res.status),
      durationMs,
    };
  } catch (e: any) {
    const durationMs = Date.now() - started;
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || String(e));
    return {
      url,
      status: null,
      ok: false,
      durationMs,
      error: msg,
    };
  }
};

const checkWordpressVerify = async (): Promise<WordpressVerifyCheckResult> => {
  const wpUrl = String(process.env.WORDPRESS_URL || '').trim() || null;
  if (!wpUrl) {
    return {
      url: null,
      status: null,
      ok: false,
      durationMs: 0,
      error: 'WORDPRESS_URL not configured',
    };
  }

  const url = `${wpUrl.replace(/\/$/, '')}/wp-json/gaestefotos/v1/verify-password`;

  const verifySecret = String(process.env.WORDPRESS_VERIFY_SECRET || '').trim();
  const headers: Record<string, string> = {};
  if (verifySecret) {
    headers['X-GF-Verify-Secret'] = verifySecret;
  }

  // We intentionally test with invalid credentials.
  // Expected good statuses:
  // - 400: invalid credentials (endpoint reachable)
  // - 200: endpoint reachable (implementation may respond 200 with verified=false)
  // Other statuses indicate misconfiguration / auth wall / missing route.
  const body = { email: 'ops-diagnostic@example.invalid', password: 'invalid' };
  const res = await httpPostJsonStatus(url, body, [200, 400], 5000, headers);
  return {
    url,
    status: res.status,
    ok: res.ok,
    durationMs: res.durationMs,
    error: res.error,
  };
};

const httpGetStatus = async (url: string, okStatuses: number[]): Promise<HttpCheckResult> => {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'gaestefotos-admin-ops-health/1.0',
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      },
    });

    const durationMs = Date.now() - started;
    return {
      url,
      status: res.status,
      ok: okStatuses.includes(res.status),
      durationMs,
    };
  } catch (e: any) {
    const durationMs = Date.now() - started;
    return {
      url,
      status: null,
      ok: false,
      durationMs,
      error: e?.message || String(e),
    };
  }
};

const firstNextAssetPathFromHtml = (html: string): string | null => {
  const match = html.match(/\/_next\/static\/[^"'\s>]+\.js/g);
  return match?.[0] ?? null;
};

const checkNextAsset = async (baseUrl: string): Promise<NextAssetCheckResult> => {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/`, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'gaestefotos-admin-ops-health/1.0',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });

    const html = await res.text();
    const assetPath = firstNextAssetPathFromHtml(html);

    if (!assetPath) {
      return {
        baseUrl,
        assetPath: null,
        assetUrl: null,
        status: null,
        ok: false,
        durationMs: Date.now() - started,
        error: 'Could not extract /_next/static/*.js from HTML',
      };
    }

    const assetUrl = `${baseUrl}${assetPath}`;
    const assetRes = await fetch(assetUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'user-agent': 'gaestefotos-admin-ops-health/1.0',
        accept: 'application/javascript,*/*;q=0.8',
      },
    });

    return {
      baseUrl,
      assetPath,
      assetUrl,
      status: assetRes.status,
      ok: assetRes.status === 200,
      durationMs: Date.now() - started,
    };
  } catch (e: any) {
    return {
      baseUrl,
      assetPath: null,
      assetUrl: null,
      status: null,
      ok: false,
      durationMs: Date.now() - started,
      error: e?.message || String(e),
    };
  }
};

router.get('/health', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const appBaseUrl = getUrlFromEnvOrDefault(process.env.OPS_APP_BASE_URL, defaultAppBaseUrl);
  const dashBaseUrl = getUrlFromEnvOrDefault(process.env.OPS_DASH_BASE_URL, defaultDashBaseUrl);

  const appRootUrl = `${appBaseUrl}/`;
  const dashRootUrl = `${dashBaseUrl}/`;
  const apiHealthUrl = `${appBaseUrl}/api/health`;

  const [appRoot, dashRoot, apiHealth, appNext, dashNext] = await Promise.all([
    httpGetStatus(appRootUrl, [200]),
    httpGetStatus(dashRootUrl, [200, 301, 302, 303, 307, 308]),
    httpGetStatus(apiHealthUrl, [200]),
    checkNextAsset(appBaseUrl),
    checkNextAsset(dashBaseUrl),
  ]);

  res.json({
    ok: appRoot.ok && dashRoot.ok && apiHealth.ok && appNext.ok && dashNext.ok,
    checkedAt: new Date().toISOString(),
    targets: {
      appBaseUrl,
      dashBaseUrl,
    },
    checks: {
      appRoot,
      dashRoot,
      apiHealth,
      appNext,
      dashNext,
    },
  });
});

router.get('/wordpress', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const hasVerifySecret = String(process.env.WORDPRESS_VERIFY_SECRET || '').trim().length > 0;
  const hasWpDbConfig =
    !!process.env.WORDPRESS_DB_HOST &&
    !!process.env.WORDPRESS_DB_USER &&
    !!process.env.WORDPRESS_DB_PASSWORD &&
    !!process.env.WORDPRESS_DB_NAME;

  const verify = await checkWordpressVerify();

  return res.json({
    ok: verify.ok,
    checkedAt: new Date().toISOString(),
    config: {
      wordpressUrlConfigured: !!String(process.env.WORDPRESS_URL || '').trim(),
      hasVerifySecret,
      hasWpDbConfig,
    },
    checks: {
      verifyPassword: verify,
    },
  });
});

router.get('/server', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const startedAt = new Date(Date.now() - os.uptime() * 1000).toISOString();

  let diskRoot: DiskUsage | null = null;
  try {
    const { stdout } = await execFileAsync('df', ['-kP', '/']);
    const lines = String(stdout || '')
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/);
      if (parts.length >= 6) {
        const sizeKb = Number(parts[1]);
        const usedKb = Number(parts[2]);
        const availKb = Number(parts[3]);
        const usedPercentRaw = String(parts[4] || '').replace('%', '');
        const mount = parts[5];
        if (!Number.isNaN(sizeKb) && !Number.isNaN(usedKb) && !Number.isNaN(availKb)) {
          diskRoot = {
            filesystem: parts[0],
            sizeBytes: sizeKb * 1024,
            usedBytes: usedKb * 1024,
            availableBytes: availKb * 1024,
            usedPercent: Number(usedPercentRaw) || 0,
            mount,
          };
        }
      }
    }
  } catch {
    diskRoot = null;
  }

  res.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'unknown',
    startedAt,
    uptimeSeconds: Math.floor(os.uptime()),
    loadAvg: os.loadavg(),
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
    diskRoot,
  });
});

router.get('/rate-limits', authMiddleware, requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const isDev = process.env.NODE_ENV === 'development';
  const devMultiplier = isDev ? 10 : 1;

  const limits = [
    {
      name: 'API General',
      key: 'api',
      windowMs: 15 * 60 * 1000,
      max: 2000 * devMultiplier,
      description: 'Allgemeine API-Anfragen',
    },
    {
      name: 'Auth Login',
      key: 'auth',
      windowMs: 15 * 60 * 1000,
      max: 20 * devMultiplier,
      description: 'Login-Versuche (nur fehlgeschlagene zählen)',
    },
    {
      name: 'WordPress SSO',
      key: 'wordpress-sso',
      windowMs: 15 * 60 * 1000,
      max: 60 * devMultiplier,
      description: 'SSO-Anfragen von WordPress',
    },
    {
      name: '2FA Verify',
      key: '2fa-verify',
      windowMs: 10 * 60 * 1000,
      max: 30 * devMultiplier,
      description: '2FA-Verifizierungsversuche',
    },
    {
      name: '2FA Setup',
      key: '2fa-setup',
      windowMs: 10 * 60 * 1000,
      max: 20 * devMultiplier,
      description: '2FA-Einrichtungsversuche',
    },
    {
      name: 'Photo Upload (IP)',
      key: 'photo-ip',
      windowMs: 5 * 60 * 1000,
      max: 120 * devMultiplier,
      description: 'Foto-Uploads pro IP',
    },
    {
      name: 'Photo Upload (Event)',
      key: 'photo-event',
      windowMs: 5 * 60 * 1000,
      max: 1000 * devMultiplier,
      description: 'Foto-Uploads pro Event',
    },
    {
      name: 'Video Upload (IP)',
      key: 'video-ip',
      windowMs: 10 * 60 * 1000,
      max: 20 * devMultiplier,
      description: 'Video-Uploads pro IP',
    },
    {
      name: 'Video Upload (Event)',
      key: 'video-event',
      windowMs: 10 * 60 * 1000,
      max: 150 * devMultiplier,
      description: 'Video-Uploads pro Event',
    },
    {
      name: 'Password Verify',
      key: 'password',
      windowMs: 15 * 60 * 1000,
      max: 10 * devMultiplier,
      description: 'Passwort-Überprüfungen',
    },
    {
      name: 'Admin Auth',
      key: 'admin-auth',
      windowMs: 15 * 60 * 1000,
      max: 20,
      description: 'Admin-Login-Versuche',
    },
  ];

  res.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    environment: isDev ? 'development' : 'production',
    devMultiplier,
    limits,
  });
});

export default router;
