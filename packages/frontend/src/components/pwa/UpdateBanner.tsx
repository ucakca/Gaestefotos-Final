'use client';

import { RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
      <div className="bg-brand-primary text-white rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Update verfügbar</p>
            <p className="text-white/80 text-xs mt-0.5">
              Eine neue Version ist bereit zur Installation.
            </p>
            <button
              onClick={onUpdate}
              className="mt-2 px-3 py-1.5 bg-white text-brand-primary rounded-lg text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Jetzt aktualisieren
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/60 hover:text-white p-1"
            aria-label="Schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
