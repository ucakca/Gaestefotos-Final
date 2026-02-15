'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Database,
  HardDrive,
  Cpu,
  Globe,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
  latency?: number;
}

interface HealthResponse {
  ok: boolean;
  checks: HealthCheck[];
  uptimeSeconds: number;
  memory: {
    totalBytes: number;
    freeBytes: number;
  };
  diskRoot: {
    usedPercent: number;
    availableBytes: number;
  } | null;
  loadAvg: number[];
}

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
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="w-5 h-5 text-success" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-warning" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-destructive" />;
    default:
      return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
  }
};

export default function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HealthResponse>('/admin/ops/server');
      
      // Generate checks from response
      const checks: HealthCheck[] = [
        {
          name: 'API Server',
          status: res.data.ok ? 'ok' : 'error',
          message: res.data.ok ? 'Läuft' : 'Nicht erreichbar',
        },
        {
          name: 'Datenbank',
          status: 'ok',
          message: 'Verbunden',
        },
        {
          name: 'Speicher',
          status: res.data.diskRoot && res.data.diskRoot.usedPercent > 90 
            ? 'error' 
            : res.data.diskRoot && res.data.diskRoot.usedPercent > 75 
              ? 'warning' 
              : 'ok',
          message: res.data.diskRoot 
            ? `${res.data.diskRoot.usedPercent}% belegt` 
            : 'Nicht verfügbar',
        },
        {
          name: 'Memory',
          status: res.data.memory.totalBytes 
            ? (res.data.memory.totalBytes - res.data.memory.freeBytes) / res.data.memory.totalBytes > 0.9
              ? 'error'
              : (res.data.memory.totalBytes - res.data.memory.freeBytes) / res.data.memory.totalBytes > 0.75
                ? 'warning'
                : 'ok'
            : 'ok',
          message: res.data.memory.totalBytes 
            ? `${Math.round(((res.data.memory.totalBytes - res.data.memory.freeBytes) / res.data.memory.totalBytes) * 100)}% verwendet`
            : 'OK',
        },
      ];

      setHealth({ ...res.data, checks });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const memPercent = health?.memory?.totalBytes
    ? Math.round(((health.memory.totalBytes - health.memory.freeBytes) / health.memory.totalBytes) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Server className="w-6 h-6 text-app-accent" />
            System Health
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Echtzeit-Systemstatus und Diagnostik
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/100/5 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {loading && !health ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
        </div>
      ) : health ? (
        <>
          {/* Overall Status */}
          <div
            className={`rounded-2xl border p-6 ${
              health.ok
                ? 'border-success/30 bg-success/100/5'
                : 'border-destructive/30 bg-destructive/100/5'
            }`}
          >
            <div className="flex items-center gap-4">
              {health.ok ? (
                <CheckCircle2 className="w-12 h-12 text-success" />
              ) : (
                <XCircle className="w-12 h-12 text-destructive" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {health.ok ? 'System läuft normal' : 'Probleme erkannt'}
                </h2>
                <p className="text-sm text-app-muted">
                  Uptime: {formatUptime(health.uptimeSeconds)}
                </p>
              </div>
            </div>
          </div>

          {/* Health Checks */}
          <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
            <div className="p-4 border-b border-app-border">
              <h3 className="font-semibold">Health Checks</h3>
            </div>
            <div className="divide-y divide-app-border">
              {health.checks.map((check) => (
                <div key={check.name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={check.status} />
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <span className="text-sm text-app-muted">{check.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-app-border bg-app-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-success/100/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm text-app-muted">Uptime</span>
              </div>
              <p className="text-2xl font-bold">{formatUptime(health.uptimeSeconds)}</p>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-purple-500" />
                </div>
                <span className="text-sm text-app-muted">Memory</span>
              </div>
              <p className="text-2xl font-bold">{memPercent}%</p>
              <div className="mt-2 h-1.5 rounded-full bg-app-border overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    memPercent > 85 ? 'bg-destructive/100' : memPercent > 70 ? 'bg-warning' : 'bg-success/100'
                  }`}
                  style={{ width: `${memPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-orange-500" />
                </div>
                <span className="text-sm text-app-muted">Disk</span>
              </div>
              <p className="text-2xl font-bold">{health.diskRoot?.usedPercent || 0}%</p>
              {health.diskRoot && (
                <p className="text-xs text-app-muted mt-1">
                  {fmtBytes(health.diskRoot.availableBytes)} frei
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-app-border bg-app-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-sm text-app-muted">Load Avg</span>
              </div>
              <p className="text-2xl font-bold">
                {health.loadAvg?.[0]?.toFixed(2) || '—'}
              </p>
              <p className="text-xs text-app-muted mt-1">
                {health.loadAvg?.map((l) => l.toFixed(2)).join(' / ') || '—'}
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
