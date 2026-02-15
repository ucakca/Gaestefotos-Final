'use client';

import { Lock } from 'lucide-react';

interface ProBadgeProps {
  locked?: boolean;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export default function ProBadge({ locked = true, size = 'sm', onClick }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
      `}
    >
      {locked && <Lock className="w-3 h-3" />}
      {locked ? 'Upgrade' : 'Pro'}
    </span>
  );
}
