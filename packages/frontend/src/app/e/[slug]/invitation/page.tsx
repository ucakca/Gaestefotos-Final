'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    router.replace(`/i/${slug}`);
  }, [slug]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Weiterleitung…</div>
    </div>
  );
}
