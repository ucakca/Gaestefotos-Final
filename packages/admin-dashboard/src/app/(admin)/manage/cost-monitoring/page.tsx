'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  DollarSign, TrendingUp, Zap, AlertTriangle, Activity,
  Clock, BarChart3, Server, ArrowUpRight, ArrowDownRight,
  RefreshCw, Shield, CheckCircle, XCircle, Loader2,
  List, ExternalLink, ChevronDown, ChevronRight, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CostSummary {
  totalCostCents: number;
  totalCostEur: number;
  totalTokens: number;
  totalRequests: number;
  successRate: number;
  avgDurationMs: number;
}

interface ProviderCost {
  name: string;
  type: string;
  costCents: number;
  requests: number;
  tokens: number;
}

interface FeatureCost {
  feature: string;
  costCents: number;
  requests: number;
  tokens: number;
}

interface TimelineBucket {
  time: string;
  costCents: number;
  costEur: number;
  tokens: number;
  requests: number;
  errors: number;
}

interface TopEvent {
  eventId: string;
  title: string;
  slug: string;
  costCents: number;
  costEur: number;
  tokens: number;
  requests: number;
}

interface Alert {
  level: 'info' | 'warning' | 'critical';
  message: string;
  detail: string;
}

interface RecentJob {
  id: string;
  feature: string;
  model: string | null;
  totalTokens: number;
  costCents: number;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
  provider: { id: string; slug: string; name: string; type: string };
}

interface ProviderLiveInfo {
  id: string;
  slug: string;
  name: string;
  type: string;
  hasApiKey: boolean;
  monthlyBudgetCents: number | null;
  stats30d: {
    requests: number;
    costCents: number;
    tokens: number;
    avgDurationMs: number;
    errorCount: number;
    errorRate: number;
  };
  lastUsed: { at: string; feature: string; model: string | null } | null;
  liveData: {
    source: string;
    recentPredictions?: {
      id: string;
      model: string;
      status: string;
      createdAt: string;
      completedAt: string | null;
      predictTime: number | null;
      source: string;
      error: string | null;
    }[];
    error?: string;
  } | null;
}

type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d';

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1 Std' },
  { value: '6h', label: '6 Std' },
  { value: '24h', label: '24 Std' },
  { value: '7d', label: '7 Tage' },
  { value: '30d', label: '30 Tage' },
  { value: '90d', label: '90 Tage' },
];

// ─── Helper Components ──────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-border/50 bg-card space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className={`w-4 h-4 ${color}`} /> {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function AlertBadge({ alert }: { alert: Alert }) {
  const styles = {
    info: { bg: 'bg-blue-500/10', text: 'text-blue-600', icon: CheckCircle },
    warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', icon: AlertTriangle },
    critical: { bg: 'bg-red-500/10', text: 'text-red-600', icon: XCircle },
  };
  const s = styles[alert.level];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${s.bg}`}>
      <s.icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.text}`} />
      <div>
        <div className={`text-sm font-semibold ${s.text}`}>{alert.message}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{alert.detail}</div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function TimelineChart({ data }: { data: TimelineBucket[] }) {
  if (data.length === 0) {
    return <div className="text-center text-muted-foreground text-sm py-8">Keine Daten im gewählten Zeitraum</div>;
  }

  const maxCost = Math.max(...data.map(d => d.costCents), 1);
  const maxRequests = Math.max(...data.map(d => d.requests), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-violet-500 inline-block" /> Kosten</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-400 inline-block" /> Requests</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Fehler</span>
      </div>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((bucket, i) => {
          const costPct = (bucket.costCents / maxCost) * 100;
          const reqPct = (bucket.requests / maxRequests) * 100;
          const hasErrors = bucket.errors > 0;
          const time = new Date(bucket.time);
          const label = time.getHours() + ':00';

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${time.toLocaleDateString('de-DE')} ${label}\n${(bucket.costCents / 100).toFixed(2)}€ | ${bucket.requests} Req | ${bucket.errors} Err`}>
              <div className="w-full flex gap-px items-end h-28">
                <div className="flex-1 rounded-t bg-violet-500/80" style={{ height: `${Math.max(costPct, 2)}%` }} />
                <div className="flex-1 rounded-t bg-blue-400/60" style={{ height: `${Math.max(reqPct, 2)}%` }} />
                {hasErrors && <div className="flex-1 rounded-t bg-red-400/80" style={{ height: `${Math.max((bucket.errors / maxRequests) * 100, 4)}%` }} />}
              </div>
              {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
                <span className="text-[9px] text-muted-foreground/50">{label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CostMonitoringPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [providers, setProviders] = useState<ProviderCost[]>([]);
  const [features, setFeatures] = useState<FeatureCost[]>([]);
  const [timeline, setTimeline] = useState<TimelineBucket[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [providerLive, setProviderLive] = useState<ProviderLiveInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'providers'>('overview');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, timelineRes, topRes, alertsRes, jobsRes, liveRes] = await Promise.all([
        api.get(`/admin/cost-monitoring/summary?timeRange=${timeRange}`),
        api.get(`/admin/cost-monitoring/timeline?timeRange=${timeRange}`),
        api.get(`/admin/cost-monitoring/top-events?timeRange=${timeRange}`),
        api.get('/admin/cost-monitoring/alerts'),
        api.get('/admin/cost-monitoring/recent-jobs?limit=50'),
        api.get('/admin/cost-monitoring/provider-live'),
      ]);

      setSummary(summaryRes.data.summary);
      setProviders(summaryRes.data.byProvider || []);
      setFeatures(summaryRes.data.topFeatures || []);
      setTimeline(timelineRes.data.timeline || []);
      setTopEvents(topRes.data.topEvents || []);
      setAlerts(alertsRes.data.alerts || []);
      setRecentJobs(jobsRes.data.jobs || []);
      setProviderLive(liveRes.data.providers || []);
    } catch (err: any) {
      toast.error('Fehler beim Laden der Kostendaten');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const fmt = (cents: number) => `${(cents / 100).toFixed(2)}€`;
  const fmtK = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-500" /> AI Cost Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Kosten, Tokens und Performance aller AI-Provider</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            {TIME_RANGES.map(tr => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  timeRange === tr.value
                    ? 'bg-violet-500 text-white'
                    : 'bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <button onClick={loadData} disabled={loading} className="p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-border/50">
        {([
          { key: 'overview', label: 'Übersicht', icon: BarChart3 },
          { key: 'jobs', label: 'Letzte Jobs', icon: List },
          { key: 'providers', label: 'Provider Details', icon: Server },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            {tab.key === 'jobs' && recentJobs.length > 0 && (
              <span className="ml-1 text-[10px] bg-muted/50 px-1.5 py-0.5 rounded-full">{recentJobs.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading && !summary ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ═══ TAB: Overview ═══ */}
          {activeTab === 'overview' && (<>
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, i) => <AlertBadge key={i} alert={alert} />)}
            </div>
          )}

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon={DollarSign} label="Gesamtkosten" value={fmt(summary.totalCostCents)} color="text-green-500" />
              <StatCard icon={Zap} label="Requests" value={fmtK(summary.totalRequests)} color="text-blue-500" />
              <StatCard icon={Activity} label="Tokens" value={fmtK(summary.totalTokens)} color="text-violet-500" />
              <StatCard icon={CheckCircle} label="Erfolgsrate" value={`${summary.successRate}%`} color="text-emerald-500" />
              <StatCard icon={Clock} label="Ø Dauer" value={`${summary.avgDurationMs}ms`} color="text-amber-500" />
              <StatCard icon={TrendingUp} label="Ø Kosten/Req" value={summary.totalRequests > 0 ? fmt(summary.totalCostCents / summary.totalRequests) : '—'} color="text-rose-500" />
            </div>
          )}

          {/* Timeline + Providers Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Timeline Chart */}
            <div className="lg:col-span-2 p-4 rounded-xl border border-border/50 bg-card space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-500" /> Kosten-Timeline
              </h2>
              <TimelineChart data={timeline} />
            </div>

            {/* Provider Breakdown */}
            <div className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" /> Provider
              </h2>
              {providers.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Keine Provider-Daten</div>
              ) : (
                <div className="space-y-3">
                  {providers.map((p, i) => {
                    const maxCost = providers[0]?.costCents || 1;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{p.name}</span>
                          <span className="text-xs font-mono text-muted-foreground">{fmt(p.costCents)}</span>
                        </div>
                        <MiniBar value={p.costCents} max={maxCost} color="bg-blue-500" />
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          <span>{p.requests} Req</span>
                          <span>{fmtK(p.tokens)} Tokens</span>
                          <span className="px-1 py-0.5 rounded bg-muted/30 font-mono">{p.type}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Features + Top Events Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Feature Breakdown */}
            <div className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Kosten nach Feature
              </h2>
              {features.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Keine Feature-Daten</div>
              ) : (
                <div className="space-y-2">
                  {features.slice(0, 12).map((f, i) => {
                    const maxCost = features[0]?.costCents || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium font-mono">{f.feature}</span>
                            <span className="text-xs text-muted-foreground">{fmt(f.costCents)} · {f.requests}×</span>
                          </div>
                          <MiniBar value={f.costCents} max={maxCost} color="bg-amber-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Events */}
            <div className="p-4 rounded-xl border border-border/50 bg-card space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-rose-500" /> Top Events (nach Kosten)
              </h2>
              {topEvents.length === 0 ? (
                <div className="text-xs text-muted-foreground py-4 text-center">Keine Event-Daten</div>
              ) : (
                <div className="space-y-2">
                  {topEvents.slice(0, 10).map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <span className={`text-xs font-bold w-5 text-center ${i < 3 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{e.title}</div>
                        <div className="text-[10px] text-muted-foreground">{e.requests} Requests · {fmtK(e.tokens)} Tokens</div>
                      </div>
                      <div className="text-xs font-mono font-semibold text-right shrink-0">
                        {fmt(e.costCents)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </>)}

          {/* ═══ TAB: Recent Jobs ═══ */}
          {activeTab === 'jobs' && (
            <div className="p-4 rounded-xl border border-border/50 bg-card">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <List className="w-4 h-4 text-violet-500" /> Letzte AI-Jobs
              </h2>
              {recentJobs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">Keine Jobs gefunden</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/30 text-muted-foreground">
                        <th className="text-left py-2 pr-3 font-medium">Zeitpunkt</th>
                        <th className="text-left py-2 pr-3 font-medium">Provider</th>
                        <th className="text-left py-2 pr-3 font-medium">Feature</th>
                        <th className="text-left py-2 pr-3 font-medium">Model</th>
                        <th className="text-right py-2 pr-3 font-medium">Tokens</th>
                        <th className="text-right py-2 pr-3 font-medium">Dauer</th>
                        <th className="text-right py-2 pr-3 font-medium">Kosten</th>
                        <th className="text-center py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.map(job => {
                        const time = new Date(job.createdAt);
                        return (
                          <tr key={job.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                              {time.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}{' '}
                              {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2 pr-3">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-medium">{job.provider.name}</span>
                            </td>
                            <td className="py-2 pr-3 font-mono">{job.feature}</td>
                            <td className="py-2 pr-3 text-muted-foreground font-mono truncate max-w-[140px]" title={job.model || '—'}>
                              {job.model ? job.model.split('/').pop()?.split(':')[0] || job.model : '—'}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono">{job.totalTokens > 0 ? fmtK(job.totalTokens) : '—'}</td>
                            <td className="py-2 pr-3 text-right font-mono">
                              {job.durationMs > 0 ? (job.durationMs >= 1000 ? `${(job.durationMs / 1000).toFixed(1)}s` : `${job.durationMs}ms`) : '—'}
                            </td>
                            <td className="py-2 pr-3 text-right font-mono font-semibold">{fmt(job.costCents)}</td>
                            <td className="py-2 text-center">
                              {job.success ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" />
                              ) : (
                                <span className="group relative">
                                  <XCircle className="w-3.5 h-3.5 text-red-500 inline" />
                                  {job.errorMessage && (
                                    <span className="hidden group-hover:block absolute right-0 top-full mt-1 z-10 p-2 bg-popover border border-border rounded-lg shadow-lg text-xs text-left max-w-[250px] whitespace-normal">
                                      {job.errorMessage}
                                    </span>
                                  )}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB: Provider Details ═══ */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              {providerLive.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-12">Keine aktiven Provider gefunden</div>
              ) : (
                providerLive.map(p => (
                  <div key={p.id} className="p-4 rounded-xl border border-border/50 bg-card space-y-4">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${p.hasApiKey ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <Server className={`w-4 h-4 ${p.hasApiKey ? 'text-green-600' : 'text-red-500'}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{p.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-1.5 py-0.5 rounded bg-muted/50 font-mono">{p.type}</span>
                            <span className="font-mono">{p.slug}</span>
                            {!p.hasApiKey && <span className="text-red-500 font-medium">Kein API Key</span>}
                          </div>
                        </div>
                      </div>
                      {p.monthlyBudgetCents && (
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground">Budget/Monat</div>
                          <div className="text-sm font-semibold">{fmt(p.monthlyBudgetCents)}</div>
                        </div>
                      )}
                    </div>

                    {/* 30-Day Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="p-2 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground">Requests (30d)</div>
                        <div className="text-sm font-bold">{p.stats30d.requests}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground">Kosten (30d)</div>
                        <div className="text-sm font-bold">{fmt(p.stats30d.costCents)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground">Tokens (30d)</div>
                        <div className="text-sm font-bold">{fmtK(p.stats30d.tokens)}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground">Ø Dauer</div>
                        <div className="text-sm font-bold">{p.stats30d.avgDurationMs > 0 ? `${(p.stats30d.avgDurationMs / 1000).toFixed(1)}s` : '—'}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/20 text-center">
                        <div className="text-[10px] text-muted-foreground">Fehlerrate</div>
                        <div className={`text-sm font-bold ${p.stats30d.errorRate > 10 ? 'text-red-500' : p.stats30d.errorRate > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                          {p.stats30d.errorRate}%
                        </div>
                      </div>
                    </div>

                    {/* Last Used */}
                    {p.lastUsed && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Zuletzt: {new Date(p.lastUsed.at).toLocaleString('de-DE')} — <span className="font-mono">{p.lastUsed.feature}</span>
                        {p.lastUsed.model && <span className="font-mono opacity-60">({p.lastUsed.model.split('/').pop()?.split(':')[0]})</span>}
                      </div>
                    )}

                    {/* Replicate Live Predictions */}
                    {p.liveData?.recentPredictions && p.liveData.recentPredictions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Live Predictions (Replicate API)
                        </h4>
                        <div className="space-y-1">
                          {p.liveData.recentPredictions.map(pred => (
                            <div key={pred.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${
                                pred.status === 'succeeded' ? 'bg-green-500' :
                                pred.status === 'failed' ? 'bg-red-500' :
                                pred.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                                'bg-muted'
                              }`} />
                              <span className="font-mono text-muted-foreground whitespace-nowrap">
                                {new Date(pred.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="font-mono truncate flex-1" title={pred.model}>
                                {pred.model?.split('/').pop() || pred.model || '—'}
                              </span>
                              {pred.predictTime && (
                                <span className="text-muted-foreground font-mono">{pred.predictTime.toFixed(1)}s</span>
                              )}
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                pred.status === 'succeeded' ? 'bg-green-500/10 text-green-600' :
                                pred.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                                pred.status === 'processing' ? 'bg-blue-500/10 text-blue-600' :
                                'bg-muted/50 text-muted-foreground'
                              }`}>
                                {pred.status}
                              </span>
                              <span className="text-muted-foreground/50">{pred.source}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {p.liveData?.error && (
                      <div className="text-xs text-amber-600 bg-amber-500/5 p-2 rounded-lg">
                        API-Fehler: {p.liveData.error}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
