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
import { FormInput } from '@/components/ui/FormInput';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
  password: z.string().min(8, 'Mindestens 8 Zeichen'),
  passwordConfirm: z.string().min(1, 'Bitte Passwort bestätigen'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwörter stimmen nicht überein',
  path: ['passwordConfirm'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    try {
      await authApi.register({ email: data.email, password: data.password, name: data.name });
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (typeof msg === 'string') {
        setServerError(msg);
      } else if (Array.isArray(msg)) {
        setServerError(msg.map((e: any) => e.message).join(', '));
      } else {
        setServerError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <Logo className="mx-auto mb-6 h-12 w-auto" />
          <h1 className="text-3xl font-bold text-foreground">Konto erstellen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Erstelle dein kostenloses Gästefotos-Konto
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl backdrop-blur-xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            <FormInput
              label="Name"
              type="text"
              autoComplete="name"
              placeholder="Max Mustermann"
              error={errors.name?.message}
              {...register('name')}
            />

            <FormInput
              label="E-Mail"
              type="email"
              autoComplete="email"
              placeholder="max@beispiel.de"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <FormInput
                label="Passwort"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mindestens 8 Zeichen"
                error={errors.password?.message}
                {...register('password')}
              />
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                icon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-8"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              />
            </div>

            <FormInput
              label="Passwort bestätigen"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              error={errors.passwordConfirm?.message}
              {...register('passwordConfirm')}
            />

            <Button
              type="submit"
              loading={isSubmitting}
              className="w-full py-3 rounded-xl"
            >
              Registrieren
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Bereits ein Konto?{' '}
            <a href="/login" className="text-primary hover:text-primary/80 font-medium">
              Anmelden
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
