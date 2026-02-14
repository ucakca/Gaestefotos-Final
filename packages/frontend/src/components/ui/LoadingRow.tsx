'use client';

import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

type LoadingRowProps = {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function LoadingRow({ text = 'Laden...', size = 'md', className }: LoadingRowProps) {
  return (
    <div className={`flex items-center gap-2 text-muted-foreground${className ? ` ${className}` : ''}`}>
      <Spinner size={size} />
      <div>{text}</div>
    </div>
  );
}
