'use client';

import * as React from 'react';

type ColorInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};

export function ColorInput({ value, onChange, className, ...props }: ColorInputProps) {
  return (
    <input
      {...props}
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        `h-10 w-12 cursor-pointer rounded border border-app-border bg-app-card focus:outline-none focus:ring-1 focus:ring-tokens-brandGreen/30 ${
          className || ''
        }`.trim()
      }
    />
  );
}
