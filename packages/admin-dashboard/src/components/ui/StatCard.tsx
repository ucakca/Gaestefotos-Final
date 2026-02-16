import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: { value: string; positive: boolean };
  gradient?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  gradient,
  className,
}: StatCardProps) {
  return (
    <div className={cn('glass-card rounded-2xl p-5 hover-lift', className)}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-app-muted mb-1 truncate">{label}</p>
          <p className="text-2xl font-bold text-app-fg">{value}</p>
          {change && (
            <p
              className={cn(
                'text-xs font-medium mt-1.5',
                change.positive ? 'text-app-success' : 'text-app-error'
              )}
            >
              {change.positive ? '↑' : '↓'} {change.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
            gradient ? `bg-gradient-to-br ${gradient}` : 'bg-app-accent'
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
