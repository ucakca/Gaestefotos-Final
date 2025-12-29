'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { cn } from '@/lib/utils';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-app-bg text-app-fg">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <Sidebar className="h-screen" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-app-border bg-app-bg/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-app-border bg-app-card"
            aria-label="Menü öffnen"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Admin</div>
            <div className="truncate text-xs text-app-muted">{pathname}</div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">{children}</main>
      </div>

      <div className={cn('fixed inset-0 z-50 lg:hidden', mobileOpen ? '' : 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            'absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-gray-900 text-white shadow-xl transition-transform',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-gray-800 px-3">
            <div className="text-sm font-semibold">Admin Dashboard</div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-800"
              aria-label="Menü schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <Sidebar className="h-[calc(100vh-3.5rem)]" onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    </div>
  );
}
