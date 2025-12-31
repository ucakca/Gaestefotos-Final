'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const base =
  'w-full rounded-lg border border-app-border bg-app-card px-4 py-2.5 text-sm text-app-fg transition-colors focus:border-app-fg focus:outline-none focus:ring-1 focus:ring-app-fg/30 disabled:pointer-events-none disabled:opacity-50';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});

Input.displayName = 'Input';
