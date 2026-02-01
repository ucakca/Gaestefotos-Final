'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminAuthStore } from '@/store/authStore';
import SidebarV2, { MobileSidebar } from './SidebarV2';
import { cn } from '@/lib/utils';

interface AdminShellV2Props {
  children: React.ReactNode;
  className?: string;
}

export default function AdminShellV2({ children, className }: AdminShellV2Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, hasHydrated } = useAdminAuthStore();

  useEffect(() => {
    if (hasHydrated && !token && pathname !== '/login') {
      router.push('/login');
    }
  }, [token, hasHydrated, pathname, router]);

  // Show nothing while hydrating
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-app-muted">Lade...</p>
        </div>
      </div>
    );
  }

  // Login page doesn't need shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Not authenticated
  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-app-bg">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <SidebarV2 />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Main Content */}
      <main className={cn('flex-1 min-h-screen overflow-auto', className)}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
