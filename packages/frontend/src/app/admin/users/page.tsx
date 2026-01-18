'use client';

import { useEffect, useState } from 'react';
import { Search, Lock, Unlock, Trash2, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  lockedAt: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search]);

  const changeRole = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const toggleLock = async (userId: string, currentlyLocked: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${userId}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          locked: !currentlyLocked,
          reason: currentlyLocked ? null : 'Locked by admin',
        }),
      });

      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('User wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">Verwalte alle Benutzer der Plattform</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Suche nach Email oder Name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              {total} User gesamt
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lädt User...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Keine User gefunden
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rolle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2FA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Erstellt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={user.role}
                          onValueChange={(value) => changeRole(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER">USER</SelectItem>
                            <SelectItem value="HOST">HOST</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.twoFactorEnabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {user.twoFactorEnabled ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.lockedAt
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.lockedAt ? 'Gesperrt' : 'Aktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleLock(user.id, !!user.lockedAt)}
                            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title={user.lockedAt ? 'Entsperren' : 'Sperren'}
                          >
                            {user.lockedAt ? <Unlock size={18} /> : <Lock size={18} />}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Seite {page + 1} von {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    variant="secondary"
                    size="sm"
                  >
                    Weiter
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
