'use client';

import { motion } from 'framer-motion';
import { 
  Share2, 
  QrCode, 
  Image, 
  Video, 
  Users, 
  Palette, 
  Trophy, 
  MessageSquare,
  Settings,
  ExternalLink,
  Monitor
} from 'lucide-react';
import Link from 'next/link';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface QuickActionsProps {
  eventId: string;
  eventSlug: string;
  onShare?: () => void;
  onQrCode?: () => void;
}

export default function QuickActions({ eventId, eventSlug, onShare, onQrCode }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      label: 'Teilen',
      icon: <Share2 className="w-5 h-5" />,
      onClick: onShare,
      variant: 'primary',
    },
    {
      label: 'QR-Code',
      icon: <QrCode className="w-5 h-5" />,
      onClick: onQrCode,
    },
    {
      label: 'Fotos',
      icon: <Image className="w-5 h-5" />,
      href: `/events/${eventId}/photos`,
    },
    {
      label: 'Videos',
      icon: <Video className="w-5 h-5" />,
      href: `/events/${eventId}/videos`,
    },
    {
      label: 'Gäste',
      icon: <Users className="w-5 h-5" />,
      href: `/events/${eventId}/guests`,
    },
    {
      label: 'Design',
      icon: <Palette className="w-5 h-5" />,
      href: `/events/${eventId}/design`,
    },
    {
      label: 'Challenges',
      icon: <Trophy className="w-5 h-5" />,
      href: `/events/${eventId}/challenges`,
    },
    {
      label: 'Gästebuch',
      icon: <MessageSquare className="w-5 h-5" />,
      href: `/events/${eventId}/guestbook`,
    },
    {
      label: 'Live-Wall',
      icon: <Monitor className="w-5 h-5" />,
      href: `/events/${eventId}/live-wall`,
    },
    {
      label: 'Vorschau',
      icon: <ExternalLink className="w-5 h-5" />,
      href: `/e3/${eventSlug}`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-app-card border border-app-border rounded-2xl p-4"
    >
      <h3 className="text-sm font-semibold text-app-fg mb-4">Schnellzugriff</h3>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {actions.map((action, index) => {
          const isButton = !!action.onClick;
          const Component = isButton ? 'button' : Link;
          const props = isButton 
            ? { onClick: action.onClick, type: 'button' as const }
            : { href: action.href || '#' };

          return (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Component
                {...props as any}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-app-bg ${
                  action.variant === 'primary' 
                    ? 'bg-app-accent/10 text-app-accent hover:bg-app-accent/20' 
                    : 'text-app-muted hover:text-app-fg'
                }`}
              >
                {action.icon}
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {action.label}
                </span>
              </Component>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
