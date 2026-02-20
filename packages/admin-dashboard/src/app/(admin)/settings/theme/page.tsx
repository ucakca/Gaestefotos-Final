'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ThemeSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/design/theme');
  }, [router]);

  return (
    <div className="flex items-center justify-center py-12 text-app-muted">
      Weiterleitung zu Theme-Einstellungen...
    </div>
  );
}
