'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/auth';
import Logo from '@/components/Logo';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response: any = await authApi.login({ email, password });

      // If the backend requires 2FA setup/verification, the app does not handle it.
      // Send the user to the admin dashboard login flow.
      if ((response?.twoFactorRequired || response?.twoFactorSetupRequired) && typeof window !== 'undefined') {
        const origin = window.location.origin;
        const url = new URL(origin);
        url.hostname = url.hostname.replace(/^app\./i, 'dash.');
        url.pathname = '/login';
        window.location.href = url.toString();
        return;
      }

      if (response?.user) {
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            if (response.token) localStorage.setItem('token', response.token);
            sessionStorage.removeItem('token');
          } else {
            if (response.token) sessionStorage.setItem('token', response.token);
            localStorage.removeItem('token');
          }
        }

        // Harden redirect decision: confirm role via /auth/me (DB role) before redirecting to dash.
        try {
          const me = await authApi.getMe();
          const roleRaw = (me?.user as any)?.role;
          const roleLower = String(roleRaw || '').toLowerCase().trim();
          const isAdmin =
            roleRaw === 'ADMIN' ||
            roleRaw === 'SUPERADMIN' ||
            roleLower === 'admin' ||
            roleLower === 'superadmin' ||
            roleLower === 'administrator';

          if (isAdmin && typeof window !== 'undefined') {
            const origin = window.location.origin;
            const token = String(response.token || '');
            const url = new URL(origin);
            url.hostname = url.hostname.replace(/^app\./i, 'dash.');
            url.pathname = '/login';
            if (token) {
              url.searchParams.set('token', token);
            }
            window.location.href = url.toString();
            return;
          }
        } catch {
          // If /me fails, default to the non-admin app dashboard (least privilege).
        }

        router.push('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Login fehlgeschlagen';
      setError(Array.isArray(errorMessage) ? errorMessage[0]?.message || 'Login fehlgeschlagen' : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-app-bg p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-app-card p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={180} height={72} />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-app-fg">
            Willkommen zurück
          </h1>
          <p className="text-sm text-app-muted">
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-app-bg border-2 border-status-danger text-status-danger px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-app-fg">
              E-Mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border bg-app-card px-4 py-3 text-app-fg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/15"
              placeholder="deine@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-app-fg">
              Passwort
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-app-border bg-app-card px-4 py-3 pr-12 text-app-fg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/15"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <IconButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                icon={showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-app-muted"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-app-fg">
              <Checkbox id="rememberMe" name="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked)} />
              <span className="ml-2 text-sm">Angemeldet bleiben</span>
            </label>
            <a
              className="text-sm text-app-fg hover:underline"
              href="https://gästefotos.com/wp-login.php?action=lostpassword"
              target="_blank"
              rel="noreferrer"
            >
              Passwort vergessen?
            </a>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full text-app-bg py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-app-accent hover:opacity-90"
          >
            <motion.span whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="block">
              {loading ? 'Anmelden...' : 'Anmelden'}
            </motion.span>
          </Button>

          <div className="text-center text-sm text-app-muted">
            Kein Konto? Bitte auf <strong>gästefotos.com</strong> anlegen.
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-app-border pt-3 text-center">
            <a className="text-sm text-app-fg hover:underline" href="https://xn--gstefotos-v2a.com/faq/" target="_blank" rel="noreferrer">
              Hilfe / FAQ
            </a>
            <span className="text-app-muted">|</span>
            <a className="text-sm text-app-fg hover:underline" href="https://xn--gstefotos-v2a.com/datenschutz/" target="_blank" rel="noreferrer">
              Datenschutz
            </a>
            <span className="text-app-muted">|</span>
            <a className="text-sm text-app-fg hover:underline" href="https://gästefotos.com/impressum" target="_blank" rel="noreferrer">
              Impressum
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
