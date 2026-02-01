'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface-secondary">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-surface-tertiary flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-text-secondary" />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Du bist offline
        </h1>
        
        <p className="text-text-secondary mb-6">
          Keine Internetverbindung verfügbar. Bitte überprüfe deine Verbindung und versuche es erneut.
        </p>
        
        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </Button>
        
        <div className="mt-8 p-4 bg-surface-primary rounded-xl">
          <p className="text-sm text-text-secondary">
            <strong className="text-text-primary">Tipp:</strong> Bereits geladene Fotos und Seiten sind weiterhin verfügbar.
          </p>
        </div>
      </div>
    </div>
  );
}
