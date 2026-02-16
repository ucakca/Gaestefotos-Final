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
          'bg-app-surface border border-app-border shadow-soft': variant === 'default',
          'glass-card shadow-medium': variant === 'glass',
          'gradient-card border border-app-border/50 shadow-medium': variant === 'gradient',
          'bg-app-surface shadow-strong border-0': variant === 'elevated',
        },
        hover && 'hover-lift cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
