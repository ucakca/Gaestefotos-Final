'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, Mail, Calendar, Shield, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Image, Trash2, UserCog,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

interface UserEvent {
  id: string;
  title: string;
  slug: string | null;
  dateTime: string | null;
  _count?: { photos: number; guests: number };
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userEvents, setUserEvents] = useState<Record<string, UserEvent[]>>({});
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ users: User[]; total: number }>('/admin/users', {
        params: { q: search || undefined, limit: 50 },
      });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const toggleExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    if (!userEvents[userId]) {
      setLoadingEvents(userId);
      try {
        const res = await api.get<{ events: UserEvent[] }>('/admin/events', {
          params: { hostId: userId, limit: 50 },
        });
        setUserEvents((prev) => ({ ...prev, [userId]: res.data.events || [] }));
      } catch {
        setUserEvents((prev) => ({ ...prev, [userId]: [] }));
      } finally {
        setLoadingEvents(null);
      }
    }
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`Rolle auf ${newRole} geändert`);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch {
      toast.error('Fehler beim Ändern der Rolle');
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Benutzer "${email}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('Benutzer gelöscht');
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setExpandedUserId(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Users className="w-6 h-6 text-app-accent" />
            Benutzer
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {total} Benutzer insgesamt
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input
            placeholder="Suchen nach Name oder E-Mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine Benutzer gefunden
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {filteredUsers.map((user) => {
              const isExpanded = expandedUserId === user.id;
              const events = userEvents[user.id];
              const isLoadingEvt = loadingEvents === user.id;

              return (
                <div key={user.id}>
                  <div
                    className="p-4 hover:bg-app-bg/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-app-accent/10 flex items-center justify-center">
                          <span className="text-app-accent font-semibold">
                            {(user.name || user.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-app-fg">
                            {user.name || 'Kein Name'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-app-muted">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(user.createdAt).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-destructive/100/10 text-destructive'
                              : user.role === 'HOST'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-muted/500/10 text-muted-foreground'
                          }`}
                        >
                          <Shield className="w-3 h-3 inline mr-1" />
                          {user.role}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-app-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-app-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: User's Events */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="ml-14 rounded-xl border border-app-border bg-app-bg/30 overflow-hidden">
                        <div className="px-4 py-2 border-b border-app-border">
                          <span className="text-xs font-medium text-app-muted">Events dieses Benutzers</span>
                        </div>
                        {isLoadingEvt ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-4 h-4 animate-spin text-app-accent" />
                          </div>
                        ) : !events || events.length === 0 ? (
                          <div className="text-center py-6 text-xs text-app-muted">
                            Keine Events vorhanden
                          </div>
                        ) : (
                          <div className="divide-y divide-app-border">
                            {events.map((evt) => (
                              <div key={evt.id} className="px-4 py-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors">
                                <div>
                                  <p className="text-sm font-medium text-app-fg">{evt.title}</p>
                                  <div className="flex items-center gap-2 text-xs text-app-muted">
                                    <span>/{evt.slug || '—'}</span>
                                    {evt.dateTime && (
                                      <span>{new Date(evt.dateTime).toLocaleDateString('de-DE')}</span>
                                    )}
                                    <span className="flex items-center gap-1">
                                      <Image className="w-3 h-3" />
                                      {evt._count?.photos || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {evt._count?.guests || 0}
                                    </span>
                                  </div>
                                </div>
                                <a
                                  href={`https://app.xn--gstefotos-v2a.com/events/${evt.id}/dashboard`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-app-bg transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-app-muted" />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* User Actions */}
                      <div className="ml-14 mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-app-muted mr-1">
                          <UserCog className="w-3.5 h-3.5 inline mr-1" />
                          Rolle:
                        </span>
                        {['HOST', 'ADMIN'].map((role) => (
                          <button
                            key={role}
                            onClick={(e) => { e.stopPropagation(); changeRole(user.id, role); }}
                            disabled={user.role === role}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              user.role === role
                                ? 'bg-app-accent/10 text-app-accent border border-app-accent/30 cursor-default'
                                : 'bg-app-bg text-app-muted border border-app-border hover:border-app-accent/50'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                        <div className="flex-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteUser(user.id, user.email); }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-destructive border border-destructive/20 hover:bg-destructive/100/10 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Löschen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
