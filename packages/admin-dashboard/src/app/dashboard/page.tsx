'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Server, Clock, Cpu, HardDrive, Activity, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

type BackendVersionResponse = {
  service: string;
  version: string;
  nodeEnv: string;
  startedAt: string;
};

type OpsServerResponse = {
  ok: boolean;
  checkedAt: string;
  nodeEnv: string;
  startedAt: string;
  uptimeSeconds: number;
  loadAvg: number[];
  memory: {
    totalBytes: number;
    freeBytes: number;
  };
  diskRoot: null | {
    filesystem?: string;
    sizeBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
    mount: string;
  };
};

const fmtBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = value;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<BackendVersionResponse | null>(null);
  const [server, setServer] = useState<OpsServerResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [backendRes, serverRes] = await Promise.all([
        api.get<BackendVersionResponse>('/version'),
        api.get<OpsServerResponse>('/admin/ops/server'),
      ]);
      setBackend(backendRes.data);
      setServer(serverRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const memUsed = useMemo(() => {
    if (!server?.memory?.totalBytes) return null;
    const used = server.memory.totalBytes - (server.memory.freeBytes || 0);
    return {
      used,
      total: server.memory.totalBytes,
      percent: server.memory.totalBytes ? Math.round((used / server.memory.totalBytes) * 100) : 0,
    };
  }, [server]);

  const disk = server?.diskRoot;
  const isHealthy = server?.ok && backend?.version;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg">System Dashboard</h1>
          <p className="mt-1 text-sm text-app-muted">Echtzeit-Überwachung und Systemstatus</p>
        </div>
        <div className="flex items-center gap-3">
          {isHealthy ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">System OK</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">Fehler</span>
            </div>
          ) : null}
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Lädt…' : 'Aktualisieren'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-app-fg">Verbindungsfehler</p>
              <p className="text-xs text-app-muted mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Backend Version */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 hover:border-app-accent/30 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Server className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-sm font-medium text-app-muted">Backend</div>
          </div>
          <div className="text-2xl font-bold text-app-fg">{backend?.version || '—'}</div>
          <div className="mt-1 text-xs text-app-muted">Env: {backend?.nodeEnv || '—'}</div>
        </div>

        {/* Uptime */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 hover:border-app-accent/30 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-sm font-medium text-app-muted">Uptime</div>
          </div>
          <div className="text-2xl font-bold text-app-fg">
            {server?.uptimeSeconds ? formatUptime(server.uptimeSeconds) : '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">
            Start: {server?.startedAt ? new Date(server.startedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
          </div>
        </div>

        {/* Load Average */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 hover:border-app-accent/30 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-sm font-medium text-app-muted">Load Avg</div>
          </div>
          <div className="text-2xl font-bold text-app-fg">
            {server?.loadAvg?.[0]?.toFixed(2) || '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">
            {server?.loadAvg?.length ? `${server.loadAvg[0].toFixed(2)} / ${server.loadAvg[1].toFixed(2)} / ${server.loadAvg[2].toFixed(2)}` : '1m / 5m / 15m'}
          </div>
        </div>

        {/* Memory */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 hover:border-app-accent/30 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-sm font-medium text-app-muted">Memory</div>
          </div>
          <div className="text-2xl font-bold text-app-fg">{memUsed ? `${memUsed.percent}%` : '—'}</div>
          <div className="mt-1 text-xs text-app-muted">
            {memUsed ? `${fmtBytes(memUsed.used)} / ${fmtBytes(memUsed.total)}` : '—'}
          </div>
          {memUsed && (
            <div className="mt-2 h-1.5 rounded-full bg-app-border overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${memUsed.percent > 80 ? 'bg-red-500' : memUsed.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${memUsed.percent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Disk */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-app-fg">Festplatte</div>
              <div className="text-xs text-app-muted">Mount: {disk?.mount || '/'}</div>
            </div>
          </div>
          <div className="flex items-end justify-between mb-2">
            <div className="text-3xl font-bold text-app-fg">{disk ? `${disk.usedPercent}%` : '—'}</div>
            <div className="text-sm text-app-muted">
              {disk ? `${fmtBytes(disk.usedBytes)} / ${fmtBytes(disk.sizeBytes)}` : '—'}
            </div>
          </div>
          {disk && (
            <div className="h-2 rounded-full bg-app-border overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${disk.usedPercent > 90 ? 'bg-red-500' : disk.usedPercent > 75 ? 'bg-yellow-500' : 'bg-orange-500'}`}
                style={{ width: `${disk.usedPercent}%` }}
              />
            </div>
          )}
          {disk && (
            <div className="mt-3 text-xs text-app-muted">
              {fmtBytes(disk.availableBytes)} verfügbar
            </div>
          )}
        </div>

        {/* Last Update Info */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <div className="text-sm font-medium text-app-fg">Letzte Aktualisierung</div>
              <div className="text-xs text-app-muted">Auto-Refresh: 30 Sekunden</div>
            </div>
          </div>
          <div className="text-3xl font-bold text-app-fg">
            {server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString('de-DE') : '—'}
          </div>
          <div className="mt-3 p-3 rounded-xl bg-app-bg text-xs text-app-muted">
            💡 Tipp: Wenn Menüs oder Routen fehlen, ist das Deploy veraltet. Nutze „Neu laden (Cache)" in der Sidebar.
          </div>
        </div>
      </div>
    </div>
  );
}

