'use client';

import { useEffect } from 'react';
import Logo from '@/components/Logo';

export default function RegisterPage() {
  useEffect(() => {
    window.location.href = 'https://gästefotos.com/registrieren/';
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <Logo className="mx-auto mb-6 h-12 w-auto" />
          <h1 className="text-3xl font-bold text-foreground">Weiterleitung...</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Du wirst zur Registrierung weitergeleitet
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl backdrop-blur-xl">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-app-accent"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
