'use client';

import { useEffect, useState } from 'react';

export default function MaintenanceBanner() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/maintenance', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as any;
        if (cancelled) return;
        setEnabled(data?.enabled === true);
        setMessage(typeof data?.message === 'string' && data.message.trim() ? data.message : null);
      } catch {
        // ignore
      }
    };

    load();
    const t = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      style={{
        width: '100%',
        background: '#B00020',
        color: 'white',
        padding: '0.75rem 1rem',
        fontSize: '0.95rem',
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      {message || 'Wartungsmodus: Bitte später erneut versuchen.'}
    </div>
  );
}
