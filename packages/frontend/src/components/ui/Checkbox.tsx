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
        'h-4 w-4 rounded border border-app-border bg-app-card accent-tokens-brandGreen focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen/30 disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      onChange={(e) => {
        onCheckedChange?.(e.target.checked);
        onChange?.(e);
      }}
      {...props}
    />
  );
});

Checkbox.displayName = 'Checkbox';
