'use client';

import { useEffect, useState } from 'react';
import { sanitizeCmsHtml } from '@/lib/sanitize';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

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

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        const res = await fetch('/api/cms/pages/landing', {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });

        if (res.status === 404) {
          // Fallback to default landing page if no CMS content
          if (!cancelled) {
            setSnapshot(null);
          }
          return;
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Landing Page konnte nicht geladen werden (${res.status})`);
        }

        const data = await res.json().catch(() => null);
        if (!cancelled) {
          setSnapshot(data?.snapshot || null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Landing Page konnte nicht geladen werden');
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

  // Default Landing Page Content (wenn kein CMS Content vorhanden)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Lade…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error}</p>
          <Link href="/login">
            <Button>Zum Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // CMS Content vorhanden - rendern
  if (snapshot?.html) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[980px] mx-auto p-5">
          <div
            className="prose prose-invert mt-4 max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(localizeCmsHtml(String(snapshot.html))) }}
          />
        </div>
      </div>
    );
  }

  // Default Fallback Landing Page
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Event-Fotos einfach teilen
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Die professionelle Plattform für Hochzeiten, Geburtstage und Events. 
            Gäste laden Fotos hoch, du moderierst und teilst sie – alles an einem Ort.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="primary">
                Jetzt kostenlos starten
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-app-surface p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">📸 Upload & Moderation</h3>
            <p className="text-muted-foreground">
              Gäste laden Fotos hoch, du entscheidest was veröffentlicht wird. 
              QR-Codes machen den Zugang kinderleicht.
            </p>
          </div>
          <div className="bg-app-surface p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">🎨 Kategorien & Alben</h3>
            <p className="text-muted-foreground">
              Organisiere Fotos in Alben, erstelle Challenges und halte 
              besondere Momente fest.
            </p>
          </div>
          <div className="bg-app-surface p-6 rounded-lg border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">💾 Download & Teilen</h3>
            <p className="text-muted-foreground">
              Alle Fotos als ZIP herunterladen oder einzeln teilen. 
              Vollständige Kontrolle über deine Event-Medien.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-app-surface p-8 rounded-lg border border-border">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Bereit loszulegen?
          </h2>
          <p className="text-muted-foreground mb-6">
            Erstelle dein erstes Event in wenigen Minuten.
          </p>
          <Link href="/register">
            <Button size="lg" variant="primary">
              Kostenlos registrieren
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
