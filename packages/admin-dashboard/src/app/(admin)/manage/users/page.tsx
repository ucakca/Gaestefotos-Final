'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw, Mail, Calendar, Shield, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  _count?: {
    events: number;
  };
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ users: User[]; total: number }>('/admin/users', {
        params: { search, limit: 50 },
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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
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
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 hover:bg-app-bg/50 transition-colors"
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
                          ? 'bg-red-500/10 text-red-500'
                          : user.role === 'HOST'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-gray-500/10 text-gray-500'
                      }`}
                    >
                      <Shield className="w-3 h-3 inline mr-1" />
                      {user.role}
                    </span>
                    {user._count?.events !== undefined && (
                      <span className="text-xs text-app-muted">
                        {user._count.events} Events
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
