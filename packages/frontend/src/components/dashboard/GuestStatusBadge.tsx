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
    color: 'bg-success/100/10 text-success border-success/20',
    hoverColor: 'hover:bg-success/100/20',
  },
  ABSAGE: {
    icon: X,
    label: 'Absage',
    color: 'bg-destructive/100/10 text-destructive border-destructive/20',
    hoverColor: 'hover:bg-destructive/100/20',
  },
  AUSSTEHEND: {
    icon: Clock,
    label: 'Ausstehend',
    color: 'bg-warning/10 text-warning border-yellow-500/20',
    hoverColor: 'hover:bg-warning/20',
  },
  UNBEKANNT: {
    icon: HelpCircle,
    label: 'Unbekannt',
    color: 'bg-muted/500/10 text-muted-foreground border-border/20',
    hoverColor: 'hover:bg-muted/500/20',
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
