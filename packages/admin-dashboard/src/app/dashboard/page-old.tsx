 'use client';

 import { useCallback, useEffect, useMemo, useState } from 'react';
 import api from '@/lib/api';
 import { Card } from '@/components/ui/Card';
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

    // Auto-refresh every 30 seconds when tab is visible
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

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Dashboard</h1>
        <p className="mt-1 text-sm text-app-muted">Überblick über System und Aktivität</p>
      </div>

      <div className="mb-4 flex items-center justify-end gap-2">
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? 'Lädt…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-app-border bg-app-card p-3 text-sm text-[var(--status-danger)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Backend</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">{backend?.version || '—'}</div>
          <div className="mt-1 text-xs text-app-muted">Env: {backend?.nodeEnv || '—'}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Uptime</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">
            {server?.uptimeSeconds ? `${Math.floor(server.uptimeSeconds / 3600)}h` : '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">
            Start: {server?.startedAt ? new Date(server.startedAt).toLocaleString() : '—'}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Load Avg</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">
            {server?.loadAvg?.length ? server.loadAvg.map((v) => v.toFixed(2)).join(' / ') : '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">(1m / 5m / 15m)</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Memory</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">
            {memUsed ? `${memUsed.percent}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">
            {memUsed ? `${fmtBytes(memUsed.used)} / ${fmtBytes(memUsed.total)}` : '—'}
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Disk</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">{disk ? `${disk.usedPercent}%` : '—'}</div>
          <div className="mt-1 text-xs text-app-muted">
            {disk ? `${fmtBytes(disk.usedBytes)} used / ${fmtBytes(disk.sizeBytes)} total (mount ${disk.mount})` : '—'}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium text-app-muted">Letztes Update</div>
          <div className="mt-2 text-2xl font-semibold text-app-fg">
            {server?.checkedAt ? new Date(server.checkedAt).toLocaleTimeString() : '—'}
          </div>
          <div className="mt-1 text-xs text-app-muted">
            Tipp: Wenn Menüs/Routen fehlen, deploy ist alt. Nutze „Neu laden (Cache)“ in der Sidebar.
          </div>
        </Card>
      </div>
    </div>
  );
}

