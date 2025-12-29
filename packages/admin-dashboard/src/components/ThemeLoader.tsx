'use client';

import { useEffect } from 'react';
import api from '@/lib/api';

export default function ThemeLoader() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get('/theme');
        const tokens = (res.data?.tokens || {}) as Record<string, string>;
        if (cancelled) return;

        const root = document.documentElement;
        for (const [k, v] of Object.entries(tokens)) {
          if (!k || !v) continue;
          root.style.setProperty(k, v);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
