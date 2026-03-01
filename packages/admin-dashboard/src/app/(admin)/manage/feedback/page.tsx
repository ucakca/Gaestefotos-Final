'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Loader2, RotateCcw, ExternalLink, MessageSquare, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '@/lib/api';

interface FeedbackItem {
  id: string;
  rating: number;
  message: string | null;
  context: string;
  googleReviewSent: boolean;
  createdAt: string;
  eventId: string | null;
}

interface FeedbackStats {
  total: number;
  averageRating: number;
  distribution: Record<number, number>;
  googleReviewsSent: number;
  negativeFeedback: number;
  positiveFeedback: number;
  recent: FeedbackItem[];
}

export default function FeedbackDashboardPage() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/feedback/stats');
      setStats(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Feedback konnte nicht geladen werden.</p>
        <button onClick={loadStats} className="mt-2 text-sm text-primary hover:underline">Erneut versuchen</button>
      </div>
    );
  }

  const maxDistribution = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Gast-Feedback & Google Reviews</h1>
          <p className="text-sm text-muted-foreground">Bewertungen von der Ergebnis-Seite (/r/:code)</p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
          Aktualisieren
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Gesamt
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Durchschnitt
          </div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
            {stats.averageRating > 0 && <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-green-600 text-xs mb-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            Positiv (4-5★)
          </div>
          <div className="text-2xl font-bold text-green-600">{stats.positiveFeedback}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs mb-1">
            <ThumbsDown className="w-3.5 h-3.5" />
            Kritisch (1-3★)
          </div>
          <div className="text-2xl font-bold text-red-500">{stats.negativeFeedback}</div>
        </div>
      </div>

      {/* Distribution + Google */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Rating Distribution */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4">Bewertungsverteilung</h3>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map(rating => {
              const count = stats.distribution[rating] || 0;
              const pct = maxDistribution > 0 ? (count / maxDistribution) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-4 text-right">{rating}</span>
                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${rating >= 4 ? 'bg-green-500' : rating === 3 ? 'bg-yellow-500' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Google Reviews */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Google Review Weiterleitungen
          </h3>
          <div className="text-center py-6">
            <div className="text-4xl font-bold text-blue-500">{stats.googleReviewsSent}</div>
            <p className="text-xs text-muted-foreground mt-1">Gäste haben auf Google geklickt</p>
            {stats.positiveFeedback > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Konversionsrate: <strong>{Math.round((stats.googleReviewsSent / stats.positiveFeedback) * 100)}%</strong> der 4-5★ Bewertungen
              </p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Google Place ID kann in den App-Settings (<code>google_place_id</code>) oder pro Event in <code>featuresConfig.googlePlaceId</code> konfiguriert werden.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      {stats.recent.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <h3 className="text-sm font-semibold">Neuestes Feedback</h3>
          </div>
          <div className="divide-y divide-border/30">
            {stats.recent.map(item => (
              <div key={item.id} className="px-5 py-3 flex items-start gap-4 hover:bg-muted/5 transition-colors">
                <div className="pt-0.5">{renderStars(item.rating)}</div>
                <div className="flex-1 min-w-0">
                  {item.message ? (
                    <p className="text-sm text-foreground">{item.message}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Kein Kommentar</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatTime(item.createdAt)}</span>
                    <span>{item.context}</span>
                    {item.googleReviewSent && (
                      <span className="text-blue-500 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Google
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.total === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Noch kein Feedback erhalten.</p>
          <p className="text-xs mt-1">Feedback wird automatisch gesammelt, wenn Gäste die Ergebnis-Seite besuchen.</p>
        </div>
      )}
    </div>
  );
}
