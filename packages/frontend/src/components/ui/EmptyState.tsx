import type { HTMLAttributes, ReactNode } from 'react';

export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

export function EmptyState({ icon, title, description, className = '', ...props }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-32 px-4 text-center ${className}`} {...props}>
      {icon ? <div className="text-6xl mb-4">{icon}</div> : null}
      <div className="text-xl text-gray-900 mb-2 font-semibold">{title}</div>
      {description ? <div className="text-gray-500 text-sm max-w-sm">{description}</div> : null}
    </div>
  );
}
