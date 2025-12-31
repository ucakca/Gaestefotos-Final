'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Server,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAdminAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'System', href: '/system', icon: Server },
  { name: 'Benutzer', href: '/users', icon: Users },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Einstellungen', href: '/settings', icon: Settings },
];

export default function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, admin } = useAdminAuthStore();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    router.push('/login');
  };

  return (
    <div className={cn('flex w-64 flex-col bg-tokens-brandDark text-white', className)}>
      <div className="flex h-16 items-center justify-center border-b border-black/20">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.name}
              asChild
              variant="ghost"
              className={cn(
                'w-full justify-start px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-app-accent text-black hover:bg-app-accent/90' : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Link href={item.href} onClick={() => onNavigate?.()}>
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
      <div className="border-t border-black/20 p-4">
        {admin && (
          <div className="mb-2 px-3 py-2 text-xs text-white/60">
            <p className="font-medium text-white/80">{admin.name}</p>
            <p className="text-white/50">{admin.email}</p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          <span>Abmelden</span>
        </Button>
      </div>
    </div>
  );
}

