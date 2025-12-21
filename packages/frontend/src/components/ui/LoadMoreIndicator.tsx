'use client';

import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

type LoadMoreIndicatorProps = {
  loading: boolean;
  className?: string;
};

export function LoadMoreIndicator({ loading, className }: LoadMoreIndicatorProps) {
  return (
    <div className={`py-8 flex justify-center${className ? ` ${className}` : ''}`}>
      {loading && (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Spinner size="sm" />
          <div>Lade weitere Fotos...</div>
        </div>
      )}
    </div>
  );
}
