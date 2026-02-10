'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  React.useEffect(() => {
    params.then(p => {
      router.replace(`/events/${p.id}/dashboard?tab=setup`);
    });
  }, [router]);

  return <FullPageLoader label="Weiterleitung..." />;
}
