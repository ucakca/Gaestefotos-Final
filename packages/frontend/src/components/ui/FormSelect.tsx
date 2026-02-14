'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface FormSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: FormSelectOption[];
  placeholder?: string;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  function FormSelect(
    { className, label, error, helperText, options, placeholder, ...props },
    ref
  ) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground transition-colors appearance-none',
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
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

FormSelect.displayName = 'FormSelect';
