'use client';

import { Crown, Sparkles, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'crown' | 'sparkles' | 'zap' | 'lock';
  label?: string;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

export function ProBadge({
  size = 'md',
  variant = 'crown',
  label = 'PRO',
  animated = true,
  onClick,
  className = '',
}: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const Icon = {
    crown: Crown,
    sparkles: Sparkles,
    zap: Zap,
    lock: Lock,
  }[variant];

  const content = (
    <div
      className={`
        inline-flex items-center font-semibold rounded-full
        bg-gradient-to-r from-amber-400 to-orange-500
        text-white shadow-lg
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-105 transition-all' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <Icon className={iconSizes[size]} />
      <span>{label}</span>
    </div>
  );

  if (animated && !onClick) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
