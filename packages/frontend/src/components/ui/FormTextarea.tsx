'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  function FormTextarea({ className, label, error, helperText, resize = 'vertical', ...props }, ref) {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
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

FormTextarea.displayName = 'FormTextarea';
