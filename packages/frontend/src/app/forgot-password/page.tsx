'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { FormInput } from '@/components/ui/FormInput';
import { Button } from '@/components/ui/Button';

const forgotSchema = z.object({
  email: z.string().min(1, 'E-Mail ist erforderlich').email('Ungültige E-Mail-Adresse'),
});
type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [successMessage, setSuccessMessage] = useState('');
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setSuccessMessage('');
    setServerError('');

    try {
      const response = await api.post('/auth/forgot-password', { email: data.email });
      setSuccessMessage(response.data.message || 'Falls ein Konto existiert, wurde eine E-Mail versendet.');
      reset();
    } catch (err: any) {
      setServerError(err.response?.data?.error || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Passwort vergessen</h1>
            <p className="text-muted-foreground">
              Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
            </p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-success text-sm">{successMessage}</p>
            </div>
          )}

          {serverError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormInput
              id="email"
              type="email"
              label="E-Mail-Adresse"
              placeholder="deine@email.de"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button type="submit" loading={isSubmitting} className="w-full">
              Reset-Link anfordern
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => router.push('/login')}
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              ← Zurück zum Login
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Kein Konto?{' '}
            <a
              href="https://gästefotos.com/registrieren"
              className="text-primary hover:text-primary/80 font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Jetzt registrieren
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
