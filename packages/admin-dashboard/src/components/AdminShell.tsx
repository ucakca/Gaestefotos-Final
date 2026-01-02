'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 p-0"
            aria-label="Menü öffnen"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">Admin</div>
            <div className="truncate text-xs text-app-muted">{pathname}</div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto bg-app-bg p-4 sm:p-6">{children}</main>
      </div>

      <div className={cn('lg:hidden', mobileOpen ? '' : 'pointer-events-none')}>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0">
            <div className="flex h-14 items-center justify-between border-b border-app-border/40 px-3">
              <div className="text-sm font-semibold">Admin Dashboard</div>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileOpen(false)}
                  className="h-10 w-10 p-0 text-[var(--app-on-dark)] hover:bg-app-card/10"
                  aria-label="Menü schließen"
                >
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>

            <Sidebar className="h-[calc(100vh-3.5rem)]" onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
