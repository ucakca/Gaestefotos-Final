import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'info' | 'danger';

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  title?: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  info: 'border-app-border bg-app-bg text-app-fg',
  danger: 'border-status-danger bg-app-bg text-status-danger',
};

export function Alert({ variant = 'info', title, className = '', children, ...props }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${variantClasses[variant]} ${className}`} {...props}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {children ? <div className="text-sm">{children}</div> : null}
    </div>
  );
}
