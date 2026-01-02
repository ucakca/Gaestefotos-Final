'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAdminAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      
      // Check if user has admin role
      if (user.role !== 'ADMIN') {
        setError('Zugriff verweigert: Keine Admin-Berechtigung');
        setLoading(false);
        return;
      }

      login(token, {
        id: user.id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-app-muted">Bitte melde dich an</p>
        </div>

        <Card className="p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error ? (
              <div className="rounded-lg border border-[var(--status-danger)] bg-app-bg px-4 py-3 text-sm text-[var(--status-danger)]">
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-app-fg">
                E-Mail-Adresse
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-app-fg">
                Passwort
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Wird angemeldet...' : 'Anmelden'}
            </Button>

            <p className="text-center text-xs text-app-muted">
              Zugriff ist nur für Administratoren erlaubt.
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

