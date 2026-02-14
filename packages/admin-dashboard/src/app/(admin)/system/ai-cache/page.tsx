'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database,
  RefreshCw,
  Trash2,
  Flame,
  Wifi,
  WifiOff,
  Loader2,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface CacheStats {
  cacheSize: number;
  hitRate: number;
  totalCalls: number;
  totalHits: number;
  totalMisses: number;
  avgResponseTime: number;
  entriesByFeature: Record<string, number>;
  offlineReady: boolean;
}

interface WarmUpResult {
  success: boolean;
  cached: number;
  errors: number;
}

const EVENT_TYPES = [
  { value: 'hochzeit', label: 'Hochzeit', icon: '💒' },
  { value: 'geburtstag', label: 'Geburtstag', icon: '🎂' },
  { value: 'firmenfeier', label: 'Firmenfeier', icon: '🏢' },
  { value: 'taufe', label: 'Taufe', icon: '👶' },
  { value: 'jubilaeum', label: 'Jubiläum', icon: '🎉' },
  { value: 'abschlussfeier', label: 'Abschlussfeier', icon: '🎓' },
  { value: 'messe', label: 'Messe', icon: '📊' },
  { value: 'konzert', label: 'Konzert', icon: '🎵' },
];

export default function AiCachePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [warmingUp, setWarmingUp] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(['hochzeit', 'geburtstag', 'firmenfeier']);
  const [lastWarmUp, setLastWarmUp] = useState<WarmUpResult | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CacheStats>('/ai/cache/stats');
      setStats(res.data);
      setIsOnline(res.data.offlineReady || false);
    } catch (err) {
      console.error('Failed to load cache stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOnlineStatus = useCallback(async () => {
    try {
      const res = await api.get<{ online: boolean }>('/ai/cache/online-status');
      setIsOnline(res.data.online);
    } catch (err) {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 30000);
    return () => clearInterval(interval);
  }, [loadStats, checkOnlineStatus]);

  const handleWarmUp = async () => {
    if (selectedEventTypes.length === 0) return;
    setWarmingUp(true);
    setLastWarmUp(null);
    try {
      const res = await api.post<WarmUpResult>('/ai/cache/warm-up', {
        eventTypes: selectedEventTypes,
      });
      setLastWarmUp(res.data);
      await loadStats();
    } catch (err) {
      console.error('Warm-up failed:', err);
      setLastWarmUp({ success: false, cached: 0, errors: 1 });
    } finally {
      setWarmingUp(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Cache wirklich leeren? Das kann die Performance vorübergehend verschlechtern.')) return;
    setClearing(true);
    try {
      await api.delete('/ai/cache');
      await loadStats();
    } catch (err) {
      console.error('Clear cache failed:', err);
    } finally {
      setClearing(false);
    }
  };

  const toggleEventType = (type: string) => {
    setSelectedEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const hitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Database className="w-6 h-6 text-app-accent" />
            AI Cache Verwaltung
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Offline-Fähigkeit und Cache-Performance verwalten
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOnline ? (
            <span className="flex items-center gap-2 text-green-500 text-sm">
              <Wifi className="w-4 h-4" />
              AI Online
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-500 text-sm">
              <WifiOff className="w-4 h-4" />
              AI Offline
            </span>
          )}
          <Button size="sm" variant="outline" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <BarChart3 className="w-4 h-4" />
              Hit Rate
            </div>
            <div className={`text-2xl font-bold ${hitRateColor(stats.hitRate)}`}>
              {stats.hitRate.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Database className="w-4 h-4" />
              Cache Einträge
            </div>
            <div className="text-2xl font-bold text-app-fg">
              {stats.cacheSize.toLocaleString('de-DE')}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Cache Hits
            </div>
            <div className="text-2xl font-bold text-green-500">
              {stats.totalHits.toLocaleString('de-DE')}
            </div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-center gap-2 text-app-muted text-sm mb-1">
              <Clock className="w-4 h-4" />
              Avg Response
            </div>
            <div className="text-2xl font-bold text-app-fg">
              {stats.avgResponseTime.toFixed(0)}ms
            </div>
          </div>
        </div>
      )}

      {/* Entries by Feature */}
      {stats && stats.entriesByFeature && Object.keys(stats.entriesByFeature).length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-card p-6">
          <h3 className="font-semibold text-app-fg mb-4">Cache-Einträge nach Feature</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.entriesByFeature).map(([feature, count]) => (
              <div key={feature} className="bg-app-bg rounded-lg p-3">
                <div className="text-sm text-app-muted">{feature}</div>
                <div className="text-lg font-semibold text-app-fg">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cache Warm-Up */}
      <div className="rounded-xl border border-app-border bg-app-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-app-fg flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Cache aufwärmen
            </h3>
            <p className="text-sm text-app-muted mt-1">
              Generiere AI-Antworten für ausgewählte Event-Typen vorab
            </p>
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm text-app-muted mb-2">Event-Typen auswählen:</div>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => toggleEventType(type.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedEventTypes.includes(type.value)
                    ? 'bg-app-accent text-white'
                    : 'bg-app-bg border border-app-border text-app-muted hover:text-app-fg'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            onClick={handleWarmUp}
            disabled={warmingUp || selectedEventTypes.length === 0}
          >
            {warmingUp ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aufwärmen...
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 mr-2" />
                Cache aufwärmen ({selectedEventTypes.length} Typen)
              </>
            )}
          </Button>

          {lastWarmUp && (
            <div className={`text-sm ${lastWarmUp.success ? 'text-green-500' : 'text-red-500'}`}>
              {lastWarmUp.success ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {lastWarmUp.cached} Einträge gecached
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Fehler beim Aufwärmen
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <h3 className="font-semibold text-red-500 mb-2">Gefahrenzone</h3>
        <p className="text-sm text-app-muted mb-4">
          Das Leeren des Cache kann die Performance vorübergehend verschlechtern,
          bis neue Einträge generiert werden.
        </p>
        <Button
          variant="outline"
          onClick={handleClearCache}
          disabled={clearing}
          className="border-red-500/50 text-red-500 hover:bg-red-500/10"
        >
          {clearing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Leeren...
            </>
          ) : (
            <>
              <Trash2 className="w-4 h-4 mr-2" />
              Cache leeren
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="rounded-xl border border-app-border bg-app-card p-6">
        <h3 className="font-semibold text-app-fg mb-3">Über den AI-Cache</h3>
        <div className="text-sm text-app-muted space-y-2">
          <p>
            Der AI-Cache speichert generierte Antworten für häufige Anfragen (z.B. Album-Vorschläge,
            Überschriften, Hashtags) in Redis mit einem TTL von 30 Tagen.
          </p>
          <p>
            <strong>Offline-Modus:</strong> Bei schlechter Internetverbindung auf Events
            werden gecachte Antworten verwendet, sodass AI-Features auch offline funktionieren.
          </p>
          <p>
            <strong>Warm-Up:</strong> Generiert vorab Antworten für ausgewählte Event-Typen,
            um die erste Anfrage schneller zu machen.
          </p>
        </div>
      </div>
    </div>
  );
}
