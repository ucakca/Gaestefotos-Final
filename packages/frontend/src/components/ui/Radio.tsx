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
        'h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:opacity-50 disabled:pointer-events-none',
        className
      )}
      {...props}
      style={{ accentColor: 'var(--primary)' }}
    />
  );
});

Radio.displayName = 'Radio';
