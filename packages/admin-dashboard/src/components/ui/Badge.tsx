import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent' | 'secondary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-app-muted/15 text-app-muted border-app-muted/30',
  success: 'bg-app-success/15 text-emerald-600 dark:text-emerald-400 border-app-success/30',
  warning: 'bg-app-warning/15 text-amber-600 dark:text-amber-400 border-app-warning/30',
  error: 'bg-app-error/15 text-red-600 dark:text-red-400 border-app-error/30',
  info: 'bg-app-info/15 text-blue-600 dark:text-blue-400 border-app-info/30',
  accent: 'bg-app-accent/15 text-app-accent border-app-accent/30',
  secondary: 'bg-app-secondary/15 text-violet-600 dark:text-violet-400 border-app-secondary/30',
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
