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
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/PageTransition';
import { SkeletonCard, SkeletonStats } from '@/components/ui/Skeleton';

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
    <PageTransition className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg">Dashboard</h1>
          <p className="mt-1 text-sm text-app-muted">Willkommen zurück! Hier ist dein Systemüberblick.</p>
        </div>
        <div className="flex items-center gap-3">
          {isHealthy ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/100/10 border border-success/20">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">System OK</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/100/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Fehler</span>
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
                  ? 'border-destructive/30 bg-destructive/100/5'
                  : alert.type === 'warning'
                  ? 'border-yellow-500/30 bg-warning/5'
                  : 'border-blue-500/30 bg-blue-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'error'
                        ? 'bg-destructive/100/10'
                        : alert.type === 'warning'
                        ? 'bg-warning/10'
                        : 'bg-blue-500/10'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        alert.type === 'error'
                          ? 'text-destructive'
                          : alert.type === 'warning'
                          ? 'text-warning'
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
        <div className="rounded-2xl border border-destructive/30 bg-destructive/100/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/100/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-sm text-app-fg">Verbindungsfehler</p>
              <p className="text-xs text-app-muted mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <ModernCard variant="default" className="p-5">
        <h2 className="text-sm font-semibold text-app-fg mb-4 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-app-accent to-purple-500 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/manage/users">
            <div className="group p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm shadow-indigo-500/20">
                <Users className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-app-fg">Benutzer</p>
            </div>
          </Link>
          <Link href="/manage/events">
            <div className="group p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm shadow-pink-500/20">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-app-fg">Events</p>
            </div>
          </Link>
          <Link href="/design/theme">
            <div className="group p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm shadow-cyan-500/20">
                <ImageIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-app-fg">Theme</p>
            </div>
          </Link>
          <Link href="/system/health">
            <div className="group p-4 rounded-xl border border-app-border hover:border-app-accent/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm shadow-amber-500/20">
                <Server className="w-4 h-4 text-white" />
              </div>
              <p className="text-sm font-medium text-app-fg">System</p>
            </div>
          </Link>
        </div>
      </ModernCard>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <ModernCard variant="default" hover className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm shadow-blue-500/20">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs font-semibold text-app-muted uppercase tracking-wider">Backend</div>
            </div>
            <div className="text-2xl font-bold text-app-fg">{backend?.version || '—'}</div>
            <div className="mt-1 text-xs text-app-muted">Env: {backend?.nodeEnv || '—'}</div>
          </ModernCard>
        </StaggerItem>

        <StaggerItem>
          <ModernCard variant="default" hover className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs font-semibold text-app-muted uppercase tracking-wider">Uptime</div>
            </div>
            <div className="text-2xl font-bold text-app-fg">
              {server?.uptimeSeconds ? formatUptime(server.uptimeSeconds) : '—'}
            </div>
            <div className="mt-1 text-xs text-app-muted">
              Start: {server?.startedAt ? new Date(server.startedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
            </div>
          </ModernCard>
        </StaggerItem>

        <StaggerItem>
          <ModernCard variant="default" hover className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-sm shadow-purple-500/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs font-semibold text-app-muted uppercase tracking-wider">Memory</div>
            </div>
            <div className="text-2xl font-bold text-app-fg">{memUsed ? `${memUsed.percent}%` : '—'}</div>
            <div className="mt-1 text-xs text-app-muted">
              {memUsed ? `${fmtBytes(memUsed.used)} / ${fmtBytes(memUsed.total)}` : '—'}
            </div>
            {memUsed && (
              <div className="mt-2 h-2 rounded-full bg-app-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    memUsed.percent > 80 ? 'bg-gradient-to-r from-destructive to-red-400' : memUsed.percent > 60 ? 'bg-gradient-to-r from-warning to-amber-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  }`}
                  style={{ width: `${memUsed.percent}%` }}
                />
              </div>
            )}
          </ModernCard>
        </StaggerItem>

        <StaggerItem>
          <ModernCard variant="default" hover className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm shadow-amber-500/20">
                <HardDrive className="w-5 h-5 text-white" />
              </div>
              <div className="text-xs font-semibold text-app-muted uppercase tracking-wider">Festplatte</div>
            </div>
            <div className="text-2xl font-bold text-app-fg">{disk ? `${disk.usedPercent}%` : '—'}</div>
            <div className="mt-1 text-xs text-app-muted">
              {disk ? `${fmtBytes(disk.availableBytes)} frei` : '—'}
            </div>
            {disk && (
              <div className="mt-2 h-2 rounded-full bg-app-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    disk.usedPercent > 90 ? 'bg-gradient-to-r from-destructive to-red-400' : disk.usedPercent > 75 ? 'bg-gradient-to-r from-warning to-amber-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
                  }`}
                  style={{ width: `${disk.usedPercent}%` }}
                />
              </div>
            )}
          </ModernCard>
        </StaggerItem>
      </StaggerContainer>

      {/* App Stats with Growth */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Users} label="Benutzer" value={stats.stats?.total?.users ?? 0} todayValue={stats.stats?.today?.users} color="indigo" />
          <StatCard icon={Calendar} label="Events" value={stats.stats?.total?.events ?? 0} todayValue={stats.stats?.today?.events} growth={stats.stats?.growth?.eventsGrowth} color="pink" />
          <StatCard icon={ImageIcon} label="Fotos" value={stats.stats?.total?.photos ?? 0} todayValue={stats.stats?.today?.photos} growth={stats.stats?.growth?.photosGrowth} color="cyan" />
          <StatCard icon={Activity} label="Aktive Events" value={stats.stats?.total?.activeEvents ?? 0} color="green" />
        </div>
      )}

      {/* Activity Chart + Storage */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Daily Activity Chart */}
          <ModernCard variant="default" className="lg:col-span-2 p-5">
            <h3 className="text-sm font-semibold text-app-fg mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-white" />
              </div>
              Aktivität (30 Tage)
            </h3>
            <ActivityChart />
          </ModernCard>

          {/* Storage */}
          <ModernCard variant="default" className="p-5">
            <h3 className="text-sm font-semibold text-app-fg mb-4 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <HardDrive className="w-3.5 h-3.5 text-white" />
              </div>
              Speicher
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-app-muted mb-1">
                  <span className="font-medium">Fotos</span>
                  <span>{fmtBytes(stats.stats?.storage?.photosBytes ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-app-border overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400" style={{ width: stats.stats?.storage?.totalBytes ? `${Math.min(100, (stats.stats.storage.photosBytes / stats.stats.storage.totalBytes) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-app-muted mb-1">
                  <span className="font-medium">Videos</span>
                  <span>{fmtBytes(stats.stats?.storage?.videosBytes ?? 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-app-border overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400" style={{ width: stats.stats?.storage?.totalBytes ? `${Math.min(100, (stats.stats.storage.videosBytes / stats.stats.storage.totalBytes) * 100)}%` : '0%' }} />
                </div>
              </div>
              <div className="pt-3 border-t border-app-border">
                <div className="text-2xl font-bold text-app-fg">{fmtBytes(stats.stats?.storage?.totalBytes ?? 0)}</div>
                <div className="text-xs text-app-muted">Gesamtspeicher</div>
              </div>
            </div>
          </ModernCard>
        </div>
      )}

      {/* Recent Activity */}
      {stats?.recent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Events */}
          <ModernCard variant="default" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-app-fg flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5 text-white" />
                </div>
                Neueste Events
              </h3>
              <Link href="/manage/events" className="text-xs text-app-accent hover:underline font-medium">Alle →</Link>
            </div>
            <div className="space-y-2">
              {stats.recent.events.map((evt) => (
                <Link key={evt.id} href={`/manage/events/${evt.id}`} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-app-bg transition-colors group">
                  <div>
                    <p className="text-sm font-medium text-app-fg group-hover:text-app-accent transition-colors">{evt.title}</p>
                    <p className="text-xs text-app-muted">/{evt.slug} · {new Date(evt.createdAt).toLocaleDateString('de-DE')}</p>
                  </div>
                  <Badge variant={evt.isActive ? 'success' : 'warning'}>
                    {evt.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </Link>
              ))}
            </div>
          </ModernCard>

          {/* Recent Users */}
          <ModernCard variant="default" className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-app-fg flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-white" />
                </div>
                Neueste Benutzer
              </h3>
              <Link href="/manage/users" className="text-xs text-app-accent hover:underline font-medium">Alle →</Link>
            </div>
            <div className="space-y-2">
              {stats.recent.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-app-bg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-app-accent/20 to-purple-500/10 flex items-center justify-center text-app-accent font-bold text-xs">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-app-fg">{u.name || u.email}</p>
                      <p className="text-xs text-app-muted">{new Date(u.createdAt).toLocaleDateString('de-DE')}</p>
                    </div>
                  </div>
                  <Badge variant={u.role === 'ADMIN' || u.role === 'SUPERADMIN' ? 'error' : u.role === 'PARTNER' ? 'accent' : 'info'}>
                    {u.role}
                  </Badge>
                </div>
              ))}
            </div>
          </ModernCard>
        </div>
      )}

      {/* Last Update */}
      <div className="text-center text-xs text-app-muted py-4">
        Letzte Aktualisierung: {server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString('de-DE') : '—'}
        {' • '}Auto-Refresh alle 30 Sekunden
      </div>
    </PageTransition>
  );
}

function StatCard({ icon: Icon, label, value, todayValue, growth, color }: {
  icon: any; label: string; value: number; todayValue?: number; growth?: string; color: string;
}) {
  const gradientMap: Record<string, string> = {
    indigo: 'from-indigo-500 to-blue-500 shadow-indigo-500/20',
    pink: 'from-pink-500 to-rose-500 shadow-pink-500/20',
    cyan: 'from-cyan-500 to-teal-500 shadow-cyan-500/20',
    green: 'from-emerald-500 to-teal-500 shadow-emerald-500/20',
  };
  const growthNum = growth ? parseFloat(growth) : 0;

  return (
    <div className="group rounded-2xl border border-app-border bg-app-card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientMap[color]} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold text-app-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-app-fg">{value.toLocaleString('de-DE')}</div>
      <div className="flex items-center gap-2 mt-1">
        {todayValue !== undefined && (
          <span className="text-xs text-app-muted">+{todayValue} heute</span>
        )}
        {growth && growthNum !== 0 && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${growthNum > 0 ? 'text-success' : 'text-destructive'}`}>
            {growthNum > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {growthNum > 0 ? '+' : ''}{growth}%
          </span>
        )}
      </div>
    </div>
  );
}

function ActivityChart() {
  const [data, setData] = useState<{ date: string; photos: number; events: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ analytics: { dailyActivity: typeof data } }>('/admin/dashboard/analytics');
        setData(res.data.analytics?.dailyActivity || []);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-app-accent" />
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="text-center text-sm text-app-muted py-8">Keine Aktivitätsdaten</div>;
  }

  const maxPhotos = Math.max(1, ...data.map((d) => d.photos));

  return (
    <div>
      <div className="flex items-end gap-[2px] h-32">
        {data.map((d, i) => {
          const h = (d.photos / maxPhotos) * 100;
          const date = new Date(d.date);
          return (
            <div
              key={i}
              className="flex-1 group relative"
              title={`${date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}: ${d.photos} Fotos, ${d.events} Events`}
            >
              <div
                className="w-full rounded-t bg-cyan-500/70 hover:bg-cyan-500 transition-colors"
                style={{ height: `${Math.max(2, h)}%` }}
              />
              {d.events > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-pink-500 rounded-t" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-app-muted">
        <span>{data.length > 0 ? new Date(data[0].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-cyan-500 inline-block" /> Fotos</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-pink-500 inline-block" /> Events</span>
        </div>
        <span>{data.length > 0 ? new Date(data[data.length - 1].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }) : ''}</span>
      </div>
    </div>
  );
}
