'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  indeterminate?: boolean;
}

export const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  function FormCheckbox(
    { className, label, error, helperText, indeterminate, ...props },
    ref
  ) {
    return (
      <div className="space-y-1.5">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              ref={(el) => {
                if (el) {
                  el.indeterminate = indeterminate ?? false;
                }
                if (typeof ref === 'function') {
                  ref(el);
                } else if (ref) {
                  (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
                }
              }}
              className={cn(
                'peer h-5 w-5 cursor-pointer appearance-none rounded border transition-all',
                'checked:bg-primary checked:border-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error
                  ? 'border-destructive'
                  : 'border-input hover:border-border',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              {...props}
            />
            <Check className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none" />
          </div>
          {label && (
            <span className="text-sm text-foreground">
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </span>
          )}
        </label>
        {error && (
          <p className="text-sm text-destructive ml-8" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-sm text-muted-foreground ml-8">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';
