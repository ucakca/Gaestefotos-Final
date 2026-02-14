'use client';

import { motion } from 'framer-motion';
import { Camera, Users, Clock, BarChart3, Image, Video, MessageSquare, Trophy } from 'lucide-react';
import Link from 'next/link';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  color?: string;
  trend?: { value: number; isUp: boolean };
}

interface StatsGridProps {
  stats: StatItem[];
  eventId: string;
}

const iconColors: Record<string, string> = {
  photos: 'bg-blue-500/10 text-blue-500',
  guests: 'bg-green-500/10 text-green-500',
  pending: 'bg-yellow-500/10 text-yellow-500',
  storage: 'bg-purple-500/10 text-purple-500',
  videos: 'bg-pink-500/10 text-pink-500',
  comments: 'bg-orange-500/10 text-orange-500',
  challenges: 'bg-indigo-500/10 text-indigo-500',
};

export default function StatsGrid({ stats, eventId }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((stat, index) => {
        const Wrapper = stat.href ? Link : 'div';
        const wrapperProps = stat.href ? { href: stat.href } : {};

        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Wrapper
              {...wrapperProps as any}
              className={`block rounded-2xl border border-border bg-card p-4 ${stat.href ? 'hover:bg-card/80 hover:border-app-accent/30 transition-all cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color || 'bg-app-accent/10 text-app-accent'}`}>
                  {stat.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-foreground truncate">{stat.value}</div>
                  <div className="text-xs text-muted-foreground truncate">{stat.label}</div>
                </div>
              </div>
              {stat.trend && (
                <div className={`mt-2 text-xs ${stat.trend.isUp ? 'text-green-500' : 'text-red-500'}`}>
                  {stat.trend.isUp ? '↑' : '↓'} {stat.trend.value}% heute
                </div>
              )}
            </Wrapper>
          </motion.div>
        );
      })}
    </div>
  );
}

export function createDefaultStats(
  eventId: string,
  photoCount: number,
  guestCount: number,
  pendingCount: number,
  storageUsed: string
): StatItem[] {
  return [
    {
      label: 'Fotos',
      value: photoCount,
      icon: <Camera className="w-5 h-5" />,
      href: `/events/${eventId}/photos`,
      color: iconColors.photos,
    },
    {
      label: 'Gäste',
      value: guestCount,
      icon: <Users className="w-5 h-5" />,
      href: `/events/${eventId}/guests`,
      color: iconColors.guests,
    },
    {
      label: 'Ausstehend',
      value: pendingCount,
      icon: <Clock className="w-5 h-5" />,
      color: iconColors.pending,
    },
    {
      label: 'Speicher',
      value: storageUsed,
      icon: <BarChart3 className="w-5 h-5" />,
      href: `/events/${eventId}/statistics`,
      color: iconColors.storage,
    },
  ];
}
