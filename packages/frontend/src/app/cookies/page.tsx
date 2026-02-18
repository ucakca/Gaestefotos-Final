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

export default function CookiesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch('/api/cms/pages/cookies', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (res.status === 404) {
          if (!cancelled) {
            setSnapshot({ html: FALLBACK_HTML });
          }
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Cookie-Richtlinie konnte nicht geladen werden (${res.status})`);
        }

        const data = await res.json().catch(() => null);
        if (!cancelled) {
          setSnapshot(data?.snapshot || null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Cookie-Richtlinie konnte nicht geladen werden');
          setSnapshot({ html: FALLBACK_HTML });
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
      <h1 className="m-0 text-foreground">Cookie-Richtlinie</h1>
      {loading ? <p className="mt-3 text-muted-foreground">Lade…</p> : null}
      {error && !snapshot ? <p className="mt-3 text-destructive">{error}</p> : null}
      {!loading && snapshot?.html ? (
        <div className="prose prose-invert mt-4 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(localizeCmsHtml(String(snapshot.html))) }} />
      ) : null}
    </div>
  );
}

const FALLBACK_HTML = `
<h2>1. Was sind Cookies?</h2>
<p>Cookies sind kleine Textdateien, die beim Besuch unserer Website auf Ihrem Endgerät gespeichert werden. Sie helfen uns, die Website funktionsfähig zu halten und Ihr Nutzungserlebnis zu verbessern.</p>

<h2>2. Welche Cookies verwenden wir?</h2>
<h3>Technisch notwendige Cookies</h3>
<p>Diese Cookies sind für den Betrieb der Website erforderlich. Dazu gehören Session-Cookies, Authentifizierungs-Cookies und CSRF-Schutz-Cookies. Sie können nicht deaktiviert werden.</p>
<ul>
  <li><strong>NEXT_LOCALE</strong> – Speichert Ihre Spracheinstellung</li>
  <li><strong>auth_token</strong> – Authentifizierung (Login-Session)</li>
  <li><strong>csrf_token</strong> – Schutz gegen Cross-Site-Request-Forgery</li>
</ul>

<h3>Funktionale Cookies</h3>
<p>Diese Cookies ermöglichen erweiterte Funktionen wie die Speicherung von Einstellungen und Präferenzen.</p>

<h2>3. Keine Tracking-Cookies</h2>
<p>Wir verwenden <strong>keine</strong> Tracking-, Werbe- oder Analyse-Cookies von Drittanbietern. Ihre Privatsphäre ist uns wichtig.</p>

<h2>4. Cookies verwalten</h2>
<p>Sie können Cookies jederzeit in Ihren Browser-Einstellungen löschen oder blockieren. Bitte beachten Sie, dass das Blockieren technisch notwendiger Cookies die Funktionalität der Website einschränken kann.</p>

<h2>5. Kontakt</h2>
<p>Bei Fragen zu unserer Cookie-Richtlinie wenden Sie sich bitte an: <a href="/datenschutz">Datenschutz</a></p>
`;
