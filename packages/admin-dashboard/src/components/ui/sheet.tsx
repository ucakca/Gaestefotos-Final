'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export const SheetPortal = SheetPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(function SheetOverlay({ className, ...props }, ref) {
  return (
    <SheetPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-app-fg/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    />
  );
});

SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    side?: 'top' | 'bottom' | 'left' | 'right';
  }
>(function SheetContent({ side = 'right', className, children, ...props }, ref) {
  const ariaDescribedBy = (props as any)?.['aria-describedby'];
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 gap-4 bg-app-fg text-[var(--app-on-dark)] shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          side === 'left' &&
            'inset-y-0 left-0 h-full w-80 max-w-[85vw] border-r border-app-border/40 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
          side === 'right' &&
            'inset-y-0 right-0 h-full w-80 max-w-[85vw] border-l border-app-border/40 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          side === 'top' &&
            'inset-x-0 top-0 w-full border-b border-app-border/40 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          side === 'bottom' &&
            'inset-x-0 bottom-0 w-full border-t border-app-border/40 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          className
        )}
        aria-describedby={ariaDescribedBy ?? undefined}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">Dialog</SheetPrimitive.Title>
        {children}
        <SheetClose className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/30 disabled:pointer-events-none">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});

SheetContent.displayName = SheetPrimitive.Content.displayName;
