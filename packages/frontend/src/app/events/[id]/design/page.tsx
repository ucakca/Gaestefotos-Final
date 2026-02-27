'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

// Legacy design page — always redirects to setup wizard or dashboard
export default function DesignLiveBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  React.useEffect(() => {
    params.then(p => {
      router.replace(`/setup?eventId=${p.id}`);
    });
  }, [router]);

  return <FullPageLoader label="Weiterleitung..." />;
}