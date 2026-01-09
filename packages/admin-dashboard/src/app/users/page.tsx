'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import FullPageLoader from '@/components/FullPageLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type UserListItem = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'HOST';
  twoFactorEnabled: boolean;
  createdAt: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [role, setRole] = useState<'ALL' | 'ADMIN' | 'HOST'>('ALL');

  const params = useMemo(() => {
    const p: any = {};
    const qTrimmed = q.trim();
    if (qTrimmed) p.q = qTrimmed;
    if (role !== 'ALL') p.role = role;
    p.limit = 200;
    p.offset = 0;
    return p;
  }, [q, role]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/admin/users', { params });
        const items = (res.data?.users || []) as UserListItem[];
        if (mounted) setUsers(items);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [params]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Benutzer</h1>
        <p className="mt-1 text-sm text-app-muted">Admin-Benutzer und Rollen</p>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Suche: Name oder Email" className="px-3 py-2" />
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Rolle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Alle Rollen</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
            <SelectItem value="HOST">HOST</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center text-sm text-app-muted">
          {loading ? '…' : `${users.length} Benutzer`}
        </div>
      </div>

      {loading ? <FullPageLoader /> : null}

      {!loading && error ? (
        <Card className="p-5">
          <p className="text-sm text-[var(--status-danger)]">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((u) => (
              <Card key={u.id} className="p-5">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-app-fg">{u.name}</div>
                  <div className="mt-1 text-sm text-app-muted truncate">{u.email}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-app-muted">Rolle</div>
                    <div className="text-sm font-medium text-app-fg">{u.role}</div>
                  </div>
                  <div>
                    <div className="text-xs text-app-muted">2FA</div>
                    <div className="text-sm font-medium text-app-fg">{u.twoFactorEnabled ? 'aktiv' : 'aus'}</div>
                  </div>
                </div>
                <div className="mt-4 text-xs text-app-muted">Erstellt: {new Date(u.createdAt).toLocaleString('de-DE')}</div>
              </Card>
            ))}

            {users.length === 0 ? (
              <Card className="p-5">
                <p className="text-sm text-app-muted">Keine Benutzer gefunden</p>
              </Card>
            ) : null}
          </div>

          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-app-border">
                  <thead className="bg-app-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Rolle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">2FA</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Erstellt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border bg-app-card">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 text-sm text-app-fg">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{u.role}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{u.twoFactorEnabled ? 'aktiv' : 'aus'}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{new Date(u.createdAt).toLocaleString('de-DE')}</td>
                      </tr>
                    ))}

                    {users.length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-sm text-app-muted" colSpan={5}>
                          Keine Benutzer gefunden
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
