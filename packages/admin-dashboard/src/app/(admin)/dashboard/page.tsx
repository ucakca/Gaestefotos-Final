'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Server,
  Clock,
  Cpu,
  HardDrive,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
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

type StatsResponse = {
  ok: boolean;
  stats: {
    total: {
      users: number;
      events: number;
      photos: number;
      videos: number;
      activeEvents: number;
    };
    today: {
      users: number;
      events: number;
      photos: number;
    };
    growth: {
      eventsThisMonth: number;
      eventsLastMonth: number;
      eventsGrowth: string;
      photosThisMonth: number;
      photosLastMonth: number;
      photosGrowth: string;
    };
    storage: {
      photosBytes: number;
      videosBytes: number;
      totalBytes: number;
    };
  };
  recent: {
    events: Array<{ id: string; title: string; slug: string; dateTime: string; isActive: boolean; createdAt: string }>;
    users: Array<{ id: string; email: string; name: string | null; role: string; createdAt: string }>;
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

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  action?: { label: string; href: string };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackend] = useState<BackendVersionResponse | null>(null);
  const [server, setServer] = useState<OpsServerResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

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

      // Try to load stats
      try {
        const statsRes = await api.get<StatsResponse>('/admin/dashboard/stats');
        setStats(statsRes.data);
      } catch {
        // Stats endpoint might not exist yet
      }

      // Generate alerts based on data
      const newAlerts: Alert[] = [];
      
      if (serverRes.data.diskRoot && serverRes.data.diskRoot.usedPercent > 80) {
        newAlerts.push({
          id: 'disk-warning',
          type: serverRes.data.diskRoot.usedPercent > 90 ? 'error' : 'warning',
          title: `Festplatte ${serverRes.data.diskRoot.usedPercent}% voll`,
          description: `Nur noch ${fmtBytes(serverRes.data.diskRoot.availableBytes)} verfügbar`,
          action: { label: 'Cleanup starten', href: '/system/health' },
        });
      }

      const memPercent = serverRes.data.memory.totalBytes 
        ? Math.round(((serverRes.data.memory.totalBytes - serverRes.data.memory.freeBytes) / serverRes.data.memory.totalBytes) * 100)
        : 0;
      
      if (memPercent > 85) {
        newAlerts.push({
          id: 'memory-warning',
          type: 'warning',
          title: `RAM-Auslastung ${memPercent}%`,
          description: 'Hohe Speicherauslastung erkannt',
          action: { label: 'Details', href: '/system/health' },
        });
      }

      setAlerts(newAlerts);
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
          <h1 className="text-2xl font-bold tracking-tight text-app-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-app-muted">Willkommen zurück! Hier ist dein Systemüberblick.</p>
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-4 ${
                alert.type === 'error'
                  ? 'border-red-500/30 bg-red-500/5'
                  : alert.type === 'warning'
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-blue-500/30 bg-blue-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'error'
                        ? 'bg-red-500/10'
                        : alert.type === 'warning'
                        ? 'bg-yellow-500/10'
                        : 'bg-blue-500/10'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        alert.type === 'error'
                          ? 'text-red-500'
                          : alert.type === 'warning'
                          ? 'text-yellow-500'
                          : 'text-blue-500'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-app-fg">{alert.title}</p>
                    <p className="text-xs text-app-muted mt-0.5">{alert.description}</p>
                  </div>
                </div>
                {alert.action && (
                  <Link href={alert.action.href}>
                    <Button size="sm" variant="outline" className="text-xs">
                      {alert.action.label}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
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

      {/* Quick Actions */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5">
        <h2 className="text-sm font-semibold text-app-fg mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-app-accent" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/manage/users">
            <div className="p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:bg-app-accent/5 transition-all cursor-pointer group">
              <Users className="w-5 h-5 text-app-muted group-hover:text-app-accent mb-2" />
              <p className="text-sm font-medium">Benutzer</p>
            </div>
          </Link>
          <Link href="/manage/events">
            <div className="p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:bg-app-accent/5 transition-all cursor-pointer group">
              <Calendar className="w-5 h-5 text-app-muted group-hover:text-app-accent mb-2" />
              <p className="text-sm font-medium">Events</p>
            </div>
          </Link>
          <Link href="/design/theme">
            <div className="p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:bg-app-accent/5 transition-all cursor-pointer group">
              <ImageIcon className="w-5 h-5 text-app-muted group-hover:text-app-accent mb-2" />
              <p className="text-sm font-medium">Theme</p>
            </div>
          </Link>
          <Link href="/system/health">
            <div className="p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:bg-app-accent/5 transition-all cursor-pointer group">
              <Server className="w-5 h-5 text-app-muted group-hover:text-app-accent mb-2" />
              <p className="text-sm font-medium">System</p>
            </div>
          </Link>
        </div>
      </div>

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
                className={`h-full rounded-full transition-all ${
                  memUsed.percent > 80 ? 'bg-red-500' : memUsed.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${memUsed.percent}%` }}
              />
            </div>
          )}
        </div>

        {/* Disk */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 hover:border-app-accent/30 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-sm font-medium text-app-muted">Festplatte</div>
          </div>
          <div className="text-2xl font-bold text-app-fg">{disk ? `${disk.usedPercent}%` : '—'}</div>
          <div className="mt-1 text-xs text-app-muted">
            {disk ? `${fmtBytes(disk.availableBytes)} frei` : '—'}
          </div>
          {disk && (
            <div className="mt-2 h-1.5 rounded-full bg-app-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  disk.usedPercent > 90 ? 'bg-red-500' : disk.usedPercent > 75 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${disk.usedPercent}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Secondary Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-app-border bg-app-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="text-sm font-medium text-app-muted">Benutzer</div>
            </div>
            <div className="text-3xl font-bold text-app-fg">{stats.stats?.total?.users?.toLocaleString('de-DE') ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-pink-500" />
              </div>
              <div className="text-sm font-medium text-app-muted">Events</div>
            </div>
            <div className="text-3xl font-bold text-app-fg">{stats.stats?.total?.events?.toLocaleString('de-DE') ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-app-border bg-app-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="text-sm font-medium text-app-muted">Fotos</div>
            </div>
            <div className="text-3xl font-bold text-app-fg">{stats.stats?.total?.photos?.toLocaleString('de-DE') ?? '—'}</div>
          </div>
        </div>
      )}

      {/* Last Update */}
      <div className="text-center text-xs text-app-muted py-4">
        Letzte Aktualisierung: {server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString('de-DE') : '—'}
        {' • '}Auto-Refresh alle 30 Sekunden
      </div>
    </div>
  );
}
