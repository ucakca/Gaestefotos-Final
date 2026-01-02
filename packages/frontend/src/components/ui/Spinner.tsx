import type { HTMLAttributes } from 'react';

export type SpinnerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function Spinner({ size = 'md', className = '', ...props }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      title="Loading"
      className={`inline-block ${sizeClasses[size]} animate-spin rounded-full border-2 border-app-border border-t-app-fg ${className}`}
      {...props}
    />
  );
}
