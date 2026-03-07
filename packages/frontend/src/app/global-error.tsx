'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f0f4f2 0%, #fdf0ec 100%)',
          padding: '1rem',
        }}>
          <div style={{ width: '100%', maxWidth: '28rem' }}>
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
              padding: '2rem',
              textAlign: 'center',
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                background: '#fee2e2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}>
                <AlertTriangle style={{ width: '2rem', height: '2rem', color: '#dc2626' }} />
              </div>

              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '0.75rem' }}>
                Kritischer Fehler
              </h1>

              <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Ein schwerwiegender Fehler ist aufgetreten. Bitte lade die Seite neu.
              </p>

              <button
                onClick={reset}
                style={{
                  width: '100%',
                  background: '#c45a3c',
                  color: 'white',
                  fontWeight: 600,
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  minHeight: '44px',
                }}
              >
                <RefreshCw style={{ width: '1.25rem', height: '1.25rem' }} />
                Erneut versuchen
              </button>

              <button
                onClick={() => window.location.href = '/'}
                style={{
                  width: '100%',
                  background: '#f3f4f6',
                  color: '#1a1a1a',
                  fontWeight: 600,
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  marginTop: '0.75rem',
                  minHeight: '44px',
                }}
              >
                Zur Startseite
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
