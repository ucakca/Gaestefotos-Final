'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  as?: 'button' | 'label';
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
}

export default function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'primary',
  as = 'button',
  className = '',
  children,
  disabled = false,
}: ActionButtonProps) {
  const baseClasses = 'flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap';
  
  const variantClasses = {
    primary: 'bg-tokens-brandGreen text-app-bg hover:opacity-90',
    secondary: 'bg-app-bg text-app-fg hover:opacity-90',
    danger: 'bg-app-bg text-[var(--status-danger)] border border-[var(--status-danger)] hover:opacity-90',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

  // Always show text (responsive with smaller text on mobile)
  const content = (
    <>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-xs sm:text-sm">{label}</span>
      {children}
    </>
  );

  if (as === 'label') {
    return (
      <label className={`${classes} cursor-pointer`}>
        {content}
      </label>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {content}
    </button>
  );
}

