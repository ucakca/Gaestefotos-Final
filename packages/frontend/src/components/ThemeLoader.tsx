'use client';

import { useEffect } from 'react';

export default function ThemeLoader() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/theme', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as any;
        const tokens = (data?.tokens || {}) as Record<string, string>;

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
