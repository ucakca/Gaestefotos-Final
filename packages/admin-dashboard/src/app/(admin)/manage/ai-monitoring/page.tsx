'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Activity, RefreshCw, CheckCircle, XCircle, Clock,
  Loader2, TrendingUp, AlertTriangle, Zap, Brain,
} from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ProviderStat {
  providerId: string;
  _sum: { totalTokens: number | null; costCents: number | null };
  _count: number;
  _avg: { durationMs: number | null };
}

interface FeatureStat {
  feature: string;
  _sum: { totalTokens: number | null; costCents: number | null };
  _count: number;
  _avg: { durationMs: number | null };
}

interface Provider {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
}

interface UsageStats {
  period: { days: number; since: string };
  perProvider: ProviderStat[];
  perFeature: FeatureStat[];
  errorRate: string;
  errorRatePerProvider: Record<string, string>;
  monthly: { requests: number; tokens: number; costCents: number };
}

const PROVIDER_TYPE_COLOR: Record<string, string> = {
  LLM: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  IMAGE_GEN: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  VIDEO_GEN: 'text-red-400 bg-red-500/10 border-red-500/30',
  FACE_RECOGNITION: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
};

function formatMs(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cents: number | null) {
  if (!cents) return '€0.00';
  return `€${(cents / 100).toFixed(4)}`;
}

function ErrorRateBadge({ rate }: { rate: string }) {
  const n = parseFloat(rate);
  if (n === 0) return <span className="text-xs text-green-400">0% Fehler</span>;
  if (n < 5) return <span className="text-xs text-yellow-400">{rate}% Fehler</span>;
  return <span className="text-xs text-red-400 font-semibold">{rate}% Fehler</span>;
}

export default function AiMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    try {
      const [provRes, statsRes] = await Promise.all([
        api.get<{ providers: Provider[] }>('/admin/ai-providers'),
        api.get<UsageStats>(`/admin/ai-providers/usage/stats?days=${days}`),
      ]);
      setProviders(provRes.data.providers || []);
      setStats(statsRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    toast.success('Daten aktualisiert');
  };

  const providerMap = Object.fromEntries(providers.map(p => [p.id, p]));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-app-muted" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-app-fg flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Provider Monitor
            </h1>
            <p className="text-sm text-app-muted mt-1">Latenz, Fehlerrate und Nutzung pro AI Provider</p>
          </div>
          <div className="flex items-center gap-2">
            {([7, 14, 30] as const).map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  days === d
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                    : 'border-app-border text-app-muted hover:text-app-fg'
                }`}
              >
                {d}d
              </button>
            ))}
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Overview KPIs */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Gesamt Requests', value: stats.monthly.requests.toLocaleString(), icon: Zap, color: 'text-blue-400' },
              { label: 'Fehlerrate', value: `${stats.errorRate}%`, icon: AlertTriangle, color: parseFloat(stats.errorRate) > 5 ? 'text-red-400' : 'text-green-400' },
              { label: 'Ø Latenz', value: formatMs(stats.perProvider.reduce((sum, p) => sum + (p._avg.durationMs || 0), 0) / Math.max(stats.perProvider.length, 1)), icon: Clock, color: 'text-amber-400' },
              { label: 'Kosten (Monat)', value: formatCost(stats.monthly.costCents), icon: TrendingUp, color: 'text-purple-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl border border-app-border bg-app-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-app-muted">{label}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Provider Status Grid */}
        <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
          <div className="px-5 py-4 border-b border-app-border flex items-center gap-2">
            <Brain className="w-4 h-4 text-app-muted" />
            <h2 className="text-sm font-semibold text-app-fg">Provider Status & Performance</h2>
          </div>
          <div className="divide-y divide-app-border">
            {providers.filter(p => p.isActive).map(provider => {
              const usage = stats?.perProvider.find(u => u.providerId === provider.id);
              const errorRate = stats?.errorRatePerProvider[provider.id] || '0';
              const avgMs = usage?._avg.durationMs || null;
              const requests = usage?._count || 0;
              const costCents = usage?._sum.costCents || 0;
              const typeClass = PROVIDER_TYPE_COLOR[provider.type] || 'text-app-muted bg-app-border/30 border-app-border';

              return (
                <div key={provider.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Status + Name */}
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    {provider.hasApiKey ? (
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-fg truncate">{provider.name || provider.slug}</p>
                      {provider.isDefault && (
                        <span className="text-[10px] text-green-400">● Standard</span>
                      )}
                    </div>
                  </div>

                  {/* Type badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeClass} shrink-0`}>
                    {provider.type}
                  </span>

                  {/* Metrics */}
                  <div className="flex items-center gap-6 flex-1 text-sm">
                    <div className="text-center">
                      <p className="text-app-muted text-[10px] uppercase tracking-wide">Requests</p>
                      <p className="font-semibold text-app-fg">{requests > 0 ? requests.toLocaleString() : '—'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-app-muted text-[10px] uppercase tracking-wide">Ø Latenz</p>
                      <p className={`font-semibold ${avgMs && avgMs > 5000 ? 'text-red-400' : avgMs && avgMs > 2000 ? 'text-yellow-400' : 'text-app-fg'}`}>
                        {formatMs(avgMs)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-app-muted text-[10px] uppercase tracking-wide">Fehlerrate</p>
                      <ErrorRateBadge rate={errorRate} />
                    </div>
                    <div className="text-center">
                      <p className="text-app-muted text-[10px] uppercase tracking-wide">Kosten</p>
                      <p className="font-semibold text-app-fg">{costCents > 0 ? formatCost(costCents) : '—'}</p>
                    </div>
                  </div>

                  {/* No key warning */}
                  {!provider.hasApiKey && (
                    <span className="text-xs text-red-400 shrink-0">Kein API Key</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Features by Usage */}
        {stats && stats.perFeature.length > 0 && (
          <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
            <div className="px-5 py-4 border-b border-app-border flex items-center gap-2">
              <Zap className="w-4 h-4 text-app-muted" />
              <h2 className="text-sm font-semibold text-app-fg">Top Features (letzte {days} Tage)</h2>
            </div>
            <div className="divide-y divide-app-border">
              {[...stats.perFeature]
                .sort((a, b) => (b._count || 0) - (a._count || 0))
                .slice(0, 10)
                .map(feat => (
                  <div key={feat.feature} className="px-5 py-3 flex items-center gap-4">
                    <span className="text-sm font-mono text-app-muted w-48 truncate">{feat.feature}</span>
                    <div className="flex-1 bg-app-border/30 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, (feat._count / Math.max(...stats.perFeature.map(f => f._count))) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-app-fg w-16 text-right">{feat._count.toLocaleString()}</span>
                    <span className="text-xs text-app-muted w-20 text-right">{formatMs(feat._avg.durationMs)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Inactive providers */}
        {providers.filter(p => !p.isActive).length > 0 && (
          <div className="rounded-2xl border border-app-border/50 bg-app-card/50 p-5">
            <h2 className="text-sm font-semibold text-app-muted mb-3">Deaktivierte Provider</h2>
            <div className="flex flex-wrap gap-2">
              {providers.filter(p => !p.isActive).map(p => (
                <span key={p.id} className="text-xs px-3 py-1.5 rounded-lg border border-app-border text-app-muted">
                  {p.slug}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
