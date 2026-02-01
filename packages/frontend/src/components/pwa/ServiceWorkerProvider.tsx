'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { UpdateBanner } from './UpdateBanner';

export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const { updateAvailable, skipWaiting } = useServiceWorker();

  return (
    <>
      {children}
      {updateAvailable && <UpdateBanner onUpdate={skipWaiting} />}
    </>
  );
}
