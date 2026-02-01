'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  Download,
  Loader2,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LevelIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

export default function LogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ logs: LogEntry[] }>('/admin/logs', {
        params: { limit: 100, level: levelFilter !== 'all' ? levelFilter : undefined },
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Level', 'Message'].join(','),
      ...filteredLogs.map((log) =>
        [log.timestamp, log.level, `"${log.message.replace(/"/g, '""')}"`].join(',')
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <FileText className="w-6 h-6 text-app-accent" />
            System Logs
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {logs.length} Einträge geladen
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input
            placeholder="Logs durchsuchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'error', 'warn', 'info'].map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                levelFilter === level
                  ? 'bg-app-accent text-white'
                  : 'bg-app-card border border-app-border text-app-muted hover:text-app-fg'
              }`}
            >
              {level === 'all' ? 'Alle' : level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine Logs gefunden
          </div>
        ) : (
          <div className="divide-y divide-app-border max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 hover:bg-app-bg/50 transition-colors ${
                  log.level === 'error'
                    ? 'border-l-2 border-l-red-500'
                    : log.level === 'warn'
                    ? 'border-l-2 border-l-yellow-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <LevelIcon level={log.level} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-app-fg break-words">{log.message}</p>
                    <p className="text-xs text-app-muted mt-1">
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
