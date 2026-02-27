
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, requireRole } from '../middleware/auth';
import { storageService } from '../services/storage';
import { logger } from '../utils/logger';
import prisma from '../config/database';

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

// ─── Admin: Browse (Explorer-Ansicht mit Ordnern) ─────────────────────────────
//
// GET /api/admin/cdn/browse
// Query: prefix (z.B. "" = Root, "events/abc123/" = Event-Ordner)
//        sort (name|size|date), order (asc|desc), type (all|image|video|audio|pdf|other), search, page, limit
//
// Antwort: { folders: [...], files: [...], breadcrumbs: [...], total, page, pages }
router.get('/browse', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const prefix = (req.query.prefix as string) ?? '';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const sort = (req.query.sort as string) || 'name';
    const order = (req.query.order as string) === 'desc' ? 'desc' : 'asc';
    const typeFilter = (req.query.type as string) || 'all';
    const search = ((req.query.search as string) || '').toLowerCase();

    // S3 delimiter listing — liefert CommonPrefixes (Ordner) + Contents (Dateien)
    const result = await storageService.listFiles({
      prefix: prefix || undefined,
      maxKeys: 1000,
      delimiter: '/',
    });

    // ── Ordner aufbauen ────────────────────────────────────────────────────────
    let folders = result.folders.map((folderPrefix) => {
      // "events/abc123/" → name = "abc123", eventId = "abc123" wenn unter events/
      const parts = folderPrefix.replace(/\/$/, '').split('/');
      const name = parts[parts.length - 1] ?? folderPrefix;
      const depth = parts.length - 1;
      const eventId = depth === 1 && parts[0] === 'events' ? name : null;
      return { prefix: folderPrefix, name, eventId, depth };
    });

    // Event-Namen aus DB anreichern wenn wir im Root events/ sind
    const eventIds = folders.map((f) => f.eventId).filter(Boolean) as string[];
    let eventNameMap: Record<string, string> = {};
    if (eventIds.length > 0) {
      const events = await prisma.event.findMany({
        where: { id: { in: eventIds } },
        select: { id: true, title: true, slug: true, dateTime: true, isActive: true },
      });
      eventNameMap = Object.fromEntries(events.map((e) => [e.id, e.title]));
    }

    folders = folders.map((f) => ({
      ...f,
      label: f.eventId && eventNameMap[f.eventId]
        ? `${eventNameMap[f.eventId]} (${f.eventId.slice(0, 8)})`
        : f.name,
    }));

    // Sort folders
    folders.sort((a, b) =>
      order === 'asc'
        ? (a as any).label.localeCompare((b as any).label)
        : (b as any).label.localeCompare((a as any).label),
    );

    // ── Dateien aufbauen ───────────────────────────────────────────────────────
    let files = result.items.map((item) => ({
      key: item.key,
      name: item.key.split('/').pop() ?? item.key,
      size: item.size,
      sizeFormatted: formatBytes(item.size),
      lastModified: item.lastModified,
      type: getFileType(item.key),
    }));

    if (typeFilter !== 'all') {
      files = files.filter((f) => f.type === typeFilter);
    }
    if (search) {
      const q = search;
      files = files.filter((f) => f.name.toLowerCase().includes(q));
      folders = folders.filter((f) => (f as any).label.toLowerCase().includes(q));
    }

    // Sort files
    files.sort((a, b) => {
      let cmp = 0;
      if (sort === 'size') cmp = a.size - b.size;
      else if (sort === 'date') cmp = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      else cmp = a.name.localeCompare(b.name);
      return order === 'asc' ? cmp : -cmp;
    });

    // Paginate files only (folders always shown)
    const totalFiles = files.length;
    const pagedFiles = files.slice((page - 1) * limit, page * limit);

    // ── Breadcrumbs ────────────────────────────────────────────────────────────
    const breadcrumbs: Array<{ label: string; prefix: string }> = [{ label: 'Root', prefix: '' }];
    const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean);
    let running = '';
    for (const part of parts) {
      running += `${part}/`;
      const eventName = eventNameMap[part];
      breadcrumbs.push({ label: eventName ? `${eventName}` : part, prefix: running });
    }

    res.json({
      folders,
      files: pagedFiles,
      totalFiles,
      pageFiles: page,
      pagesFiles: Math.ceil(totalFiles / limit),
      breadcrumbs,
      currentPrefix: prefix,
      isTruncated: result.isTruncated,
    });
  } catch (error: any) {
    logger.error('CDN browse error', { error: error.message });
    res.status(500).json({ error: 'Fehler beim Laden' });
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
