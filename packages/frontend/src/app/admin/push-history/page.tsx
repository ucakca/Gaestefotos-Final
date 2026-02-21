'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, RefreshCw, Loader2, CheckCircle2, XCircle, Users, Target } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

interface PushNotification {
  id: string;
  eventId: string | null;
  title: string;
  body: string;
  icon: string | null;
  url: string | null;
  sentBy: string | null;
  targetType: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

const TARGET_LABELS: Record<string, string> = {
  all: 'Alle',
  event: 'Event',
  user: 'User',
};

export default function PushHistoryPage() {
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 25;

  const load = useCallback(async (p = page) => {
    setRefreshing(true);
    try {
      const res = await api.get(`/push/history?page=${p}&limit=${LIMIT}`);
      setNotifications(res.data.notifications || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / LIMIT);

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
                  <Bell className="w-5 h-5 text-indigo-500" /> Push-Verlauf
                </h1>
                <p className="text-xs text-muted-foreground">{total} gesendete Benachrichtigungen</p>
              </div>
            </div>
            <button onClick={() => load()} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">Benachrichtigung</th>
                        <th className="text-left px-3 py-2.5 font-medium">Ziel</th>
                        <th className="text-right px-3 py-2.5 font-medium">Empfänger</th>
                        <th className="text-right px-3 py-2.5 font-medium">Erfolg</th>
                        <th className="text-right px-3 py-2.5 font-medium">Fehler</th>
                        <th className="text-right px-4 py-2.5 font-medium">Gesendet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {notifications.map((n) => {
                        const successRate = n.recipientCount > 0
                          ? Math.round((n.successCount / n.recipientCount) * 100) : 0;
                        return (
                          <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground text-sm">{n.title}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</div>
                              {n.url && (
                                <div className="text-xs text-indigo-500 mt-0.5 truncate">{n.url}</div>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs">{TARGET_LABELS[n.targetType] || n.targetType}</span>
                              </div>
                              {n.eventId && (
                                <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate max-w-[120px]">{n.eventId.slice(0, 8)}…</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span className="font-mono text-sm">{n.recipientCount}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{n.successCount}</span>
                              </div>
                              {n.recipientCount > 0 && (
                                <div className="text-xs text-muted-foreground text-right">{successRate}%</div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-right">
                              {n.failureCount > 0 ? (
                                <div className="flex items-center justify-end gap-1">
                                  <XCircle className="w-3 h-3 text-red-500" />
                                  <span className="font-mono text-sm text-red-600 dark:text-red-400">{n.failureCount}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                              {new Date(n.createdAt).toLocaleString('de-DE', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        );
                      })}
                      {notifications.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground/60 text-sm">
                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Noch keine Push-Benachrichtigungen gesendet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-t px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Seite {page} / {totalPages}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setPage(p => Math.max(1, p - 1)); load(Math.max(1, page - 1)); }}
                        disabled={page <= 1}
                        className="px-3 py-1 rounded border text-xs disabled:opacity-40 hover:bg-muted transition-colors">
                        Zurück
                      </button>
                      <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); load(Math.min(totalPages, page + 1)); }}
                        disabled={page >= totalPages}
                        className="px-3 py-1 rounded border text-xs disabled:opacity-40 hover:bg-muted transition-colors">
                        Weiter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
