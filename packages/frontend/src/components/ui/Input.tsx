'use client';

import { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

const base =
  'w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 disabled:pointer-events-none';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(base, className)} {...props} />;
});

Input.displayName = 'Input';
