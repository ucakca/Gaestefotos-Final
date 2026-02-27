'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Loader2, CheckCircle, XCircle, Clock, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AiResult {
  status: 'QUEUED' | 'PROCESSING' | 'DONE' | 'FAILED' | 'CANCELLED';
  workflow: string;
  resultUrl: string | null;
  guestName: string | null;
  eventTitle: string | null;
  eventSlug: string | null;
  computeTimeMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

const WORKFLOW_LABELS: Record<string, string> = {
  bfs_head_v5: 'Face Swap',
  style_transfer_pulid: 'Style Transfer',
  anime_transform: 'Anime Transformation',
  superhero: 'Superheld',
  magazine_cover: 'Magazin-Cover',
  vintage: 'Zeitreise',
  upscale_4x: 'HD Upscaling',
};

export default function AiResultPage({ params }: { params: Promise<{ code: string }> }) {
  const [result, setResult] = useState<AiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setCode(p.code));
  }, [params]);

  useEffect(() => {
    if (!code) return;

    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/r/${code}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Ergebnis nicht gefunden');
          } else {
            setError('Fehler beim Laden');
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setResult(data);
        setLoading(false);
      } catch {
        setError('Netzwerkfehler');
        setLoading(false);
      }
    };

    fetchResult();

    // Poll every 3s if still processing
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/r/${code}`);
        if (res.ok) {
          const data = await res.json();
          setResult(data);
          if (data.status === 'DONE' || data.status === 'FAILED' || data.status === 'CANCELLED') {
            clearInterval(interval);
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [code]);

  const workflowLabel = result ? (WORKFLOW_LABELS[result.workflow] || result.workflow) : '';

  const handleDownload = () => {
    if (!result?.resultUrl) return;
    const a = document.createElement('a');
    a.href = result.resultUrl;
    a.download = `gaestefotos-${workflowLabel.toLowerCase().replace(/\s+/g, '-')}.jpg`;
    a.click();
  };

  const handleShare = async () => {
    if (!result?.resultUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${workflowLabel} — gästefotos.com`,
          text: `Schau dir mein ${workflowLabel}-Foto an! 🎉`,
          url: window.location.href,
        });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-8 h-8 text-warning animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Lade Ergebnis...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{error || 'Nicht gefunden'}</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Der Link ist ungültig oder das Ergebnis wurde entfernt.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-warning hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning" />
            <span className="font-semibold text-foreground text-sm">gästefotos.com</span>
          </div>
          {result.eventSlug && (
            <Link
              href={`/e3/${result.eventSlug}`}
              className="text-xs text-muted-foreground hover:text-warning transition-colors"
            >
              Zum Event →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Status Section */}
        <AnimatePresence mode="wait">
          {(result.status === 'QUEUED' || result.status === 'PROCESSING') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-warning/20" />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-warning border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-warning" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                KI arbeitet...
              </h1>
              <p className="text-muted-foreground mb-2">
                Dein <strong>{workflowLabel}</strong>-Foto wird gerade erstellt.
              </p>
              <p className="text-xs text-muted-foreground">
                {result.status === 'QUEUED' ? 'In der Warteschlange' : 'Wird verarbeitet'} — dauert ca. 20-30 Sekunden
              </p>
              {result.guestName && (
                <p className="mt-4 text-sm text-foreground/80">
                  Für: <strong>{result.guestName}</strong>
                </p>
              )}
            </motion.div>
          )}

          {result.status === 'DONE' && result.resultUrl && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Success Header */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                </motion.div>
                <h1 className="text-2xl font-bold text-foreground">Fertig! 🎉</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Dein <strong>{workflowLabel}</strong>-Foto ist bereit
                  {result.guestName && <> für <strong>{result.guestName}</strong></>}
                </p>
              </div>

              {/* Result Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl overflow-hidden shadow-2xl border border-border"
              >
                <img
                  src={result.resultUrl}
                  alt={workflowLabel}
                  className="w-full"
                />
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-warning text-warning-foreground font-semibold shadow-lg shadow-warning/30 hover:opacity-90 transition-opacity"
                >
                  <Download className="w-5 h-5" />
                  Speichern
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  Teilen
                </button>
              </motion.div>

              {/* Event Link */}
              {result.eventTitle && result.eventSlug && (
                <div className="text-center pt-2">
                  <Link
                    href={`/e3/${result.eventSlug}`}
                    className="text-sm text-warning font-medium hover:underline"
                  >
                    Mehr Fotos von „{result.eventTitle}" ansehen →
                  </Link>
                </div>
              )}

              {/* Stats */}
              {result.computeTimeMs && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Verarbeitet in {(result.computeTimeMs / 1000).toFixed(1)}s
                </div>
              )}
            </motion.div>
          )}

          {(result.status === 'FAILED' || result.status === 'CANCELLED') && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <h1 className="text-xl font-bold text-foreground mb-2">
                {result.status === 'CANCELLED' ? 'Abgebrochen' : 'Fehlgeschlagen'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {result.status === 'CANCELLED'
                  ? 'Dieser Job wurde abgebrochen.'
                  : 'Bei der Verarbeitung ist ein Fehler aufgetreten. Bitte versuche es erneut.'}
              </p>
              {result.eventSlug && (
                <Link
                  href={`/e3/${result.eventSlug}`}
                  className="inline-block mt-6 text-sm text-warning font-medium hover:underline"
                >
                  Zurück zum Event →
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-sm border-t border-border py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          Erstellt mit ❤️ von <a href="https://gästefotos.com" className="text-warning hover:underline">gästefotos.com</a>
        </p>
      </div>
    </div>
  );
}
