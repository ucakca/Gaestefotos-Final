'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 accent-tokens-brandGreen focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen/30 disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
    />
  );
});

Radio.displayName = 'Radio';
