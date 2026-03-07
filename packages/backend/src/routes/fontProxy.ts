/**
 * Google Fonts Proxy
 * 
 * Proxies Google Fonts requests through our own server to avoid
 * sending user IP addresses directly to Google (DSGVO/LG München).
 * 
 * Routes:
 *   GET /api/fonts/css?family=Roboto:wght@400;700&family=Open+Sans&display=swap
 *   GET /api/fonts/file/:hash  (serves cached font files)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const router = Router();

// In-memory cache for font CSS and files (fonts are immutable)
const cssCache = new Map<string, { css: string; timestamp: number }>();
const fileCache = new Map<string, { buffer: Buffer; contentType: string; timestamp: number }>();

const CSS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const FILE_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_CSS_CACHE_ENTRIES = 200;
const MAX_FILE_CACHE_ENTRIES = 500;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB per font file

function hashKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function evictOldEntries<T extends { timestamp: number }>(cache: Map<string, T>, maxEntries: number): void {
  if (cache.size <= maxEntries) return;
  const entries = Array.from(cache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, cache.size - maxEntries);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}

/**
 * GET /api/fonts/css
 * Proxies Google Fonts CSS, rewriting font-file URLs to point to our proxy.
 */
router.get('/css', async (req: Request, res: Response) => {
  try {
    // Reconstruct the Google Fonts URL from query params
    const queryString = req.url.split('?')[1] || '';
    if (!queryString) {
      return res.status(400).json({ error: 'Missing font family parameter' });
    }

    const cacheKey = hashKey(queryString);

    // Check cache
    const cached = cssCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CSS_CACHE_TTL) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('X-Font-Proxy', 'cache-hit');
      return res.status(200).send(cached.css);
    }

    // Fetch from Google Fonts
    const googleUrl = `https://fonts.googleapis.com/css2?${queryString}`;
    const googleRes = await fetch(googleUrl, {
      headers: {
        // Request woff2 format (modern, smallest)
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/css',
      },
    });

    if (!googleRes.ok) {
      logger.warn('[FontProxy] Google Fonts returned error', { status: googleRes.status, query: queryString.slice(0, 200) });
      return res.status(502).json({ error: 'Font not available' });
    }

    let css = await googleRes.text();

    if (css.length > 500 * 1024) {
      return res.status(502).json({ error: 'Response too large' });
    }

    // Rewrite all font file URLs to point to our proxy
    // Google Fonts CSS contains URLs like: https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2
    css = css.replace(
      /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g,
      (_match, url) => {
        const fileHash = hashKey(url);
        // Store the URL mapping so we can fetch it later
        if (!fileCache.has(fileHash)) {
          // Store a placeholder with the original URL so the file endpoint knows where to fetch
          fileCache.set(fileHash, { buffer: Buffer.alloc(0), contentType: url, timestamp: 0 });
        }
        return `url(/api/fonts/file/${fileHash})`;
      }
    );

    // Cache the rewritten CSS
    evictOldEntries(cssCache, MAX_CSS_CACHE_ENTRIES);
    cssCache.set(cacheKey, { css, timestamp: Date.now() });

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.setHeader('X-Font-Proxy', 'cache-miss');
    return res.status(200).send(css);
  } catch (error: any) {
    logger.error('[FontProxy] CSS proxy error', { error: error.message });
    return res.status(502).json({ error: 'Font proxy error' });
  }
});

/**
 * GET /api/fonts/file/:hash
 * Serves cached font files, fetching from Google on first request.
 */
router.get('/file/:hash', async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;
    if (!hash || !/^[a-f0-9]{16}$/.test(hash)) {
      return res.status(400).send('');
    }

    const entry = fileCache.get(hash);
    if (!entry) {
      return res.status(404).send('');
    }

    // If buffer is populated and fresh, serve from cache
    if (entry.buffer.length > 0 && entry.timestamp > 0 && Date.now() - entry.timestamp < FILE_CACHE_TTL) {
      const ct = entry.contentType.includes('woff2') ? 'font/woff2'
        : entry.contentType.includes('woff') ? 'font/woff'
        : entry.contentType.includes('ttf') ? 'font/ttf'
        : 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).send(entry.buffer);
    }

    // entry.contentType contains the original Google URL (from the CSS rewrite step)
    const originalUrl = entry.timestamp === 0 ? entry.contentType : null;
    if (!originalUrl || !originalUrl.startsWith('https://fonts.gstatic.com/')) {
      return res.status(404).send('');
    }

    // Fetch the font file from Google
    const fontRes = await fetch(originalUrl, {
      headers: { 'User-Agent': 'gaestefotos-font-proxy' },
    });

    if (!fontRes.ok) {
      return res.status(502).send('');
    }

    const buf = Buffer.from(await fontRes.arrayBuffer());
    if (buf.byteLength > MAX_FILE_SIZE) {
      return res.status(502).send('');
    }

    // Determine content type from URL
    const ct = originalUrl.includes('.woff2') ? 'font/woff2'
      : originalUrl.includes('.woff') ? 'font/woff'
      : originalUrl.includes('.ttf') ? 'font/ttf'
      : 'application/octet-stream';

    // Cache the font file
    evictOldEntries(fileCache, MAX_FILE_CACHE_ENTRIES);
    fileCache.set(hash, { buffer: buf, contentType: ct, timestamp: Date.now() });

    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buf);
  } catch (error: any) {
    logger.error('[FontProxy] File proxy error', { error: error.message });
    return res.status(502).send('');
  }
});

export default router;
