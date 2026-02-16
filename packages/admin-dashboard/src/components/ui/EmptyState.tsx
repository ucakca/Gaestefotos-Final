import { LucideIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon || Plus;

  return (
    <div className={cn('text-center py-16 px-4', className)}>
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-app-accent/20 to-app-secondary/20 flex items-center justify-center">
        <Icon className="w-10 h-10 text-app-accent" />
      </div>

      <h3 className="text-xl font-bold text-app-fg mb-2">{title}</h3>
      <p className="text-app-muted max-w-sm mx-auto mb-6 text-sm leading-relaxed">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-app-accent hover:bg-app-accent-hover text-white font-medium text-sm transition-all hover:shadow-glow"
        >
          <ActionIcon className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
