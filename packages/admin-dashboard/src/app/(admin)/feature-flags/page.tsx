'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeatureFlagsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manage/packages');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12 text-app-muted">
      Weiterleitung zu Pakete & Features...
    </div>
  );
}
