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
        const res = await fetch(`/api/shortlinks/${encodeURIComponent(code)}`, {
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
