'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const didInitRef = useRef(false);

  const { isAuthenticated, loading, loadUser } = useAuthStore();

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return <FullPageLoader label="Wird geladen..." />;
  }

  return <>{children}</>;
}
