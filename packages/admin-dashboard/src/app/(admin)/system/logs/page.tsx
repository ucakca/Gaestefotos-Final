'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  Download,
  Loader2,
  Info,
  AlertTriangle,
  XCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  BarChart3,
  X,
  Eye,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LogEntry {
  id: string;
  level: 'IMPORTANT' | 'DEBUG';
  type: string;
  message: string | null;
  data: any;
  userId: string | null;
  userRole: string | null;
  eventId: string | null;
  path: string | null;
  method: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: string;
}

interface LogStats {
  total: number;
  today: number;
  thisWeek: number;
  byLevel: { important: number; debug: number };
  topTypes: Array<{ type: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  recentErrors: Array<{ id: string; type: string; message: string | null; createdAt: string }>;
}

interface LogType {
  type: string;
  count: number;
}

const LevelIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'IMPORTANT':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'DEBUG':
      return <Info className="w-4 h-4 text-blue-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-500" />;
  }
};

const MethodBadge = ({ method }: { method: string | null }) => {
  if (!method) return null;
  const colors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400',
    POST: 'bg-blue-500/20 text-blue-400',
    PUT: 'bg-yellow-500/20 text-yellow-400',
    DELETE: 'bg-red-500/20 text-red-400',
    PATCH: 'bg-purple-500/20 text-purple-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono ${colors[method] || 'bg-gray-500/20 text-gray-400'}`}>
      {method}
    </span>
  );
};

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [types, setTypes] = useState<LogType[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [eventIdFilter, setEventIdFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit, offset };
      if (levelFilter !== 'all') params.level = levelFilter;
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (methodFilter !== 'all') params.method = methodFilter;
      if (eventIdFilter) params.eventId = eventIdFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get<{ logs: LogEntry[]; total: number }>('/admin/logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search, typeFilter, methodFilter, eventIdFilter, startDate, endDate, offset]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: LogStats }>('/admin/logs/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadTypes = useCallback(async () => {
    try {
      const res = await api.get<{ types: LogType[] }>('/admin/logs/types');
      setTypes(res.data.types || []);
    } catch (err) {
      console.error('Failed to load types:', err);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
    loadTypes();
  }, [loadStats, loadTypes]);

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Level', 'Type', 'Message', 'Path', 'Method', 'EventId', 'UserId'].join(','),
      ...logs.map((log) =>
        [
          log.createdAt,
          log.level,
          log.type,
          `"${(log.message || '').replace(/"/g, '""')}"`,
          log.path || '',
          log.method || '',
          log.eventId || '',
          log.userId || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setLevelFilter('all');
    setTypeFilter('');
    setMethodFilter('all');
    setEventIdFilter('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const hasActiveFilters = search || levelFilter !== 'all' || typeFilter || methodFilter !== 'all' || eventIdFilter || startDate || endDate;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <FileText className="w-6 h-6 text-app-accent" />
            System Logs
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {total.toLocaleString('de-DE')} Einträge gesamt
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowStats(!showStats)}>
            <BarChart3 className="w-4 h-4 mr-1" />
            {showStats ? 'Stats ausblenden' : 'Stats einblenden'}
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => { loadLogs(); loadStats(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="text-2xl font-bold text-app-fg">{stats.total.toLocaleString('de-DE')}</div>
            <div className="text-sm text-app-muted">Gesamt</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="text-2xl font-bold text-app-fg">{stats.today.toLocaleString('de-DE')}</div>
            <div className="text-sm text-app-muted">Heute</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="text-2xl font-bold text-yellow-500">{stats.byLevel.important.toLocaleString('de-DE')}</div>
            <div className="text-sm text-app-muted">Important</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-4">
            <div className="text-2xl font-bold text-blue-500">{stats.byLevel.debug.toLocaleString('de-DE')}</div>
            <div className="text-sm text-app-muted">Debug</div>
          </div>
        </div>
      )}

      {/* Quick Search & Level Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input
            placeholder="Logs durchsuchen (Typ, Nachricht, Pfad)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'IMPORTANT', 'DEBUG'].map((level) => (
            <button
              key={level}
              onClick={() => { setLevelFilter(level); setOffset(0); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                levelFilter === level
                  ? 'bg-app-accent text-white'
                  : 'bg-app-card border border-app-border text-app-muted hover:text-app-fg'
              }`}
            >
              {level === 'all' ? 'Alle' : level}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              showFilters || hasActiveFilters
                ? 'bg-app-accent text-white'
                : 'bg-app-card border border-app-border text-app-muted hover:text-app-fg'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="rounded-xl border border-app-border bg-app-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-app-fg">Erweiterte Filter</h3>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Filter zurücksetzen
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-app-muted mb-1">Typ</label>
              <select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
                className="w-full px-3 py-2 rounded-lg bg-app-bg border border-app-border text-app-fg"
              >
                <option value="">Alle Typen</option>
                {types.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.type} ({t.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-app-muted mb-1">HTTP Methode</label>
              <select
                value={methodFilter}
                onChange={(e) => { setMethodFilter(e.target.value); setOffset(0); }}
                className="w-full px-3 py-2 rounded-lg bg-app-bg border border-app-border text-app-fg"
              >
                <option value="all">Alle</option>
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-app-muted mb-1">Event ID</label>
              <Input
                placeholder="Event ID eingeben..."
                value={eventIdFilter}
                onChange={(e) => { setEventIdFilter(e.target.value); setOffset(0); }}
              />
            </div>
            <div>
              <label className="block text-sm text-app-muted mb-1">Von Datum</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
              />
            </div>
            <div>
              <label className="block text-sm text-app-muted mb-1">Bis Datum</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine Logs gefunden
          </div>
        ) : (
          <>
            <div className="divide-y divide-app-border max-h-[600px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 hover:bg-app-bg/50 transition-colors cursor-pointer ${
                    log.level === 'IMPORTANT' ? 'border-l-2 border-l-yellow-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <LevelIcon level={log.level} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 bg-app-bg rounded text-app-muted">
                          {log.type}
                        </span>
                        <MethodBadge method={log.method} />
                        {log.path && (
                          <span className="text-xs text-app-muted font-mono truncate max-w-[200px]">
                            {log.path}
                          </span>
                        )}
                      </div>
                      {log.message && (
                        <p className="text-sm text-app-fg mt-1 break-words line-clamp-2">{log.message}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-app-muted">
                        <span>{new Date(log.createdAt).toLocaleString('de-DE')}</span>
                        {log.eventId && <span>Event: {log.eventId.slice(0, 8)}...</span>}
                        {log.userId && <span>User: {log.userId.slice(0, 8)}...</span>}
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-app-muted" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-app-bg border-t border-app-border">
              <div className="text-sm text-app-muted">
                Zeige {offset + 1}-{Math.min(offset + logs.length, total)} von {total}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Zurück
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + logs.length >= total}
                >
                  Weiter
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-app-card border border-app-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-app-border">
              <h3 className="font-semibold text-app-fg">Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-app-muted hover:text-app-fg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)] space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-app-muted">Level:</span>
                  <span className="ml-2 text-app-fg">{selectedLog.level}</span>
                </div>
                <div>
                  <span className="text-app-muted">Typ:</span>
                  <span className="ml-2 text-app-fg font-mono">{selectedLog.type}</span>
                </div>
                <div>
                  <span className="text-app-muted">Zeit:</span>
                  <span className="ml-2 text-app-fg">{new Date(selectedLog.createdAt).toLocaleString('de-DE')}</span>
                </div>
                <div>
                  <span className="text-app-muted">Methode:</span>
                  <span className="ml-2"><MethodBadge method={selectedLog.method} /></span>
                </div>
                {selectedLog.path && (
                  <div className="col-span-2">
                    <span className="text-app-muted">Pfad:</span>
                    <span className="ml-2 text-app-fg font-mono text-xs break-all">{selectedLog.path}</span>
                  </div>
                )}
                {selectedLog.eventId && (
                  <div>
                    <span className="text-app-muted">Event ID:</span>
                    <span className="ml-2 text-app-fg font-mono text-xs">{selectedLog.eventId}</span>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <span className="text-app-muted">User ID:</span>
                    <span className="ml-2 text-app-fg font-mono text-xs">{selectedLog.userId}</span>
                  </div>
                )}
                {selectedLog.userRole && (
                  <div>
                    <span className="text-app-muted">User Role:</span>
                    <span className="ml-2 text-app-fg">{selectedLog.userRole}</span>
                  </div>
                )}
              </div>
              {selectedLog.message && (
                <div>
                  <div className="text-sm text-app-muted mb-1">Nachricht:</div>
                  <p className="text-app-fg bg-app-bg p-3 rounded-lg text-sm">{selectedLog.message}</p>
                </div>
              )}
              {selectedLog.data && (
                <div>
                  <div className="text-sm text-app-muted mb-1">Daten:</div>
                  <pre className="text-app-fg bg-app-bg p-3 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.userAgent && (
                <div>
                  <div className="text-sm text-app-muted mb-1">User Agent:</div>
                  <p className="text-app-fg bg-app-bg p-3 rounded-lg text-xs font-mono break-all">{selectedLog.userAgent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
