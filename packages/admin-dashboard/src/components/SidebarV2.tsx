'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Package,
  UserCog,
  Server,
  FileText,
  Bot,
  Palette,
  Settings,
  KeyRound,
  Wrench,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  LogOut,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react';
import { useAdminAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

const navigation: NavGroup[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { name: 'Übersicht', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    name: 'Verwaltung',
    icon: Users,
    items: [
      { name: 'Benutzer', href: '/manage/users', icon: Users },
      { name: 'Events', href: '/manage/events', icon: Calendar },
      { name: 'Pakete', href: '/manage/packages', icon: Package },
      { name: 'Impersonation', href: '/manage/impersonation', icon: UserCog },
    ],
  },
  {
    name: 'System',
    icon: Server,
    items: [
      { name: 'Health', href: '/system/health', icon: Server },
      { name: 'Logs', href: '/system/logs', icon: FileText },
      { name: 'AI Analyse', href: '/system/ai-analyse', icon: Bot },
    ],
  },
  {
    name: 'Design',
    icon: Palette,
    items: [
      { name: 'Theme', href: '/design/theme', icon: Palette },
    ],
  },
  {
    name: 'Einstellungen',
    icon: Settings,
    items: [
      { name: 'Allgemein', href: '/settings/general', icon: Settings },
      { name: 'API Keys', href: '/settings/api-keys', icon: KeyRound },
      { name: 'Maintenance', href: '/settings/maintenance', icon: Wrench },
      { name: 'Woo Inbox', href: '/settings/woo', icon: ShoppingCart },
    ],
  },
];

function NavGroupComponent({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isGroupActive = group.items.some((item) => pathname.startsWith(item.href));
  const [isOpen, setIsOpen] = useState(group.defaultOpen || isGroupActive);

  // Single item group (like Dashboard)
  if (group.items.length === 1) {
    const item = group.items[0];
    const isActive = pathname === item.href;
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-app-accent text-white shadow-sm'
            : 'text-app-muted hover:bg-app-accent/10 hover:text-app-fg'
        )}
      >
        <group.icon className={cn('h-4 w-4', isActive ? '' : 'opacity-70')} />
        <span>{group.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
          isGroupActive
            ? 'bg-app-accent/10 text-app-fg'
            : 'text-app-muted hover:bg-app-accent/5 hover:text-app-fg'
        )}
      >
        <div className="flex items-center gap-3">
          <group.icon className={cn('h-4 w-4', isGroupActive ? 'text-app-accent' : 'opacity-70')} />
          <span>{group.name}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 opacity-50" />
        ) : (
          <ChevronRight className="h-4 w-4 opacity-50" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 pl-3 border-l border-app-border/50 space-y-1">
          {group.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-app-accent text-white shadow-sm'
                    : 'text-app-muted hover:bg-app-accent/10 hover:text-app-fg'
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive ? '' : 'opacity-70')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SidebarV2({
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

  const handleReload = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.href = url.toString();
  };

  return (
    <div className={cn('flex min-h-0 w-64 flex-col bg-app-card text-app-fg border-r border-app-border/50', className)}>
      {/* Header */}
      <div className="flex h-16 items-center justify-center border-b border-app-border/50 bg-gradient-to-r from-app-accent/5 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-app-accent/10 flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-app-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Admin</h1>
            <p className="text-[10px] text-app-muted -mt-0.5">dash.gästefotos.com</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {navigation.map((group) => (
          <NavGroupComponent
            key={group.name}
            group={group}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-app-border/50 p-3 space-y-3">
        {admin && (
          <div className="rounded-xl bg-app-bg/50 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-app-accent/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-app-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-app-fg truncate">{admin.name}</p>
                <p className="text-xs text-app-muted truncate">{admin.email}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleReload}
          variant="outline"
          size="sm"
          className="w-full h-9 rounded-lg text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Cache leeren
        </Button>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start px-3 py-2.5 text-sm font-medium text-app-muted hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Abmelden</span>
        </Button>
      </div>
    </div>
  );
}

// Mobile Sidebar Wrapper
export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-app-card border border-app-border shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="relative h-full">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-app-bg"
          >
            <X className="w-5 h-5" />
          </button>
          <SidebarV2 onNavigate={() => setIsOpen(false)} />
        </div>
      </div>
    </>
  );
}
