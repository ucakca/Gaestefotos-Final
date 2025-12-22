'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Settings, 
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
    <div className="min-h-screen bg-gray-50">
      {/* Consistent Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back Button */}
            <div className="flex items-center gap-4 flex-1">
              {showBackButton && backUrl ? (
                <Link
                  href={backUrl}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              ) : (
                pathname !== '/dashboard' && (
                  <Link
                    href="/dashboard"
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                    title="Zur Übersicht"
                  >
                    <Home className="w-5 h-5" />
                  </Link>
                )
              )}
              
              {isEventPage && eventId && (
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                  <span>/</span>
                  <Link 
                    href={`/events/${eventId}/dashboard`}
                    className="hover:text-gray-900 transition-colors"
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
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-gray-500">Angemeldet als</p>
                    <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
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


