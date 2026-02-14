'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children: ReactNode;
  bulkMode?: boolean;
  bulkModeContent?: ReactNode;
}

export default function PageHeader({ title, children, bulkMode, bulkModeContent }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Mobile: Stacked Layout */}
      <div className="block md:hidden space-y-4">
        <h1 className="text-xl font-bold text-foreground">
          {title}
        </h1>
        {bulkMode && bulkModeContent ? (
          <div className="flex items-center gap-2 flex-wrap">
            {bulkModeContent}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {children}
          </div>
        )}
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {title}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          {bulkMode && bulkModeContent ? bulkModeContent : children}
        </div>
      </div>
    </div>
  );
}


