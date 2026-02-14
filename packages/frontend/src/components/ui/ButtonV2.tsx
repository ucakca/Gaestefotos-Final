'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'btn-festive text-white shadow-lg hover:shadow-xl',
        secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 shadow-sm hover:shadow-md',
        outline: 'bg-background text-foreground border border-border hover:bg-accent/10 hover:border-primary/50 shadow-sm',
        ghost: 'bg-transparent text-foreground hover:bg-accent/10',
        danger: 'bg-destructive text-destructive-foreground hover:brightness-105 shadow-md hover:shadow-lg',
        link: 'bg-transparent text-primary underline-offset-4 hover:underline shadow-none',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      asChild = false,
      type = 'button',
      ...props
    },
    ref
  ) {
    const Comp = asChild ? Slot : 'button';

    const content = loading ? (
      <>
        <Spinner className="w-4 h-4 mr-2" />
        <span className="opacity-70">{children}</span>
      </>
    ) : (
      <>
        {leftIcon && <span className="mr-2 flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2 flex-shrink-0">{rightIcon}</span>}
      </>
    );

    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
