import { Router, Response } from 'express';
import { domainToASCII } from 'node:url';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

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

export default router;
