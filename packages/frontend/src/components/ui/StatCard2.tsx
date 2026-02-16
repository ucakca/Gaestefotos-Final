'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCard2Props {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: { value: string; positive: boolean };
  gradient?: string;
  onClick?: () => void;
  className?: string;
}

export function StatCard2({
  icon: Icon,
  label,
  value,
  change,
  gradient,
  onClick,
  className,
}: StatCard2Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                'text-xs font-medium mt-1.5',
                change.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {change.positive ? '↑' : '↓'} {change.value}
            </p>
          )}
        </div>
        <div
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform',
            gradient ? `bg-gradient-to-br ${gradient}` : 'bg-gradient-to-br from-primary to-primary/80'
          )}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}
