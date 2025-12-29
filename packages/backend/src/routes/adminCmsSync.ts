import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';
import http from 'http';
import https from 'https';

const router = Router();

function getWordPressBaseUrl(): string {
  return (process.env.WORDPRESS_URL || 'https://gästefotos.com').replace(/\/$/, '');
}

function getAllowedWordPressHosts(): string[] {
  const env = (process.env.CMS_ALLOWED_HOSTS || '').trim();
  if (env) {
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  try {
    const base = new URL(getWordPressBaseUrl());
    return [base.hostname];
  } catch {
    return [];
  }
}

function extractWpRendered(value: any): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof value.rendered === 'string') return value.rendered;
  return '';
}

type ContentCandidate = { text: string; path: string; score: number };

function scoreStringCandidate(s: string, keyHint: string): number {
  const t = s.trim();
  if (!t) return 0;

  let score = t.length;

  const looksLikeHtml = t.includes('<') || t.includes('</') || t.includes('&nbsp;');
  const looksLikeWpBlocks = t.includes('<!-- wp:') || t.includes('<!--wp:');

  if (looksLikeHtml) score += 5000;
  if (looksLikeWpBlocks) score += 6000;

  if (/(content|html|body|text|editor|wysiwyg|faq|answer|question|block|builder|section|module|beschreibung|inhalt)/i.test(keyHint)) {
    score += 2500;
  }

  // Penalize very short strings unless key strongly indicates content
  if (t.length < 40 && !/(faq|answer|question|text|title)/i.test(keyHint)) {
    score -= 2000;
  }

  return score;
}

function findBestContentCandidate(value: any, depth = 0, currentPath = ''): ContentCandidate | null {
  if (depth > 8) return null;
  if (typeof value === 'string') {
    const keyHint = currentPath;
    const score = scoreStringCandidate(value, keyHint);
    if (score <= 0) return null;
    return { text: value.trim(), path: currentPath, score };
  }
  if (!value || typeof value !== 'object') return null;

  let best: ContentCandidate | null = null;

  const entries: Array<[string, any]> = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value);

  for (const [k, v] of entries) {
    const nextPath = currentPath ? `${currentPath}.${k}` : k;
    const found = findBestContentCandidate(v, depth + 1, nextPath);
    if (!found) continue;
    if (!best || found.score > best.score) {
      best = found;
    }
  }

  return best;
}

function summarizeStringContent(value: any): { stringCount: number; maxLen: number; maxPath: string | null; sample: string | null } {
  let stringCount = 0;
  let maxLen = 0;
  let maxPath: string | null = null;
  let sample: string | null = null;

  const walk = (v: any, depth: number, path: string) => {
    if (depth > 8) return;
    if (typeof v === 'string') {
      const t = v.trim();
      if (!t) return;
      stringCount += 1;
      if (t.length > maxLen) {
        maxLen = t.length;
        maxPath = path;
        sample = t.slice(0, 180);
      }
      return;
    }
    if (!v || typeof v !== 'object') return;
    const entries: Array<[string, any]> = Array.isArray(v) ? v.map((vv, i) => [String(i), vv]) : Object.entries(v);
    for (const [k, vv] of entries) {
      const next = path ? `${path}.${k}` : k;
      walk(vv, depth + 1, next);
    }
  };

  walk(value, 0, '');
  return { stringCount, maxLen, maxPath, sample };
}

function extractWpBestHtml(it: any): { html: string; source: string; sourcePath?: string } {
  const contentRendered = extractWpRendered(it?.content);
  if (contentRendered && contentRendered.trim()) {
    return { html: contentRendered, source: 'content.rendered' };
  }

  const acfCandidate = findBestContentCandidate(it?.acf);
  if (acfCandidate?.text) {
    return { html: acfCandidate.text, source: 'acf', sourcePath: acfCandidate.path };
  }

  const metaCandidate = findBestContentCandidate(it?.meta);
  if (metaCandidate?.text) {
    return { html: metaCandidate.text, source: 'meta', sourcePath: metaCandidate.path };
  }

  const excerptRendered = extractWpRendered(it?.excerpt);
  if (excerptRendered && excerptRendered.trim()) {
    return { html: excerptRendered, source: 'excerpt.rendered' };
  }

  return { html: '', source: 'empty' };
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
  return await new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'gaestefotos-backend-cms-sync',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (status < 200 || status >= 300) {
            return reject(new Error(`wordpress_http_${status}${body ? `: ${body.slice(0, 200)}` : ''}`));
          }
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch (e: any) {
            reject(new Error(`wordpress_json_parse_failed${body ? `: ${body.slice(0, 200)}` : ''}`));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('wordpress_timeout'));
    });
    req.end();
  });
}

function extractMainFromHtmlDocument(docHtml: string): { html: string; method: string } {
  const s = String(docHtml || '');
  if (!s.trim()) return { html: '', method: 'empty' };

  const tryTag = (tag: string): string | null => {
    const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const m = s.match(re);
    return m?.[0] || null;
  };

  const tryId = (id: string): string | null => {
    const re = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
    const m = s.match(re);
    return m?.[0] || null;
  };

  // Prefer semantic containers
  const main = tryTag('main');
  if (main) return { html: main, method: 'main' };

  const article = tryTag('article');
  if (article) return { html: article, method: 'article' };

  // Common WP theme container ids
  const content = tryId('content') || tryId('primary') || tryId('main');
  if (content) return { html: content, method: 'id' };

  // Fall back to body
  const body = tryTag('body');
  if (body) return { html: body, method: 'body' };

  return { html: s, method: 'full' };
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
  return await new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const allowedHosts = getAllowedWordPressHosts();
    if (allowedHosts.length && !allowedHosts.includes(parsed.hostname)) {
      return reject(new Error(`wordpress_page_disallowed_host:${parsed.hostname}`));
    }
    const client = parsed.protocol === 'https:' ? https : http;

    const maxBytes = Number(process.env.CMS_MAX_HTML_BYTES || 1024 * 1024 * 2);
    let receivedBytes = 0;

    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'gaestefotos-backend-cms-sync',
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
          receivedBytes += Buffer.byteLength(chunk, 'utf8');
          if (receivedBytes > maxBytes) {
            req.destroy(new Error('wordpress_page_too_large'));
          }
        });
        res.on('end', () => {
          if (status < 200 || status >= 300) {
            return reject(new Error(`wordpress_page_http_${status}${body ? `: ${body.slice(0, 200)}` : ''}`));
          }
          resolve(body || '');
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('wordpress_page_timeout'));
    });
    req.end();
  });
}

const wpKindSchema = z.enum(['posts', 'pages']);

const syncSchema = z.object({
  kind: wpKindSchema,
  slug: z.string().min(1),
});

router.get('/wp/:kind/recent', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const wpKind = wpKindSchema.parse(req.params.kind);
    const perPageRaw = typeof req.query.perPage === 'string' ? Number(req.query.perPage) : 20;
    const perPage = Number.isFinite(perPageRaw) ? Math.min(Math.max(perPageRaw, 1), 50) : 20;

    const baseUrl = getWordPressBaseUrl();
    const url = `${baseUrl}/wp-json/wp/v2/${wpKind}?per_page=${perPage}&orderby=modified&order=desc&_fields=id,slug,title,modified_gmt,link`;
    const raw = await fetchJsonWithTimeout(url, 8000);
    const items = Array.isArray(raw) ? raw : [];

    const normalized = items.map((it: any) => ({
      id: it?.id,
      slug: it?.slug,
      title: typeof it?.title?.rendered === 'string' ? it.title.rendered : '',
      modifiedGmt: typeof it?.modified_gmt === 'string' ? it.modified_gmt : null,
      link: typeof it?.link === 'string' ? it.link : null,
    }));

    res.json({ source: { baseUrl, url }, count: normalized.length, items: normalized });
  } catch (error: any) {
    logger.error('CMS WP recent failed', { message: error?.message || String(error) });
    res.status(500).json({ error: 'CMS recent fehlgeschlagen', details: error?.message || String(error) });
  }
});

router.get('/wp/:kind/search', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const wpKind = wpKindSchema.parse(req.params.kind);
    const query = typeof req.query.query === 'string' ? req.query.query.trim() : '';
    if (!query) {
      return res.status(400).json({ error: 'query erforderlich' });
    }

    const baseUrl = getWordPressBaseUrl();
    const url = `${baseUrl}/wp-json/wp/v2/${wpKind}?search=${encodeURIComponent(query)}&per_page=20&_fields=id,slug,title,modified_gmt,link`;
    const raw = await fetchJsonWithTimeout(url, 8000);
    const items = Array.isArray(raw) ? raw : [];

    const normalized = items.map((it: any) => ({
      id: it?.id,
      slug: it?.slug,
      title: typeof it?.title?.rendered === 'string' ? it.title.rendered : '',
      modifiedGmt: typeof it?.modified_gmt === 'string' ? it.modified_gmt : null,
      link: typeof it?.link === 'string' ? it.link : null,
    }));

    res.json({ source: { baseUrl, url }, count: normalized.length, items: normalized });
  } catch (error: any) {
    logger.error('CMS WP search failed', { message: error?.message || String(error) });
    res.status(500).json({ error: 'CMS search fehlgeschlagen', details: error?.message || String(error) });
  }
});

router.get('/snapshots', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const kind = typeof req.query.kind === 'string' ? req.query.kind.trim() : '';
  const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
  const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;

  const where: any = {};
  if (kind) {
    where.kind = wpKindSchema.parse(kind);
  }
  if (slug) {
    where.slug = slug;
  }

  const items = await (prisma as any).cmsContentSnapshot.findMany({
    where,
    orderBy: { fetchedAt: 'desc' },
    take: limit,
  });
  res.json({ items });
});

router.post('/sync', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const data = syncSchema.parse(req.body);
    const baseUrl = getWordPressBaseUrl();
    const sourceUrl = `${baseUrl}/wp-json/wp/v2/${data.kind}?slug=${encodeURIComponent(data.slug)}&acf_format=standard&_fields=id,slug,title,content,excerpt,modified_gmt,link,acf,yoast_head_json,meta`;

    const raw = await fetchJsonWithTimeout(sourceUrl, 10000);
    const arr = Array.isArray(raw) ? raw : [];
    const it = arr[0];
    if (!it) {
      return res.status(404).json({ error: 'Kein WP Content gefunden (slug)' });
    }

    const title = typeof it?.title?.rendered === 'string' ? it.title.rendered : '';
    const extracted = extractWpBestHtml(it);
    let html = extracted.html;
    const excerpt = extractWpRendered(it?.excerpt);
    const modifiedGmt = typeof it?.modified_gmt === 'string' ? it.modified_gmt : null;
    const link = typeof it?.link === 'string' ? it.link : null;

    const acfSummary = summarizeStringContent(it?.acf);
    const metaSummary = summarizeStringContent(it?.meta);

    // Fallback: some WP sites render content via Page Builder/theme templates, leaving REST content empty.
    // In that case, fetch the public page HTML and store it as snapshot HTML.
    let finalSource = extracted.source;
    let finalPath = extracted.sourcePath;
    if (
      (!html || !html.trim()) &&
      link &&
      (!excerpt || !excerpt.trim()) &&
      acfSummary.maxLen === 0 &&
      metaSummary.maxLen === 0
    ) {
      try {
        const pageHtml = await fetchTextWithTimeout(link, 12000);
        if (pageHtml && pageHtml.trim()) {
          const extractedMain = extractMainFromHtmlDocument(pageHtml);
          html = extractedMain.html || pageHtml;
          finalSource = `link.${extractedMain.method}`;
          finalPath = 'link';
        }
      } catch (e: any) {
        logger.warn('CMS sync: link.html fallback failed', {
          kind: data.kind,
          slug: data.slug,
          link,
          message: e?.message || String(e),
        });
      }
    }

    if (!extractWpRendered(it?.content)?.trim()) {
      logger.warn('CMS sync: content.rendered empty; fallback used', {
        kind: data.kind,
        slug: data.slug,
        fallbackSource: extracted.source,
        fallbackPath: extracted.sourcePath,
        hasAcf: !!it?.acf,
        hasMeta: !!it?.meta,
        htmlLen: typeof html === 'string' ? html.length : 0,
        excerptLen: typeof excerpt === 'string' ? excerpt.length : 0,
        acfMaxLen: acfSummary.maxLen,
        acfMaxPath: acfSummary.maxPath,
        metaMaxLen: metaSummary.maxLen,
        metaMaxPath: metaSummary.maxPath,
      });
    }

    const saved = await (prisma as any).cmsContentSnapshot.upsert({
      where: { kind_slug: { kind: data.kind, slug: data.slug } },
      create: {
        kind: data.kind,
        slug: data.slug,
        title,
        html,
        excerpt,
        sourceUrl,
        link,
        modifiedGmt,
        fetchedAt: new Date(),
      },
      update: {
        title,
        html,
        excerpt,
        sourceUrl,
        link,
        modifiedGmt,
        fetchedAt: new Date(),
      },
    });

    res.json({
      success: true,
      snapshot: saved,
      extraction: {
        source: finalSource,
        path: finalPath || null,
        contentLen: extractWpRendered(it?.content)?.length || 0,
        excerptLen: excerpt?.length || 0,
        htmlLen: html?.length || 0,
        hasAcf: !!it?.acf,
        hasMeta: !!it?.meta,
        hasYoast: !!it?.yoast_head_json,
      },
      debug: {
        acfKeys: it?.acf && typeof it.acf === 'object' ? Object.keys(it.acf).slice(0, 80) : [],
        metaKeys: it?.meta && typeof it.meta === 'object' ? Object.keys(it.meta).slice(0, 80) : [],
        acfSummary,
        metaSummary,
      },
    });
  } catch (error: any) {
    logger.error('CMS sync failed', { message: error?.message || String(error) });
    res.status(500).json({ error: 'CMS sync fehlgeschlagen', details: error?.message || String(error) });
  }
});

router.get('/faq/preview', authMiddleware, requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const wpKind = wpKindSchema.parse((req.query.kind as any) || 'pages');
    const slug = typeof req.query.slug === 'string' && req.query.slug.trim() ? req.query.slug.trim() : 'faq';

    const baseUrl = getWordPressBaseUrl();

    // Common WP REST endpoints. Many sites store FAQ content as a dedicated page (slug: faq).
    // If you later add a custom CPT (faq), we can switch the endpoint.
    const url = `${baseUrl}/wp-json/wp/v2/${wpKind}?slug=${encodeURIComponent(slug)}&acf_format=standard&_fields=id,slug,title,content,excerpt,modified_gmt,link,acf,yoast_head_json,meta`;

    const raw = await fetchJsonWithTimeout(url, 8000);
    const items = Array.isArray(raw) ? raw : [];

    const normalized = await Promise.all(items.map(async (it: any) => {
      const extracted = extractWpBestHtml(it);
      const excerpt = extractWpRendered(it?.excerpt);
      const link = typeof it?.link === 'string' ? it.link : null;

      let html = extracted.html;
      let finalSource = extracted.source;
      let finalPath = extracted.sourcePath;

      const acfSummary = summarizeStringContent(it?.acf);
      const metaSummary = summarizeStringContent(it?.meta);
      if (
        (!html || !html.trim()) &&
        link &&
        (!excerpt || !excerpt.trim()) &&
        acfSummary.maxLen === 0 &&
        metaSummary.maxLen === 0
      ) {
        // Same fallback as /sync: fetch rendered public HTML
        // (preview only; does not store snapshot)
        // Keep this best-effort; errors should not fail the whole preview.
        try {
          const pageHtml = await fetchTextWithTimeout(link, 12000);
          if (pageHtml && pageHtml.trim()) {
            const extractedMain = extractMainFromHtmlDocument(pageHtml);
            html = extractedMain.html || pageHtml;
            finalSource = `link.${extractedMain.method}`;
            finalPath = 'link';
          }
        } catch {
          // ignore
        }
      }

      return {
        id: it?.id,
        slug: it?.slug,
        title: typeof it?.title?.rendered === 'string' ? it.title.rendered : '',
        html,
        excerpt,
        modifiedGmt: typeof it?.modified_gmt === 'string' ? it.modified_gmt : null,
        link,
        extraction: {
          source: finalSource,
          path: finalPath || null,
          contentLen: extractWpRendered(it?.content)?.length || 0,
          excerptLen: excerpt?.length || 0,
          htmlLen: html?.length || 0,
          hasAcf: !!it?.acf,
          hasMeta: !!it?.meta,
          hasYoast: !!it?.yoast_head_json,
        },
      };
    }));

    res.json({
      source: { baseUrl, url },
      count: normalized.length,
      items: normalized,
    });
  } catch (error: any) {
    logger.error('CMS FAQ preview failed', { message: error?.message || String(error) });
    res.status(500).json({ error: 'CMS preview fehlgeschlagen', details: error?.message || String(error) });
  }
});

export default router;
