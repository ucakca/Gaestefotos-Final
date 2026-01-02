'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type Variant = 'ghost' | 'glass' | 'danger';

type Size = 'sm' | 'md' | 'lg';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/30 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        ghost: 'bg-transparent text-app-fg hover:bg-app-bg',
        glass: 'bg-app-card/10 text-app-bg hover:bg-app-card/15',
        danger: 'bg-[var(--status-danger)] text-app-bg hover:opacity-90',
      },
      size: {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-11 h-11',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
);

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    icon: ReactNode;
    asChild?: boolean;
    'aria-label': string;
    title: string;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, icon, variant, size, asChild = false, type = 'button', ...props },
  ref
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      {...(!asChild ? { type } : {})}
      className={cn(iconButtonVariants({ variant, size, className }))}
      {...props}
    >
      {icon}
    </Comp>
  );
});

IconButton.displayName = 'IconButton';
