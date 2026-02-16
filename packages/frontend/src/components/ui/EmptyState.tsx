import type { HTMLAttributes, ReactNode } from 'react';

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon, title, description, action, className = '', ...props }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`} {...props}>
      {icon ? (
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
          <div className="text-4xl">{icon}</div>
        </div>
      ) : null}
      <div className="text-xl text-foreground mb-2 font-bold">{title}</div>
      {description ? <div className="text-muted-foreground text-sm max-w-sm mx-auto mb-6 leading-relaxed">{description}</div> : null}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
