'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientRedirect({ code, initialTarget }: { code: string; initialTarget: string | null }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!initialTarget) return;

      try {
        const buildShortlinkUrl = (): string => {
          // Production: always same-origin.
          if (process.env.NODE_ENV === 'production') {
            return `/api/shortlinks/${encodeURIComponent(code)}`;
          }

          // Dev/E2E: call the backend explicitly so it can set cookies.
          const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
          const trimmed = raw.replace(/\/+$/, '');
          const base = trimmed ? (trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`) : '/api';
          return `${base}/shortlinks/${encodeURIComponent(code)}`;
        };

        const url = buildShortlinkUrl();

        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          if (!cancelled) router.replace(initialTarget);
          return;
        }

        const data: any = await res.json();
        const slug = data && data.invitationSlug;
        if (typeof slug === 'string' && slug.length > 0) {
          if (!cancelled) router.replace(`/i/${slug}`);
          return;
        }

        if (!cancelled) router.replace(initialTarget);
      } catch {
        if (!cancelled && initialTarget) router.replace(initialTarget);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [code, initialTarget, router]);

  return null;
}
