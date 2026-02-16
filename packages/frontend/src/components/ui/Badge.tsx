'use client';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'secondary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-muted/50 text-muted-foreground border-border',
  success: 'bg-success/15 text-emerald-600 dark:text-emerald-400 border-success/30',
  warning: 'bg-warning/15 text-amber-600 dark:text-amber-400 border-warning/30',
  error: 'bg-destructive/15 text-red-600 dark:text-red-400 border-destructive/30',
  info: 'bg-info/15 text-blue-600 dark:text-blue-400 border-info/30',
  accent: 'bg-primary/15 text-primary border-primary/30',
  secondary: 'bg-purple-500/15 text-violet-600 dark:text-violet-400 border-purple-500/30',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
