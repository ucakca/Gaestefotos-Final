'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  const baseClasses = 'flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap';
  const classes = `${baseClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`;

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
    <Button
      onClick={onClick}
      disabled={disabled}
      variant={variant}
      size="sm"
      className={classes}
    >
      {content}
    </Button>
  );
}

