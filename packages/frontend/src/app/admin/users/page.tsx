'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, RefreshCw, Loader2, Search, Shield, Lock, Unlock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { useToastStore } from '@/store/toastStore';

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  isLocked: boolean;
  createdAt: string;
  _count?: { events: number };
}

const ROLES = ['USER', 'ADMIN', 'PARTNER', 'SUPERADMIN'];

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    SUPERADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    PARTNER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    USER: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${colors[role] || colors.USER}`}>
      {role}
    </span>
  );
}

export default function AdminUsersPage() {
  const { showToast } = useToastStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
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
      const res = await api.get('/admin/users', {
        params: { page: p, limit, search: q || undefined },
      });
      setUsers(res.data.users || []);
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

  const handleRoleChange = async (userId: string, role: string) => {
    setActionLoading(userId + 'role');
    try {
      await api.patch(`/admin/users/${userId}/role`, { role });
      showToast('Rolle aktualisiert', 'success');
      setUsers(u => u.map(user => user.id === userId ? { ...user, role } : user));
    } catch {
      showToast('Fehler beim Ändern der Rolle', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLockToggle = async (user: AdminUser) => {
    setActionLoading(user.id + 'lock');
    try {
      await api.patch(`/admin/users/${user.id}/lock`, { locked: !user.isLocked });
      showToast(user.isLocked ? 'Benutzer entsperrt' : 'Benutzer gesperrt', 'success');
      setUsers(u => u.map(us => us.id === user.id ? { ...us, isLocked: !us.isLocked } : us));
    } catch {
      showToast('Fehler', 'error');
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
                  <Users className="w-5 h-5 text-blue-500" /> Benutzer-Verwaltung
                </h1>
                <p className="text-xs text-muted-foreground">{total.toLocaleString()} Benutzer gesamt</p>
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
                    placeholder="E-Mail suchen..."
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
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <>
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-medium">Benutzer</th>
                        <th className="text-left px-3 py-2.5 font-medium">Rolle</th>
                        <th className="text-right px-3 py-2.5 font-medium">Events</th>
                        <th className="text-left px-3 py-2.5 font-medium">Registriert</th>
                        <th className="text-right px-4 py-2.5 font-medium">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {users.map(user => (
                        <tr key={user.id} className={`hover:bg-muted/20 transition-colors ${user.isLocked ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground text-sm">{user.email}</div>
                            {user.name && <div className="text-xs text-muted-foreground">{user.name}</div>}
                            {user.isLocked && (
                              <span className="text-xs text-red-500 font-medium">🔒 Gesperrt</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={user.role}
                              onChange={e => handleRoleChange(user.id, e.target.value)}
                              disabled={actionLoading === user.id + 'role'}
                              className="text-xs border rounded px-1.5 py-1 bg-card focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                            >
                              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-sm">{user._count?.events || 0}</td>
                          <td className="px-3 py-3 text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString('de-DE')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleLockToggle(user)}
                                disabled={actionLoading === user.id + 'lock'}
                                className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-60"
                                title={user.isLocked ? 'Entsperren' : 'Sperren'}
                              >
                                {user.isLocked
                                  ? <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                                  : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground/60 text-sm">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Keine Benutzer gefunden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">
                    Seite {page} von {totalPages} ({total} Benutzer)
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
