'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, Loader2, CheckCircle2, AlertTriangle,
  XCircle, Clock, Zap, Activity, TrendingUp, MinusCircle,
} from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

interface ProviderStat {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
  isDefault: boolean;
  requests: number;
  errors: number;
  errorRatePct: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalCostCents: number;
  lastSeenAt: string | null;
  status: 'OK' | 'DEGRADED' | 'IDLE' | 'DISABLED';
}

const STATUS_CONFIG = {
  OK:       { label: 'OK',         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', icon: CheckCircle2,   dot: 'bg-emerald-500' },
  DEGRADED: { label: 'Degradiert', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',                 icon: AlertTriangle,   dot: 'bg-red-500 animate-pulse' },
  IDLE:     { label: 'Inaktiv',    color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',          icon: MinusCircle,     dot: 'bg-amber-400' },
  DISABLED: { label: 'Deaktiviert',color: 'bg-muted text-muted-foreground',                                                icon: XCircle,         dot: 'bg-muted-foreground/40' },
};

const PROVIDER_TYPES: Record<string, string> = {
  LLM: 'LLM', IMAGE_GEN: 'Bild-KI', FACE_RECOGNITION: 'Face', VIDEO_GEN: 'Video', STT: 'STT', TTS: 'TTS',
};

const HOURS_OPTIONS = [1, 6, 24, 168];

function latencyColor(ms: number) {
  if (ms === 0) return 'text-muted-foreground';
  if (ms < 500) return 'text-emerald-600 dark:text-emerald-400';
  if (ms < 2000) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function errRateColor(pct: number) {
  if (pct === 0) return 'text-emerald-600 dark:text-emerald-400';
  if (pct < 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function AiMonitoringPage() {
  const [providers, setProviders] = useState<ProviderStat[]>([]);
  const [period, setPeriod] = useState<{ hours: number; since: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hours, setHours] = useState(24);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async (h = hours) => {
    setRefreshing(true);
    try {
      const res = await api.get(`/admin/ai-providers/monitoring?hours=${h}`);
      setProviders(res.data.providers || []);
      setPeriod(res.data.period || null);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours]);

  useEffect(() => { load(); }, [load]);

  const changeHours = (h: number) => { setHours(h); load(h); };

  const summary = {
    total: providers.length,
    ok: providers.filter((p) => p.status === 'OK').length,
    degraded: providers.filter((p) => p.status === 'DEGRADED').length,
    idle: providers.filter((p) => p.status === 'IDLE').length,
    disabled: providers.filter((p) => p.status === 'DISABLED').length,
    totalRequests: providers.reduce((s, p) => s + p.requests, 0),
    totalErrors: providers.reduce((s, p) => s + p.errors, 0),
    totalCostEur: providers.reduce((s, p) => s + p.totalCostCents, 0) / 100,
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> KI-Provider Monitoring
                </h1>
                <p className="text-xs text-muted-foreground">
                  {lastRefresh ? `Aktualisiert: ${lastRefresh.toLocaleTimeString('de-DE')}` : 'Lade…'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <div className="flex bg-muted rounded-lg p-0.5 gap-0.5">
                {HOURS_OPTIONS.map((h) => (
                  <button key={h} onClick={() => changeHours(h)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${hours === h ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                    {h < 24 ? `${h}h` : h === 24 ? '24h' : '7d'}
                  </button>
                ))}
              </div>
              <button onClick={() => load()} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Provider OK', value: summary.ok, icon: CheckCircle2, color: 'text-emerald-600' },
                  { label: 'Degradiert', value: summary.degraded, icon: AlertTriangle, color: summary.degraded > 0 ? 'text-red-600' : 'text-muted-foreground/40' },
                  { label: 'Requests', value: summary.totalRequests.toLocaleString('de-DE'), icon: TrendingUp, color: 'text-indigo-500' },
                  { label: 'Kosten', value: `${summary.totalCostEur.toFixed(2)} €`, icon: Zap, color: 'text-amber-500' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">{value}</div>
                  </div>
                ))}
              </div>

              {/* Provider table */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-foreground text-sm">
                    Provider-Status — letzte {hours < 24 ? `${hours}h` : hours === 24 ? '24h' : '7 Tage'}
                  </h2>
                  <span className="text-xs text-muted-foreground">{summary.total} Provider</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">Provider</th>
                        <th className="text-left px-3 py-2.5 font-medium">Typ</th>
                        <th className="text-left px-3 py-2.5 font-medium">Status</th>
                        <th className="text-right px-3 py-2.5 font-medium">Requests</th>
                        <th className="text-right px-3 py-2.5 font-medium">Fehlerrate</th>
                        <th className="text-right px-3 py-2.5 font-medium">Ø Latenz</th>
                        <th className="text-right px-3 py-2.5 font-medium">p95</th>
                        <th className="text-right px-3 py-2.5 font-medium">Kosten</th>
                        <th className="text-right px-4 py-2.5 font-medium">Zuletzt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {providers.map((p) => {
                        const cfg = STATUS_CONFIG[p.status];
                        const Icon = cfg.icon;
                        return (
                          <tr key={p.id} className={`hover:bg-muted/20 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                <div>
                                  <span className="font-medium text-foreground">{p.name}</span>
                                  {p.isDefault && (
                                    <span className="ml-1.5 text-xs px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">default</span>
                                  )}
                                  <div className="text-xs text-muted-foreground">{p.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{PROVIDER_TYPES[p.type] || p.type}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>
                                <Icon className="w-3 h-3" />{cfg.label}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-sm">{p.requests.toLocaleString('de-DE')}</td>
                            <td className={`px-3 py-3 text-right font-mono text-sm font-medium ${errRateColor(p.errorRatePct)}`}>
                              {p.requests > 0 ? `${p.errorRatePct.toFixed(1)}%` : '—'}
                            </td>
                            <td className={`px-3 py-3 text-right font-mono text-sm ${latencyColor(p.avgLatencyMs)}`}>
                              {p.avgLatencyMs > 0 ? `${p.avgLatencyMs}ms` : '—'}
                            </td>
                            <td className={`px-3 py-3 text-right font-mono text-sm ${latencyColor(p.p95LatencyMs)}`}>
                              {p.p95LatencyMs > 0 ? `${p.p95LatencyMs}ms` : '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-sm text-muted-foreground">
                              {p.totalCostCents > 0 ? `${(p.totalCostCents / 100).toFixed(3)} €` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {p.lastSeenAt ? (
                                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {new Date(p.lastSeenAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ) : <span className="text-xs text-muted-foreground/40">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      {providers.length === 0 && (
                        <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground/60 text-sm">Keine Provider gefunden</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {period && (
                <p className="text-xs text-muted-foreground text-right">
                  Zeitraum: {new Date(period.since).toLocaleString('de-DE')} — jetzt
                </p>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
