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
<p>Cookies sind kleine Textdateien, die beim Besuch unserer Website auf Ihrem Endgerät gespeichert werden. Wir verwenden auch den localStorage Ihres Browsers, der ähnlich wie Cookies funktioniert. Beide helfen uns, die Website funktionsfähig zu halten und Ihr Nutzungserlebnis zu verbessern.</p>
<p>Diese Richtlinie gilt für die App unter <strong>app.gästefotos.com</strong> und informiert gemäß Art. 5(3) der ePrivacy-Richtlinie und der DSGVO über alle eingesetzten Technologien.</p>

<h2>2. Notwendige Cookies &amp; Speicher</h2>
<p>Diese sind für den Betrieb der App zwingend erforderlich und können nicht deaktiviert werden. Rechtsgrundlage: Art. 6(1)(f) DSGVO (berechtigtes Interesse).</p>
<table>
<thead><tr><th>Name</th><th>Typ</th><th>Zweck</th><th>Dauer</th></tr></thead>
<tbody>
<tr><td><code>auth_token</code></td><td>Cookie (httpOnly)</td><td>Login-Session (JWT)</td><td>30 Tage</td></tr>
<tr><td><code>refresh_token</code></td><td>Cookie (httpOnly)</td><td>Automatische Session-Verlängerung</td><td>30 Tage</td></tr>
<tr><td><code>event_access_*</code></td><td>Cookie (httpOnly)</td><td>Gast-Zugang zu einem Event</td><td>30 Tage</td></tr>
<tr><td><code>invitation_access_*</code></td><td>Cookie (httpOnly)</td><td>Zugang über Einladungslink</td><td>30 Tage</td></tr>
<tr><td><code>face_consent_*</code></td><td>Cookie (httpOnly)</td><td>Einwilligung zur Gesichtserkennung pro Event</td><td>30 Tage</td></tr>
<tr><td><code>csrf-token</code></td><td>Cookie</td><td>Schutz gegen Cross-Site-Request-Forgery</td><td>1 Stunde</td></tr>
<tr><td><code>gf_consent</code></td><td>Cookie</td><td>Speichert Ihre Cookie-Einstellungen</td><td>365 Tage</td></tr>
<tr><td><code>NEXT_LOCALE</code></td><td>Cookie</td><td>Spracheinstellung</td><td>365 Tage</td></tr>
<tr><td><code>token</code></td><td>sessionStorage</td><td>Auth-Token (wenn nicht "Angemeldet bleiben")</td><td>Session</td></tr>
</tbody>
</table>

<h2>3. Funktionale Speicher</h2>
<p>Verbessern Ihre Nutzungserfahrung durch das Speichern von Einstellungen. Rechtsgrundlage: Art. 6(1)(a) DSGVO (Einwilligung).</p>
<table>
<thead><tr><th>Name</th><th>Typ</th><th>Zweck</th><th>Dauer</th></tr></thead>
<tbody>
<tr><td><code>gaestefotos-theme</code></td><td>localStorage</td><td>Dark/Light Mode Einstellung</td><td>Dauerhaft</td></tr>
<tr><td><code>guestUploaderName</code></td><td>localStorage</td><td>Ihr Gastname für Foto-Uploads</td><td>Dauerhaft</td></tr>
<tr><td><code>gf_uploader_name</code></td><td>localStorage</td><td>Ihr Gastname (Quick Upload)</td><td>Dauerhaft</td></tr>
<tr><td><code>setup_wizard_progress</code></td><td>localStorage</td><td>Setup-Assistent Fortschritt</td><td>Dauerhaft</td></tr>
<tr><td><code>guidedTour_*</code></td><td>localStorage</td><td>Geführte Tour Fortschritt</td><td>Dauerhaft</td></tr>
<tr><td><code>pwa-install-dismissed</code></td><td>localStorage</td><td>App-Installationshinweis unterdrückt</td><td>Dauerhaft</td></tr>
</tbody>
</table>

<h2>4. Analyse &amp; Fehlertracking</h2>
<p>Helfen uns, Fehler zu erkennen und die App zu verbessern. Rechtsgrundlage: Art. 6(1)(a) DSGVO (Einwilligung).</p>
<table>
<thead><tr><th>Name</th><th>Typ</th><th>Zweck</th><th>Dauer</th></tr></thead>
<tbody>
<tr><td><code>gf_device_id</code></td><td>localStorage</td><td>Anonyme Geräte-Identifikation für Energie-/KI-System</td><td>Dauerhaft</td></tr>
<tr><td><code>upload_metrics</code></td><td>localStorage</td><td>Upload-Performance-Daten zur Optimierung</td><td>Dauerhaft</td></tr>
</tbody>
</table>
<h3>Sentry (Fehlertracking)</h3>
<p>Wir verwenden <strong>Sentry</strong> zur automatischen Fehlererkennung. Sentry verarbeitet bei Fehlern: IP-Adresse (anonymisiert), Browser-Typ, Fehlermeldung und Seitenkontext.</p>
<ul>
<li><strong>Anbieter:</strong> Functional Software, Inc. (Sentry)</li>
<li><strong>Serverstandort:</strong> 🇪🇺 Frankfurt, Deutschland (EU-Region)</li>
<li><strong>Datenschutz:</strong> <a href="https://sentry.io/privacy/" target="_blank" rel="noopener">sentry.io/privacy</a></li>
</ul>

<h2>5. KI-Funktionen &amp; Drittanbieter</h2>
<p>Für KI-Foto-Effekte und Spiele werden Daten an spezialisierte Anbieter gesendet. Rechtsgrundlage: Art. 6(1)(a) DSGVO (Einwilligung).</p>

<h3>Bildverarbeitung (EU)</h3>
<p>Fotos und Videos werden ausschließlich auf EU-Servern verarbeitet:</p>
<ul>
<li><strong>RunPod (ComfyUI)</strong> – Style Transfer, Face Swap, Video-Generierung – Server in der EU</li>
<li><strong>remove.bg (Kaleido AI)</strong> – Hintergrundentfernung – Server in Wien, Österreich 🇦🇹</li>
</ul>

<h3>Text-basierte KI (USA)</h3>
<p>Für Text-basierte KI-Spiele (Foto-Bewertung, Bingo, Superlatives) werden <strong>nur Textdaten</strong> (Event-Titel, Spielanweisungen) an Server in den USA gesendet. Es werden dabei <strong>keine Bilder oder persönliche Daten</strong> übertragen.</p>
<ul>
<li><strong>xAI (Grok)</strong> – Text-Generierung – USA</li>
<li><strong>Groq</strong> – Text-Generierung – USA</li>
</ul>

<h3>Lokale KI</h3>
<p>Einige KI-Funktionen laufen auf unserem eigenen Server (Ollama) und senden keine Daten an Dritte.</p>

<h2>6. Push-Benachrichtigungen</h2>
<p>Wenn Sie Push-Benachrichtigungen aktivieren, wird eine Subscription über den Browser-Push-Dienst (Google FCM) erstellt. Dies ist Standard-Browser-Infrastruktur und erfordert die Übertragung eines Geräte-Tokens an Google.</p>

<h2>7. Marketing</h2>
<p>Wir verwenden derzeit <strong>keine</strong> Marketing- oder Werbe-Cookies. Diese Kategorie ist für zukünftige Funktionen reserviert.</p>

<h2>8. Cookies verwalten</h2>
<p>Sie können Ihre Cookie-Einstellungen jederzeit ändern:</p>
<ul>
<li>Über den <strong>Datenschutz-Einstellungen</strong>-Banner am unteren Bildschirmrand</li>
<li>Durch Löschen des <code>gf_consent</code>-Cookies in Ihren Browser-Einstellungen</li>
<li>Durch Löschen aller Cookies und localStorage-Daten für diese Domain</li>
</ul>
<p>Das Blockieren technisch notwendiger Cookies kann die Funktionalität der App einschränken.</p>

<h2>9. Kontakt</h2>
<p>Bei Fragen zu unserer Cookie-Richtlinie: <a href="/datenschutz">Datenschutzerklärung</a> · <a href="/impressum">Impressum</a></p>
<p><em>Stand: März 2026</em></p>
`;
