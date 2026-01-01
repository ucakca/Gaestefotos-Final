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
      const response = await authApi.login({ email, password });
      if (response.user) {
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            if (response.token) localStorage.setItem('token', response.token);
            sessionStorage.removeItem('token');
          } else {
            if (response.token) sessionStorage.setItem('token', response.token);
            localStorage.removeItem('token');
          }
        }

        const roleRaw = (response.user as any).role;
        const roleLower = String(roleRaw || '').toLowerCase().trim();
        const isAdmin =
          roleRaw === 'ADMIN' ||
          roleRaw === 'SUPERADMIN' ||
          roleLower === 'admin' ||
          roleLower === 'superadmin' ||
          roleLower === 'administrator';

        router.push(isAdmin ? '/admin/dashboard' : '/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Login fehlgeschlagen';
      setError(Array.isArray(errorMessage) ? errorMessage[0]?.message || 'Login fehlgeschlagen' : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-4 bg-tokens-brandGreen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl shadow-xl p-8 w-full max-w-md bg-app-bg"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4" style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo width={180} height={72} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-tokens-brandGreen">
            Willkommen zurück
          </h1>
          <p className="text-sm text-tokens-brandGreen">
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-app-bg border-2 border-[var(--status-danger)] text-[var(--status-danger)] px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-tokens-brandGreen">
              E-Mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-app-accent rounded-lg focus:ring-2 focus:ring-tokens-brandGreen/30 focus:border-tokens-brandGreen focus:outline-none transition-all text-app-fg bg-app-card"
              placeholder="deine@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-tokens-brandGreen">
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
                className="w-full px-4 py-3 pr-12 border border-app-accent rounded-lg focus:ring-2 focus:ring-tokens-brandGreen/30 focus:border-tokens-brandGreen focus:outline-none transition-all text-app-fg bg-app-card"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tokens-brandGreen"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-tokens-brandGreen">
              <Checkbox id="rememberMe" name="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked)} />
              <span className="ml-2 text-sm">Angemeldet bleiben</span>
            </label>
            <a
              className="text-sm hover:underline"
              style={{ color: 'var(--brand-green)' }}
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

          <div className="text-center text-sm text-tokens-brandGreen/90">
            Kein Konto? Bitte auf <strong>gästefotos.com</strong> anlegen.
          </div>

          <div className="mt-3 pt-3 border-t border-tokens-brandGreen/15 flex justify-center gap-3 flex-wrap text-center">
            <a className="text-sm hover:underline text-tokens-brandGreen" href="https://xn--gstefotos-v2a.com/faq/" target="_blank" rel="noreferrer">
              Hilfe / FAQ
            </a>
            <span className="text-tokens-brandGreen/35">|</span>
            <a className="text-sm hover:underline text-tokens-brandGreen" href="https://xn--gstefotos-v2a.com/datenschutz/" target="_blank" rel="noreferrer">
              Datenschutz
            </a>
            <span className="text-tokens-brandGreen/35">|</span>
            <a className="text-sm hover:underline text-tokens-brandGreen" href="https://gästefotos.com/impressum" target="_blank" rel="noreferrer">
              Impressum
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
