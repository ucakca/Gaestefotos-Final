'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const base =
  'w-full rounded-lg border border-app-border bg-app-card px-4 py-2.5 text-sm text-app-fg transition-colors focus:outline-none focus:ring-1 focus:ring-tokens-brandGreen/30 focus:border-tokens-brandGreen disabled:opacity-50 disabled:pointer-events-none';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className = '', ...props }, ref) {
  return <input ref={ref} className={`${base} ${className}`} {...props} />;
});
