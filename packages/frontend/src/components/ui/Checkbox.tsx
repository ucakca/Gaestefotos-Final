'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, onCheckedChange, onChange, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      onChange={(e) => {
        onCheckedChange?.(e.target.checked);
        onChange?.(e);
      }}
      {...props}
      style={{ accentColor: 'var(--primary)' }}
    />
  );
});

Checkbox.displayName = 'Checkbox';
