'use client';

import { cn } from '@/lib/utils';

interface ModernCardProps {
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  hover?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ModernCard({
  variant = 'default',
  hover = false,
  onClick,
  children,
  className,
}: ModernCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-6',
        {
          'bg-card border border-border shadow-sm': variant === 'default',
          'backdrop-blur-xl border border-border/50 bg-card/70 shadow-md': variant === 'glass',
          'bg-gradient-to-br from-card via-card to-primary/5 border border-border/50 shadow-md': variant === 'gradient',
          'bg-card shadow-xl border-0': variant === 'elevated',
        },
        hover && 'hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer',
        onClick && !hover && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
