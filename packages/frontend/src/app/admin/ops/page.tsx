'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Server, RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle, Cpu, HardDrive, Clock, Database } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

interface ServerHealth {
  status: 'ok' | 'degraded' | 'error';
  uptime: string;
  startedAt: string;
  nodeVersion: string;
  memoryUsedMb: number;
  memoryTotalMb: number;
  memoryPct: number;
  cpuModel?: string;
  cpuCount?: number;
  diskRoot?: { used: number; free: number; total: number; usedPct: number };
  diskStorage?: { used: number; free: number; total: number; usedPct: number };
  redis?: { status: string };
  database?: { status: string };
}

interface AppHealth {
  app: string;
  api: string;
  database: string;
  redis: string;
  storage: string;
  timestamp: string;
}

function fmtBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === 'ok' || status === 'connected' || status === 'healthy' || status === 'up';
  const isDegraded = status === 'degraded' || status === 'slow';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      isOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
      isDegraded ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
      'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
    }`}>
      {isOk ? <CheckCircle2 className="w-3 h-3" /> : isDegraded ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const color = value >= 90 ? 'bg-red-500' : value >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className={`w-full bg-muted rounded-full h-1.5 ${className}`}>
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export default function AdminOpsPage() {
  const [server, setServer] = useState<ServerHealth | null>(null);
  const [health, setHealth] = useState<AppHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [serverRes, healthRes] = await Promise.allSettled([
        api.get('/admin/ops/server'),
        api.get('/admin/ops/health'),
      ]);
      if (serverRes.status === 'fulfilled') setServer(serverRes.value.data);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value.data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" /> Server-Status
                </h1>
                <p className="text-xs text-muted-foreground">
                  {lastRefresh ? `Letzte Aktualisierung: ${lastRefresh.toLocaleTimeString('de-DE')}` : 'Lade...'}
                </p>
              </div>
            </div>
            <button onClick={load} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Health Overview */}
              {health && (
                <div className="bg-card rounded-xl border p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Service-Status</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(health)
                      .filter(([k]) => !['timestamp', 'app'].includes(k))
                      .map(([key, val]) => (
                        <div key={key} className="flex flex-col gap-1">
                          <div className="text-xs text-muted-foreground capitalize">{key}</div>
                          <StatusBadge status={String(val)} />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Server Info */}
              {server && (
                <>
                  {/* Memory */}
                  <div className="bg-card rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <h2 className="text-sm font-semibold text-foreground">Prozess-Ressourcen</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">RAM</span>
                          <span className="font-medium">{server.memoryUsedMb} MB / {server.memoryTotalMb} MB</span>
                        </div>
                        <ProgressBar value={server.memoryPct} />
                        <div className="text-xs text-muted-foreground mt-0.5">{server.memoryPct}% genutzt</div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Uptime</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="font-medium">{server.uptime}</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Node.js</span>
                          <span className="font-mono">{server.nodeVersion}</span>
                        </div>
                        {server.cpuModel && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CPU</span>
                            <span className="truncate max-w-[160px]">{server.cpuCount}× {server.cpuModel?.split(' ').slice(-3).join(' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Disk */}
                  {(server.diskRoot || server.diskStorage) && (
                    <div className="bg-card rounded-xl border p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <HardDrive className="w-4 h-4 text-teal-500" />
                        <h2 className="text-sm font-semibold text-foreground">Festplatte</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {server.diskRoot && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">System (/)</span>
                              <span className="font-medium">{fmtBytes(server.diskRoot.used)} / {fmtBytes(server.diskRoot.total)}</span>
                            </div>
                            <ProgressBar value={server.diskRoot.usedPct} />
                            <div className="text-xs text-muted-foreground mt-0.5">{fmtBytes(server.diskRoot.free)} frei ({server.diskRoot.usedPct}% belegt)</div>
                          </div>
                        )}
                        {server.diskStorage && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Storage</span>
                              <span className="font-medium">{fmtBytes(server.diskStorage.used)} / {fmtBytes(server.diskStorage.total)}</span>
                            </div>
                            <ProgressBar value={server.diskStorage.usedPct} />
                            <div className="text-xs text-muted-foreground mt-0.5">{fmtBytes(server.diskStorage.free)} frei ({server.diskStorage.usedPct}% belegt)</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Database/Redis */}
                  <div className="bg-card rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Database className="w-4 h-4 text-purple-500" />
                      <h2 className="text-sm font-semibold text-foreground">Datenbank & Cache</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {server.database && (
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-muted-foreground">PostgreSQL</div>
                          <StatusBadge status={server.database.status} />
                        </div>
                      )}
                      {server.redis && (
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-muted-foreground">Redis</div>
                          <StatusBadge status={server.redis.status} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
