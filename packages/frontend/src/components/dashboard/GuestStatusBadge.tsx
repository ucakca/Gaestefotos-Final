'use client';

import { motion } from 'framer-motion';
import { Check, X, Clock, HelpCircle } from 'lucide-react';

/**
 * GuestStatusBadge - v0-Style Status Badge mit Icons
 * 
 * Ersetzt einfache Text-Badges mit animierten Icon-Badges
 */

export type GuestStatus = 'ZUSAGE' | 'ABSAGE' | 'AUSSTEHEND' | 'UNBEKANNT';

export interface GuestStatusBadgeProps {
  status: GuestStatus;
  onClick?: () => void;
  className?: string;
}

const STATUS_CONFIG = {
  ZUSAGE: {
    icon: Check,
    label: 'Zusage',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    hoverColor: 'hover:bg-green-500/20',
  },
  ABSAGE: {
    icon: X,
    label: 'Absage',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    hoverColor: 'hover:bg-red-500/20',
  },
  AUSSTEHEND: {
    icon: Clock,
    label: 'Ausstehend',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    hoverColor: 'hover:bg-yellow-500/20',
  },
  UNBEKANNT: {
    icon: HelpCircle,
    label: 'Unbekannt',
    color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    hoverColor: 'hover:bg-gray-500/20',
  },
};

export default function GuestStatusBadge({
  status,
  onClick,
  className = '',
}: GuestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNBEKANNT;
  const Icon = config.icon;

  const Component = onClick ? motion.button : motion.div;

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${config.color} ${
        onClick ? `cursor-pointer ${config.hoverColor}` : ''
      } ${className}`}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </Component>
  );
}
