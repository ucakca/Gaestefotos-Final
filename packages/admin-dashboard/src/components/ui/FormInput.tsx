'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const base =
  'w-full rounded-lg border bg-app-card px-4 py-2.5 text-sm text-app-fg transition-colors focus:outline-none focus:ring-1 disabled:pointer-events-none disabled:opacity-50';

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  function FormInput({ className, label, error, helperText, ...props }, ref) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-app-fg">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            base,
            error
              ? 'border-destructive focus:ring-destructive/30'
              : 'border-app-border focus:border-app-fg focus:ring-app-fg/30',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-sm text-app-muted">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
