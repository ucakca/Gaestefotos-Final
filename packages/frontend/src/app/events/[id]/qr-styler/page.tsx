'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { use } from 'react';

// Dynamically import the client component with SSR completely disabled
// This prevents ALL hydration issues since the component never renders on the server
const QrStylerClient = dynamic(
  () => import('./QrStylerClient'),
  { 
    ssr: false,
    loading: () => (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm text-gray-500">QR-Designer wird geladen...</span>
          </div>
        </div>
      </AppLayout>
    )
  }
);

export default function QrStylerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <QrStylerClient eventId={id} />;
}
