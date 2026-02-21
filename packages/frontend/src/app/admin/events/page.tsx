'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, RefreshCw, Loader2, Search, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { useToastStore } from '@/store/toastStore';

interface AdminEvent {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  dateTime?: string;
  createdAt: string;
  host?: { email: string; name?: string };
  _count?: { photos: number; guests: number };
}

export default function AdminEventsPage() {
  const { showToast } = useToastStore();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const load = useCallback(async (p = page, q = search) => {
    setRefreshing(true);
    try {
      const res = await api.get('/admin/events', {
        params: { page: p, limit, search: q || undefined },
      });
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const handleToggleActive = async (event: AdminEvent) => {
    setActionLoading(event.id);
    try {
      await api.patch(`/admin/events/${event.id}/status`, { isActive: !event.isActive });
      showToast(event.isActive ? 'Event deaktiviert' : 'Event aktiviert', 'success');
      setEvents(ev => ev.map(e => e.id === event.id ? { ...e, isActive: !e.isActive } : e));
    } catch {
      showToast('Fehler beim Aktualisieren', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" /> Event-Verwaltung
                </h1>
                <p className="text-xs text-muted-foreground">{total.toLocaleString()} Events gesamt</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Titel / Slug suchen..."
                    className="pl-8 pr-3 py-1.5 text-sm bg-card border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-48"
                  />
                </div>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Suchen
                </button>
              </form>
              <button onClick={() => load()} disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border text-xs font-medium hover:bg-muted transition-colors disabled:opacity-60">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">Event</th>
                        <th className="text-left px-3 py-2.5 font-medium">Host</th>
                        <th className="text-right px-3 py-2.5 font-medium">Fotos</th>
                        <th className="text-right px-3 py-2.5 font-medium">Gäste</th>
                        <th className="text-left px-3 py-2.5 font-medium">Datum</th>
                        <th className="text-center px-3 py-2.5 font-medium">Aktiv</th>
                        <th className="text-right px-4 py-2.5 font-medium">Links</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.map(event => (
                        <tr key={event.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground text-sm truncate max-w-[200px]">{event.title}</div>
                            <div className="text-xs text-muted-foreground font-mono">{event.slug}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {event.host?.email || '—'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-sm">{(event._count?.photos || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-mono text-sm">{(event._count?.guests || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleToggleActive(event)}
                              disabled={actionLoading === event.id}
                              className="disabled:opacity-60 transition-opacity"
                            >
                              {event.isActive
                                ? <ToggleRight className="w-5 h-5 text-emerald-500 mx-auto" />
                                : <ToggleLeft className="w-5 h-5 text-muted-foreground mx-auto" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/events/${event.id}/dashboard`}
                                className="text-xs text-primary hover:underline flex items-center gap-0.5">
                                Dashboard <ExternalLink className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {events.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground/60 text-sm">
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Keine Events gefunden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    Seite {page} von {totalPages} ({total} Events)
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setPage(p => p - 1); load(page - 1); }} disabled={page <= 1}
                      className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setPage(p => p + 1); load(page + 1); }} disabled={page >= totalPages}
                      className="p-1.5 rounded-lg border hover:bg-muted disabled:opacity-40 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
