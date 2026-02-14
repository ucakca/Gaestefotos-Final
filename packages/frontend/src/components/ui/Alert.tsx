import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'info' | 'danger';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  title?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  info: 'border-border bg-background text-foreground',
  danger: 'border-destructive/50 bg-destructive/10 text-destructive',
};

export function Alert({ variant = 'info', title, className = '', children, ...props }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${variantClasses[variant]} ${className}`} {...props}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {children ? <div className="text-sm">{children}</div> : null}
    </div>
  );
}
