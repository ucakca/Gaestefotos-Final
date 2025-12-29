'use client';

import { motion } from 'framer-motion';
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
      path: eventSlug ? `/e2/${eventSlug}/invitation` : `/events/${eventId}/dashboard`,
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
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Horizontal Scrollable Menu */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-4 py-3 min-w-max">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link key={item.id} href={item.path} className="flex-shrink-0">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[70px] ${
                    active
                      ? 'bg-black text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className={`text-xs font-medium whitespace-nowrap ${
                    active ? 'text-white' : 'text-gray-600'
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
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
    </motion.div>
  );
}
