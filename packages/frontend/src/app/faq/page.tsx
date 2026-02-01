'use client';

import { useEffect, useState } from 'react';
import { sanitizeCmsHtml } from '@/lib/sanitize';

const localizeCmsHtml = (html: string): string => {
  const rules: Array<[RegExp, string]> = [
    [/https?:\/\/(?:www\.)?(?:xn--gstefotos-v2a\.com|gästefotos\.com)\/faq\/?/gi, '/faq'],
    [/https?:\/\/(?:www\.)?(?:xn--gstefotos-v2a\.com|gästefotos\.com)\/datenschutz\/?/gi, '/datenschutz'],
    [/https?:\/\/(?:www\.)?(?:xn--gstefotos-v2a\.com|gästefotos\.com)\/impressum\/?/gi, '/impressum'],
    [/https?:\/\/(?:www\.)?(?:xn--gstefotos-v2a\.com|gästefotos\.com)\/agb\/?/gi, '/agb'],
  ];
  let out = html;
  for (const [re, to] of rules) out = out.replace(re, to);
  return out;
};

export default function FaqPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch('/api/cms/pages/faq', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (res.status === 404) {
          if (!cancelled && typeof window !== 'undefined') {
            window.location.href = 'https://xn--gstefotos-v2a.com/faq/';
          }
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `FAQ konnte nicht geladen werden (${res.status})`);
        }

        const data = await res.json().catch(() => null);
        if (!cancelled) {
          setSnapshot(data?.snapshot || null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'FAQ konnte nicht geladen werden');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-[980px] mx-auto p-5">
      <h1 className="m-0 text-app-fg">FAQ</h1>
      {loading ? <p className="mt-3 text-app-muted">Lade…</p> : null}
      {error ? <p className="mt-3 text-status-danger">{error}</p> : null}
      {!loading && !error && snapshot?.html ? (
        <div
          className="prose prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(localizeCmsHtml(String(snapshot.html))) }}
        />
      ) : null}
    </div>
  );
}
