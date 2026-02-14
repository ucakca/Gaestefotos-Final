'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ className, label, error, helperText, ...props }, ref) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-destructive focus-visible:ring-destructive/30'
              : 'border-input hover:border-border/80',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${props.id}-error`} className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${props.id}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
