'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Grid3x3,
  BookOpen,
  Mail,
  Palette,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DashboardFooterProps {
  eventId: string;
  eventSlug?: string;
}

export default function DashboardFooter({ eventId, eventSlug }: DashboardFooterProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: `/events/${eventId}/dashboard`,
    },
    {
      id: 'photos',
      label: 'Fotos',
      icon: Grid3x3,
      path: `/events/${eventId}/photos`,
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: Video,
      path: `/events/${eventId}/videos`,
    },
    {
      id: 'guestbook',
      label: 'Gästebuch',
      icon: BookOpen,
      path: `/events/${eventId}/guestbook`,
    },
    {
      id: 'invitation',
      label: 'Einladung',
      icon: Mail,
      path: eventSlug ? `/e2/${eventSlug}/invite` : `/events/${eventId}/dashboard`,
    },
    {
      id: 'design',
      label: 'Design',
      icon: Palette,
      path: `/events/${eventId}/design`,
    },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-app-card/90 backdrop-blur border-t border-app-border z-50 safe-area-bottom pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_color-mix(in_srgb,var(--app-fg)_6%,transparent)]"
    >
      {/* Horizontal Scrollable Menu */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-4 py-3 min-w-max">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Button
                key={item.id}
                asChild
                variant={active ? 'primary' : 'ghost'}
                size="sm"
                className={`h-auto flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[70px] ${
                  active ? 'shadow-md' : 'text-app-muted'
                }`}
              >
                <Link href={item.path}>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
      
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
