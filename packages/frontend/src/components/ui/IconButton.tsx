'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.95]',
  {
    variants: {
      variant: {
        ghost: 'bg-transparent text-foreground hover:bg-accent/10',
        primary: 'bg-primary text-primary-foreground hover:brightness-105 shadow-md',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border',
        outline: 'bg-background text-foreground border border-border hover:bg-accent/10 hover:border-primary/50',
        glass: 'bg-card/10 text-foreground hover:bg-card/20 backdrop-blur-sm border border-border/50',
        danger: 'bg-destructive text-destructive-foreground hover:brightness-105 shadow-md',
      },
      size: {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-11 h-11',
        xl: 'w-12 h-12',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
    },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: ReactNode;
  asChild?: boolean;
  'aria-label': string;
  title: string;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, icon, variant, size, loading, asChild = false, type = 'button', ...props },
    ref
  ) {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        {...(!asChild ? { type } : {})}
        disabled={loading || props.disabled}
        className={cn(iconButtonVariants({ variant, size, className }))}
        {...props}
      >
        {loading ? <Spinner className="w-4 h-4" /> : icon}
      </Comp>
    );
  }
);

IconButton.displayName = 'IconButton';
