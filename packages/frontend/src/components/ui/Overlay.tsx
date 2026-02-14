'use client';

import { type ReactNode } from 'react';

export function Overlay({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-50">{children}</div>;
}

export function Backdrop({ onClick, className = '' }: { onClick?: () => void; className?: string }) {
  return (
    <div
      className={`absolute inset-0 bg-foreground/60 ${className}`}
      onClick={onClick}
      role="presentation"
    />
  );
}
