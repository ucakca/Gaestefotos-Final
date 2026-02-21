import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, requireRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';

const router = Router();

// CDN Token secret (reuse JWT secret for simplicity)
const CDN_SECRET = process.env.JWT_SECRET || 'cdn-secret-fallback';
const CDN_TOKEN_TTL = 60 * 60 * 6; // 6 hours in seconds

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signCdnToken(key: string, expiresAt: number): string {
  const payload = `${key}:${expiresAt}`;
  return crypto.createHmac('sha256', CDN_SECRET).update(payload).digest('hex');
}

function verifyCdnToken(key: string, token: string, expiresAt: number): boolean {
  const expected = signCdnToken(key, expiresAt);
  const now = Math.floor(Date.now() / 1000);
  return expiresAt > now && crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
}

function getFileType(key: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Internal auth verify (called by nginx auth_request) ──────────────────────

// GET /api/cdn/verify — nginx auth_request sub-request
// Returns 200 if token valid, 401 otherwise (no body needed)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const originalUri = req.headers['x-original-uri'] as string ?? '';
    const url = new URL(`https://cdn.xn--gstefotos-v2a.com${originalUri}`);
    const token = url.searchParams.get('t');
    const exp = parseInt(url.searchParams.get('exp') ?? '0', 10);

    // Strip query params to get clean key
    const key = decodeURIComponent(url.pathname.replace(/^\//, ''));

    if (!token || !exp || !key) {
      return res.status(401).end();
    }

    if (!verifyCdnToken(key, token, exp)) {
      return res.status(401).end();
    }

    return res.status(200).end();
  } catch {
    return res.status(401).end();
  }
});

// ─── Admin: List files ────────────────────────────────────────────────────────

// GET /api/admin/cdn/files
// Query: prefix, page, limit, sort (name|size|date), order (asc|desc), type (image|video|audio|pdf|other|all), search
router.get('/files', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prefix = (req.query.prefix as string) || 'events/';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const continuationToken = req.query.cursor as string | undefined;
    const sort = (req.query.sort as string) || 'date';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
    const typeFilter = (req.query.type as string) || 'all';
    const search = ((req.query.search as string) || '').toLowerCase();

    const result = await storageService.listFiles({ prefix, maxKeys: 1000, continuationToken });

    let items = result.items.map((item) => ({
      key: item.key,
      name: item.key.split('/').pop() ?? item.key,
      path: item.key,
      size: item.size,
      sizeFormatted: formatBytes(item.size),
      lastModified: item.lastModified,
      type: getFileType(item.key),
      eventId: item.key.split('/')[1] ?? null,
    }));

    // Filter by type
    if (typeFilter !== 'all') {
      items = items.filter((f) => f.type === typeFilter);
    }

    // Filter by search
    if (search) {
      items = items.filter((f) => f.key.toLowerCase().includes(search));
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      if (sort === 'name') cmp = a.name.localeCompare(b.name);
      else if (sort === 'size') cmp = a.size - b.size;
      else cmp = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      return order === 'asc' ? cmp : -cmp;
    });

    // Paginate
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit);

    // Summary stats
    const totalSize = items.reduce((s, f) => s + f.size, 0);
    const byType = items.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      files: paginated,
      total,
      page,
      pages: Math.ceil(total / limit),
      isTruncated: result.isTruncated,
      nextCursor: result.nextToken,
      summary: { totalSize, totalSizeFormatted: formatBytes(totalSize), byType },
    });
  } catch (error: any) {
    logger.error('CDN file list error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden der Dateien' });
  }
});

// ─── Admin: Generate signed download URL ─────────────────────────────────────

// POST /api/admin/cdn/sign
// Body: { key: string, ttl?: number }
router.post('/sign', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { key, ttl = CDN_TOKEN_TTL } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'key fehlt' });
    }

    const expiresAt = Math.floor(Date.now() / 1000) + Math.min(ttl, CDN_TOKEN_TTL * 4);
    const token = signCdnToken(key, expiresAt);
    const cdnDomain = process.env.CDN_DOMAIN || 'cdn.xn--gstefotos-v2a.com';
    const url = `https://${cdnDomain}/${encodeURIComponent(key)}?t=${token}&exp=${expiresAt}`;

    res.json({ url, expiresAt, expiresIn: Math.min(ttl, CDN_TOKEN_TTL * 4) });
  } catch (error: any) {
    logger.error('CDN sign error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Signieren' });
  }
});

// ─── Admin: Bulk sign (for batch download) ───────────────────────────────────

// POST /api/admin/cdn/bulk-sign
// Body: { keys: string[] }
router.post('/bulk-sign', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { keys } = req.body;
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys fehlt' });
    }
    if (keys.length > 500) {
      return res.status(400).json({ error: 'Maximal 500 Dateien auf einmal' });
    }

    const cdnDomain = process.env.CDN_DOMAIN || 'cdn.xn--gstefotos-v2a.com';
    const expiresAt = Math.floor(Date.now() / 1000) + CDN_TOKEN_TTL;

    const urls = keys.map((key: string) => {
      const token = signCdnToken(key, expiresAt);
      return {
        key,
        url: `https://${cdnDomain}/${encodeURIComponent(key)}?t=${token}&exp=${expiresAt}`,
      };
    });

    res.json({ urls, expiresAt });
  } catch (error: any) {
    logger.error('CDN bulk-sign error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Signieren' });
  }
});

// ─── Admin: Storage summary ───────────────────────────────────────────────────

// GET /api/admin/cdn/summary
router.get('/summary', authMiddleware, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const result = await storageService.listFiles({ prefix: 'events/', maxKeys: 1000 });

    let totalSize = 0;
    const byEvent: Record<string, { count: number; size: number }> = {};
    const byType: Record<string, number> = {};

    for (const item of result.items) {
      totalSize += item.size;
      const eventId = item.key.split('/')[1] ?? 'unknown';
      if (!byEvent[eventId]) byEvent[eventId] = { count: 0, size: 0 };
      byEvent[eventId].count++;
      byEvent[eventId].size += item.size;
      const t = getFileType(item.key);
      byType[t] = (byType[t] ?? 0) + 1;
    }

    const topEvents = Object.entries(byEvent)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([eventId, s]) => ({ eventId, ...s, sizeFormatted: formatBytes(s.size) }));

    res.json({
      totalFiles: result.items.length,
      totalSize,
      totalSizeFormatted: formatBytes(totalSize),
      byType,
      topEvents,
      isTruncated: result.isTruncated,
    });
  } catch (error: any) {
    logger.error('CDN summary error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
  }
});

export default router;
