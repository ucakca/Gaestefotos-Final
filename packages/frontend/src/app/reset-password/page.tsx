'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';

const resetSchema = z.object({
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  confirmPassword: z.string().min(1, 'Bitte Passwort bestätigen'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword'],
});
type ResetFormData = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [token, setToken] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setServerError('Kein gültiger Reset-Link. Bitte fordere einen neuen Link an.');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetFormData) => {
    setServerError('');

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }

      alert('Passwort erfolgreich zurückgesetzt! Du wirst zum Dashboard weitergeleitet.');
      router.push('/dashboard');
    } catch (err: any) {
      setServerError(
        err.response?.data?.error || 
        'Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.'
      );
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-4">Ungültiger Link</h1>
              <p className="text-muted-foreground mb-6">{serverError}</p>
              <Button onClick={() => router.push('/forgot-password')}>
                Neuen Link anfordern
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Neues Passwort</h1>
            <p className="text-muted-foreground">
              Lege ein neues sicheres Passwort für dein Konto fest.
            </p>
          </div>

          {serverError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormInput
              id="password"
              type="password"
              label="Neues Passwort"
              placeholder="Mindestens 6 Zeichen"
              error={errors.password?.message}
              {...register('password')}
            />

            <FormInput
              id="confirmPassword"
              type="password"
              label="Passwort bestätigen"
              placeholder="Passwort wiederholen"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" loading={isSubmitting} className="w-full">
              Passwort zurücksetzen
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              ← Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lädt...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
