'use client';

import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sage-50 to-terracotta-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-card rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-terracotta-100 dark:bg-terracotta-900/30 rounded-full flex items-center justify-center">
              <Search className="w-10 h-10 text-terracotta-500" />
            </div>
          </div>

          <h1 className="text-6xl font-bold text-terracotta-500 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            Seite nicht gefunden
          </h2>
          <p className="text-muted-foreground mb-8">
            Die Seite, die du suchst, existiert nicht oder wurde verschoben.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
              Zurück
            </button>

            <Link
              href="/"
              className="w-full bg-muted/80 hover:bg-muted/60 text-foreground font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Home className="w-5 h-5" />
              Zur Startseite
            </Link>
          </div>
        </div>

        <p className="mt-6 text-muted-foreground text-sm">
          Hast du einen QR-Code gescannt? Prüfe, ob der Link korrekt ist.
        </p>
      </div>
    </div>
  );
}
