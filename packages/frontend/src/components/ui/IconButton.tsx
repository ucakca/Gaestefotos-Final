'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'ghost' | 'glass' | 'danger';

type Size = 'sm' | 'md' | 'lg';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  variant?: Variant;
  size?: Size;
};

const base =
  'inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/30 disabled:opacity-50 disabled:pointer-events-none';

const variantClasses: Record<Variant, string> = {
  ghost: 'bg-transparent text-app-fg hover:bg-app-bg',
  glass: 'bg-app-card/10 text-app-bg hover:bg-app-card/15',
  danger: 'bg-[var(--status-danger)] text-app-bg hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-11 h-11',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className = '', icon, variant = 'ghost', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
});
