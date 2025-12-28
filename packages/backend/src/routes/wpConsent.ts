import { Router, Request, Response } from 'express';

const router = Router();

type WpConsentPayload = {
  consentHtml: string;
  linkHrefs: string[];
  scriptSrcs: string[];
  inlineScripts: string[];
};

function findFirstIndex(haystack: string, needle: string, fromIndex = 0): number {
  return haystack.indexOf(needle, fromIndex);
}

function extractElementById(html: string, id: string): string | null {
  const idNeedle = `id="${id}"`;
  let idx = findFirstIndex(html, idNeedle);
  if (idx === -1) {
    const idNeedle2 = `id='${id}'`;
    idx = findFirstIndex(html, idNeedle2);
    if (idx === -1) return null;
  }

  const startTagIdx = html.lastIndexOf('<', idx);
  if (startTagIdx === -1) return null;

  const tagMatch = html.slice(startTagIdx).match(/^<([a-zA-Z0-9-]+)/);
  const tagName = tagMatch?.[1];
  if (!tagName) return null;

  let i = startTagIdx;
  let depth = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;

    if (html.startsWith(`</${tagName}`, lt)) {
      depth -= 1;
      const gt = html.indexOf('>', lt);
      if (gt === -1) break;
      i = gt + 1;
      if (depth <= 0) {
        return html.slice(startTagIdx, i);
      }
      continue;
    }

    if (html.startsWith(`<${tagName}`, lt)) {
      const gt = html.indexOf('>', lt);
      if (gt === -1) break;
      const selfClosing = html[gt - 1] === '/';
      if (!selfClosing) depth += 1;
      i = gt + 1;
      continue;
    }

    i = lt + 1;
  }

  return null;
}

function extractLinkHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /<link\b[^>]*\bhref=("([^"]+)"|'([^']+)')[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = (m[2] || m[3] || '').trim();
    if (href) out.push(href);
  }
  return out;
}

function extractScriptSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b[^>]*\bsrc=("([^"]+)"|'([^']+)')[^>]*>\s*<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const src = (m[2] || m[3] || '').trim();
    if (src) out.push(src);
  }
  return out;
}

function extractInlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const body = (m[1] || '').trim();
    if (!body) continue;
    if (
      /mfn-cookies|mfn-consent|cookie-consent|cookies_analytics|cookies_marketing|mfnwoovars|gtag\('consent'|gtag\("consent"/i.test(
        body
      )
    ) {
      out.push(body);
    }
  }
  return out;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items));
}

async function fetchWpConsentPayload(): Promise<WpConsentPayload> {
  const wpBase = 'https://xn--gstefotos-v2a.com/';

  const wpRes = await fetch(wpBase, {
    headers: {
      'User-Agent': 'gaestefotos-backend-wp-consent',
      Accept: 'text/html',
    },
  });

  if (!wpRes.ok) {
    throw new Error(`wp_http_${wpRes.status}`);
  }

  const html = await wpRes.text();

  const maxBytes = 2 * 1024 * 1024;
  if (Buffer.byteLength(html, 'utf8') > maxBytes) {
    throw new Error('wp_html_too_large');
  }

  const consentHtmlRaw = extractElementById(html, 'mfn-consent-mode');
  if (!consentHtmlRaw) {
    throw new Error('wp_consent_not_found');
  }

  const consentHtml = consentHtmlRaw.replace(/\r/g, '');

  const linkHrefs = extractLinkHrefs(html).filter(
    (u) => /xn--gstefotos-v2a\.com\//i.test(u) && /betheme|mfn|cookies|consent/i.test(u)
  );

  const scriptSrcs = extractScriptSrcs(html).filter((u) => {
    if (!/xn--gstefotos-v2a\.com\//i.test(u)) return false;
    if (/betheme|mfn|cookies|consent/i.test(u)) return true;
    if (/\/wp-includes\/js\/jquery\//i.test(u)) return true;
    if (/\/wp-content\/cache\/min\//i.test(u)) return true;
    if (/\/wp-content\/plugins\/wp-rocket\//i.test(u)) return true;
    return false;
  });

  const inlineScripts = extractInlineScripts(html).map((s) => s.replace(/\r/g, ''));

  return {
    consentHtml,
    linkHrefs: uniq(linkHrefs),
    scriptSrcs: uniq(scriptSrcs),
    inlineScripts,
  };
}

function isAllowedWpAssetUrl(url: string): boolean {
  if (!url) return false;
  if (!/^https:\/\//i.test(url)) return false;
  if (!/^https:\/\/xn--gstefotos-v2a\.com\//i.test(url)) return false;
  if (!/\.(css|js)(\?|$)/i.test(url)) return false;
  return true;
}

function inferContentTypeFromUrl(url: string): string {
  if (/\.css(\?|$)/i.test(url)) return 'text/css; charset=utf-8';
  if (/\.js(\?|$)/i.test(url)) return 'application/javascript; charset=utf-8';
  return 'application/octet-stream';
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, 'base64').toString('utf8');
}

router.get('/wp-consent', async (req: Request, res: Response) => {
  try {
    const payload = await fetchWpConsentPayload();
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(payload);
  } catch {
    return res.status(502).json({ error: 'wp_unreachable' });
  }
});

router.get('/wp-consent/asset/:b64', async (req: Request, res: Response) => {
  try {
    const url = fromBase64Url(String(req.params.b64 || ''));
    if (!isAllowedWpAssetUrl(url)) {
      return res.status(400).send('');
    }

    const wpRes = await fetch(url, {
      headers: {
        'User-Agent': 'gaestefotos-backend-wp-consent-asset',
        Accept: '*/*',
      },
    });

    if (!wpRes.ok) {
      return res.status(502).send('');
    }

    const buf = Buffer.from(await wpRes.arrayBuffer());
    const maxBytes = 2 * 1024 * 1024;
    if (buf.byteLength > maxBytes) {
      return res.status(502).send('');
    }

    res.setHeader('Content-Type', inferContentTypeFromUrl(url));
    res.setHeader('Cache-Control', 'public, max-age=14400');
    return res.status(200).send(buf);
  } catch {
    return res.status(502).send('');
  }
});

router.get('/wp-consent/frame', async (req: Request, res: Response) => {
  try {
    const payload = await fetchWpConsentPayload();

    const links = payload.linkHrefs
      .map((href) => `<link rel="stylesheet" href="/api/wp-consent/asset/${toBase64Url(href)}">`)
      .join('');
    const scripts = payload.scriptSrcs
      .map((src) => `<script defer src="/api/wp-consent/asset/${toBase64Url(src)}"></script>`)
      .join('');
    const inline = payload.inlineScripts.map((s) => `<script>${s}</script>`).join('');

    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}#mfn-consent-mode{position:fixed;left:0;right:0;bottom:0}</style></head><body>${payload.consentHtml}${inline}${scripts}<script>(function(){function isHidden(el){if(!el)return true;var cs=window.getComputedStyle(el);if(!cs)return false;if(cs.display==='none'||cs.visibility==='hidden')return true;var op=parseFloat(cs.opacity||'1');if(Number.isFinite(op)&&op<=0.01)return true;return false;}function getHeight(){var root=document.getElementById('mfn-consent-mode');if(!root)return 0;if(isHidden(root))return 0;var popup=root.querySelector('.mfn-cookies-popup')||root;if(isHidden(popup))return 0;var rect=popup.getBoundingClientRect();var h=Math.ceil(rect.height||0);if(!h||h<2) return 0;var vh=window.innerHeight||0;var vw=window.innerWidth||0;var offscreen=(rect.bottom<=0)||(rect.top>=vh)||(rect.right<=0)||(rect.left>=vw);if(offscreen) return 0;return h;}function post(){try{var h=getHeight();parent.postMessage({type:'wp-consent-height',height:h},'*')}catch(e){}}var mo=new MutationObserver(post);mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true});window.addEventListener('load',post);window.addEventListener('resize',post);setTimeout(post,100);setTimeout(post,300);setTimeout(post,1000);})();</script></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(html);
  } catch {
    return res.status(502).send('');
  }
});

export default router;
