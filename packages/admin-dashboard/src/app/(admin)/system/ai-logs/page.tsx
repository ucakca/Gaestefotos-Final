'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, AlertTriangle, Search, RefreshCw,
  TrendingUp, BarChart3, Clock, ChevronLeft, ChevronRight,
  Zap, Bug, Info, Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface LogEntry {
  id: string;
  level: string;
  type: string;
  message: string | null;
  data: any;
  createdAt: string;
}

interface Pattern {
  type: string;
  count: number;
  level: string;
  lastSeen: string;
  firstSeen: string;
  sample: string | null;
}

interface TimelineBucket {
  time: string;
  total: number;
  important: number;
  debug: number;
}

interface Anomaly {
  time: string;
  metric: string;
  value: number;
  expected: number;
  severity: 'warning' | 'critical';
}

interface PatternsData {
  patterns: Pattern[];
  timeline: TimelineBucket[];
  anomalies: Anomaly[];
  distribution: { total: number; important: number; debug: number };
  analyzedCount: number;
}

type Tab = 'patterns' | 'logs' | 'timeline';

export default function AILogsPage() {
  const [tab, setTab] = useState<Tab>('patterns');
  const [timeRange, setTimeRange] = useState('24h');
  const [level, setLevel] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Data
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPages, setLogsPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  const [patterns, setPatterns] = useState<PatternsData | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/admin/ai-logs', { params: { timeRange, level, search, page, limit: 50 } });
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
      setLogsPages(res.data.pages);
    } catch {
      toast.error('Logs konnten nicht geladen werden');
    } finally {
      setLogsLoading(false);
    }
  }, [timeRange, level, search, page]);

  const loadPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const res = await api.get('/admin/ai-logs/patterns', { params: { timeRange } });
      setPatterns(res.data);
    } catch {
      toast.error('Pattern-Analyse fehlgeschlagen');
    } finally {
      setPatternsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    if (tab === 'logs') loadLogs();
  }, [tab, loadLogs]);

  useEffect(() => {
    if (tab === 'patterns' || tab === 'timeline') loadPatterns();
  }, [tab, loadPatterns]);

  const levelColor = (lvl: string) => {
    switch (lvl) {
      case 'IMPORTANT': return 'text-destructive bg-destructive/10';
      case 'DEBUG': return 'text-app-muted bg-app-bg';
      default: return 'text-app-muted bg-app-bg';
    }
  };

  const levelIcon = (lvl: string) => {
    switch (lvl) {
      case 'IMPORTANT': return <Bug className="w-3.5 h-3.5" />;
      default: return <Info className="w-3.5 h-3.5" />;
    }
  };

  return (
    <PageTransition className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-fg">Intelligente Logs</h1>
            <p className="text-sm text-app-muted">KI-gestützte Mustererkennung, Anomalie-Erkennung & Log-Analyse</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => { if (tab === 'logs') loadLogs(); else loadPatterns(); }}>
          <RefreshCw className="w-4 h-4 mr-1" /> Aktualisieren
        </Button>
      </div>

      {/* Tabs + Filters */}
      <div className="rounded-2xl border border-app-border bg-app-card p-4 space-y-4">
        <div className="flex gap-1 bg-app-bg rounded-xl p-1">
          {([['patterns', 'Muster & Anomalien'], ['timeline', 'Timeline'], ['logs', 'Alle Logs']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-app-accent text-white shadow-sm' : 'text-app-muted hover:text-app-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1.5">
            {['1h', '6h', '24h', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => { setTimeRange(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${timeRange === r ? 'bg-app-accent/10 text-app-accent border border-app-accent/30' : 'bg-app-bg border border-app-border text-app-muted hover:text-app-fg'}`}
              >
                {r}
              </button>
            ))}
          </div>
          {tab === 'logs' && (
            <>
              <select
                value={level}
                onChange={(e) => { setLevel(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-lg border border-app-border bg-app-bg text-app-fg text-xs"
              >
                <option value="ALL">Alle Level</option>
                <option value="IMPORTANT">Fehler</option>
                <option value="DEBUG">Debug</option>
              </select>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-muted" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Suche in Typ/Message..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-app-border bg-app-bg text-app-fg text-xs"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Patterns & Anomalies Tab */}
      {tab === 'patterns' && (
        patternsLoading ? (
          <Loading />
        ) : patterns ? (
          <div className="space-y-6">
            {/* Distribution Cards */}
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Gesamt" value={patterns.distribution.total} icon={<BarChart3 className="w-4 h-4" />} color="text-app-fg" />
              <StatCard label="Fehler" value={patterns.distribution.important} icon={<Bug className="w-4 h-4" />} color="text-destructive" />
              <StatCard label="Debug" value={patterns.distribution.debug} icon={<Info className="w-4 h-4" />} color="text-app-muted" />
            </div>

            {/* Anomalies */}
            {patterns.anomalies.length > 0 && (
              <div className="rounded-2xl border border-yellow-500/30 bg-warning/5 p-5 space-y-3">
                <h3 className="font-semibold text-app-fg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-warning" />
                  Anomalien erkannt ({patterns.anomalies.length})
                </h3>
                {patterns.anomalies.map((a, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${a.severity === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-yellow-500/20 bg-warning/5'}`}>
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${a.severity === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{a.metric}</span> Spike um{' '}
                      <span className="font-mono text-xs">{new Date(a.time).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>:
                      <span className="font-bold ml-1">{a.value}</span> (erwartet: ~{a.expected})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Patterns */}
            <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-3">
              <h3 className="font-semibold text-app-fg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-app-accent" />
                Häufigste Log-Muster ({patterns.patterns.length})
              </h3>
              {patterns.patterns.slice(0, 20).map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-app-bg border border-app-border">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${levelColor(p.level)}`}>
                    {levelIcon(p.level)}
                    {p.count}x
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm text-app-fg truncate">{p.type}</div>
                    {p.sample && <div className="text-xs text-app-muted truncate mt-0.5">{p.sample}</div>}
                  </div>
                  <div className="text-xs text-app-muted shrink-0">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(p.lastSeen).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              ))}
              {patterns.patterns.length === 0 && (
                <p className="text-sm text-app-muted text-center py-4">Keine Logs im gewählten Zeitraum</p>
              )}
            </div>
          </div>
        ) : null
      )}

      {/* Timeline Tab */}
      {tab === 'timeline' && (
        patternsLoading ? (
          <Loading />
        ) : patterns && patterns.timeline.length > 0 ? (
          <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
            <h3 className="font-semibold text-app-fg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-app-accent" />
              Log-Aktivität pro Stunde
            </h3>
            <div className="space-y-1">
              {patterns.timeline.map((b, i) => {
                const max = Math.max(...patterns.timeline.map(t => t.total), 1);
                const pct = (b.total / max) * 100;
                const isAnomaly = patterns.anomalies.some(a => a.time === b.time);
                return (
                  <div key={i} className="flex items-center gap-3 group">
                    <span className="text-xs text-app-muted font-mono w-28 shrink-0">
                      {new Date(b.time).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 h-6 bg-app-bg rounded-lg overflow-hidden relative">
                      {b.important > 0 && (
                        <div
                          className="absolute inset-y-0 left-0 bg-destructive/30 rounded-lg"
                          style={{ width: `${(b.important / max) * 100}%` }}
                        />
                      )}
                      <div
                        className={`absolute inset-y-0 left-0 rounded-lg transition-all ${isAnomaly ? 'bg-warning/60' : 'bg-app-accent/30'}`}
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-app-fg">
                        {b.total > 0 && `${b.total}`}
                        {isAnomaly && <Zap className="w-3 h-3 text-warning ml-1" />}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs shrink-0 w-32">
                      {b.important > 0 && <span className="text-destructive">{b.important} err</span>}
                      {b.debug > 0 && <span className="text-app-muted">{b.debug} dbg</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 text-xs text-app-muted pt-2 border-t border-app-border">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-app-accent/30" /> Gesamt</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/30" /> Fehler</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-warning" /> Anomalie</span>
            </div>
          </div>
        ) : (
          <EmptyState />
        )
      )}

      {/* Logs Tab */}
      {tab === 'logs' && (
        logsLoading ? (
          <Loading />
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-app-muted">{logsTotal} Logs gefunden • Seite {page}/{logsPages}</div>

            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-app-border bg-app-card hover:border-app-accent/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${levelColor(log.level)}`}>
                      {levelIcon(log.level)}
                      {log.level === 'IMPORTANT' ? 'ERR' : log.level === 'ANALYTICS' ? 'ANA' : 'DBG'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm text-app-fg">{log.type}</span>
                      {log.message && <span className="text-xs text-app-muted ml-2 truncate">{log.message.slice(0, 80)}</span>}
                    </div>
                    <span className="text-xs text-app-muted shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  {expandedLog === log.id && (
                    <div className="border-t border-app-border p-3 bg-app-bg/50 space-y-2">
                      {log.message && (
                        <div>
                          <span className="text-xs font-medium text-app-muted">Message:</span>
                          <p className="text-sm text-app-fg mt-0.5 whitespace-pre-wrap">{log.message}</p>
                        </div>
                      )}
                      {log.data && (
                        <div>
                          <span className="text-xs font-medium text-app-muted">Data:</span>
                          <pre className="text-xs text-app-fg mt-0.5 bg-app-bg p-2 rounded-lg overflow-x-auto max-h-48">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {logs.length === 0 && <EmptyState />}
            </div>

            {/* Pagination */}
            {logsPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-app-muted">Seite {page} von {logsPages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(logsPages, p + 1))} disabled={page === logsPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </PageTransition>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-app-border bg-app-card p-4 text-center">
      <div className={`flex items-center justify-center gap-1.5 ${color} mb-1`}>{icon}<span className="text-2xl font-bold">{value.toLocaleString()}</span></div>
      <div className="text-xs text-app-muted">{label}</div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-8 text-center">
      <Sparkles className="w-10 h-10 text-app-accent mx-auto mb-3 opacity-40" />
      <p className="text-sm text-app-muted">Keine Logs im gewählten Zeitraum</p>
    </div>
  );
}
