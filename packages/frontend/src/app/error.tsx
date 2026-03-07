'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);

    // Log to backend in production
    if (process.env.NODE_ENV === 'production') {
      try {
        fetch('/api/qa-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level: 'error',
            source: 'NextErrorPage',
            message: error.message,
            metadata: {
              stack: error.stack?.slice(0, 2000),
              digest: error.digest,
              url: typeof window !== 'undefined' ? window.location.href : '',
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {});
      } catch {
        // Silent fail
      }
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-terracotta-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-destructive/15 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-foreground mb-3">
            Etwas ist schiefgelaufen
          </h1>

          <p className="text-center text-muted-foreground mb-6">
            Es tut uns leid, aber es ist ein unerwarteter Fehler aufgetreten.
            Bitte versuche es erneut.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="font-mono text-sm text-destructive break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={reset}
              className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <RefreshCw className="w-5 h-5" />
              Erneut versuchen
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-muted/80 hover:bg-muted/60 text-foreground font-semibold py-3 px-4 rounded-lg transition-colors min-h-[44px]"
            >
              Seite neu laden
            </button>

            <a
              href="/"
              className="w-full text-forest-700 hover:text-forest-900 dark:text-forest-400 font-medium py-2 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Home className="w-4 h-4" />
              Zur Startseite
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
