'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/auth';
import Logo from '@/components/Logo';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormInput } from '@/components/ui/FormInput';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';

const loginSchema = z.object({
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');

    try {
      const response: any = await authApi.login({ email: data.email, password: data.password });

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

        const returnUrl =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('returnUrl')
            : null;

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
        }

        router.push(returnUrl || '/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Login fehlgeschlagen';
      setServerError(Array.isArray(errorMessage) ? errorMessage[0]?.message || 'Login fehlgeschlagen' : errorMessage);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo width={180} height={72} />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Willkommen zurück
          </h1>
          <p className="text-sm text-muted-foreground">
            Melde dich an, um fortzufahren
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-background border-2 border-status-danger text-destructive px-4 py-3 rounded-lg"
            >
              {serverError}
            </motion.div>
          )}

          <FormInput
            id="email"
            type="email"
            label="E-Mail"
            placeholder="deine@email.com"
            autoComplete="email"
            error={errors.email?.message}
            className="rounded-lg border border-border bg-card px-4 py-3"
            {...register('email')}
          />

          <div>
            <div className="relative">
              <FormInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Passwort"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                className="rounded-lg border border-border bg-card px-4 py-3 pr-12"
                {...register('password')}
              />
              <IconButton
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                icon={showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                className="absolute right-3 top-8 text-muted-foreground"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-foreground">
              <Checkbox id="rememberMe" name="rememberMe" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked)} />
              <span className="ml-2 text-sm">Angemeldet bleiben</span>
            </label>
            <a
              className="text-sm text-foreground hover:underline"
              href="https://gästefotos.com/wp-login.php?action=lostpassword"
              target="_blank"
              rel="noreferrer"
            >
              Passwort vergessen?
            </a>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full text-background py-3 rounded-lg font-medium transition-colors bg-primary hover:opacity-90"
          >
            Anmelden
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Kein Konto? Bitte auf <strong>gästefotos.com</strong> anlegen.
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-3 border-t border-border pt-3 text-center">
            <a className="text-sm text-foreground hover:underline" href="/faq" target="_blank" rel="noreferrer">
              Hilfe / FAQ
            </a>
            <span className="text-muted-foreground">|</span>
            <a className="text-sm text-foreground hover:underline" href="/datenschutz" target="_blank" rel="noreferrer">
              Datenschutz
            </a>
            <span className="text-muted-foreground">|</span>
            <a className="text-sm text-foreground hover:underline" href="/impressum" target="_blank" rel="noreferrer">
              Impressum
            </a>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
