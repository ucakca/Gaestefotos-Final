'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { 
  LogOut, 
  Home
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  backUrl?: string;
}

export default function AppLayout({ children, showBackButton, backUrl }: AppLayoutProps) {
  const pathname = usePathname();
  const { user, logout, loadUser } = useAuthStore();

  useEffect(() => {
    // Cookie-based session: load user once so UI (e.g. admin button) can render based on role.
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const isEventPage = pathname?.includes('/events/');
  const eventId = pathname?.match(/\/events\/([^\/]+)/)?.[1];

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Consistent Header */}
      <header className="sticky top-0 z-40 border-b border-app-border bg-app-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button */}
            <div className="flex items-center gap-4 flex-1">
              {showBackButton && backUrl ? (
                <Link
                  href={backUrl}
                  className="rounded-lg p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-app-fg"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              ) : (
                pathname !== '/dashboard' && (
                  <Link
                    href="/dashboard"
                    className="rounded-lg p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-app-fg"
                    title="Zur Übersicht"
                  >
                    <Home className="w-5 h-5" />
                  </Link>
                )
              )}
              
              {isEventPage && eventId && (
                <div className="hidden md:flex items-center gap-2 text-sm text-app-muted">
                  <span>/</span>
                  <Link 
                    href={`/events/${eventId}/dashboard`}
                    className="transition-colors hover:text-app-fg"
                  >
                    Event verwalten
                  </Link>
                </div>
              )}
            </div>

            {/* Center: Logo */}
            <div className="flex-1 flex justify-center">
              <Link href="/dashboard" className="flex items-center">
                <img 
                  src="/images/logo.webp" 
                  alt="Gästefotos" 
                  className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[150px] md:max-w-[180px]"
                />
              </Link>
            </div>

            {/* Right: User Actions */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              {user && (
                <div className="flex items-center gap-2 border-l border-app-border pl-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-app-muted">Angemeldet als</p>
                    <p className="text-sm font-medium text-app-fg">{user.name || user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-lg p-2 text-app-muted transition-colors hover:bg-app-bg hover:text-app-fg"
                    title="Abmelden"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {children}
      </main>
    </div>
  );
}


