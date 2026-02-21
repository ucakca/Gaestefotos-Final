'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, HardDrive, RefreshCw, Loader2, TrendingUp, Database, Image } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

interface StorageEvent {
  id: string;
  title: string;
  slug: string;
  photoCount: number;
  sizeBytes: bigint | number;
}

interface StorageSummary {
  totalEvents: number;
  totalSizeBytes: number;
  topEvents: StorageEvent[];
}

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function AdminStoragePage() {
  const [summary, setSummary] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/admin/events/storage-stats?limit=30');
      const data = res.data;
      const events: StorageEvent[] = (data.topEvents || []).map((e: any) => ({
        ...e,
        sizeBytes: typeof e.sizeBytes === 'string' ? parseInt(e.sizeBytes, 10) : (e.sizeBytes || 0),
      }));
      const totalSizeBytes = events.reduce((sum, e) => sum + (Number(e.sizeBytes) || 0), 0);
      setSummary({ totalEvents: data.totalEvents || 0, totalSizeBytes, topEvents: events });
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
                  <HardDrive className="w-5 h-5 text-teal-500" /> Storage-Statistiken
                </h1>
                <p className="text-xs text-muted-foreground">Top-Events nach Speicherverbrauch</p>
              </div>
            </div>
            <button onClick={load} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : summary ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card rounded-xl border p-4 text-center">
                  <Database className="w-5 h-5 text-teal-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-foreground">{fmtBytes(summary.totalSizeBytes)}</div>
                  <div className="text-xs text-muted-foreground">Gesamt-Storage</div>
                </div>
                <div className="bg-card rounded-xl border p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-foreground">{summary.totalEvents}</div>
                  <div className="text-xs text-muted-foreground">Events gesamt</div>
                </div>
                <div className="bg-card rounded-xl border p-4 text-center">
                  <Image className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-foreground">
                    {summary.topEvents.reduce((s, e) => s + (e.photoCount || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Fotos (Top 30)</div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">#</th>
                        <th className="text-left px-3 py-2.5 font-medium">Event</th>
                        <th className="text-right px-3 py-2.5 font-medium">Fotos</th>
                        <th className="text-right px-3 py-2.5 font-medium">Größe</th>
                        <th className="text-right px-4 py-2.5 font-medium">Anteil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.topEvents.map((event, i) => {
                        const size = Number(event.sizeBytes) || 0;
                        const pct = summary.totalSizeBytes > 0
                          ? ((size / summary.totalSizeBytes) * 100).toFixed(1)
                          : '0.0';
                        return (
                          <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-3 py-3">
                              <Link href={`/events/${event.id}/dashboard`}
                                className="font-medium text-foreground hover:text-primary transition-colors text-sm">
                                {event.title}
                              </Link>
                              <div className="text-xs text-muted-foreground font-mono">{event.slug}</div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-sm">{(event.photoCount || 0).toLocaleString()}</td>
                            <td className="px-3 py-3 text-right font-mono text-sm font-medium">{fmtBytes(size)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-muted rounded-full h-1.5">
                                  <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, parseFloat(pct))}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground w-9 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {summary.topEvents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground/60 text-sm">
                            <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Keine Daten vorhanden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
