'use client';

import { useEffect, useState } from 'react';
import { buildApiUrl } from '@/lib/api';

export default function MaintenanceBanner() {
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(buildApiUrl('/maintenance'), { credentials: 'include' });
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
    <div className="w-full bg-status-danger text-app-bg px-4 py-3 text-[0.95rem] font-semibold text-center">
      {message || 'Wartungsmodus: Bitte später erneut versuchen.'}
    </div>
  );
}
