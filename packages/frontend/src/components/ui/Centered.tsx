'use client';

import React from 'react';

type CenteredProps = {
  children: React.ReactNode;
  className?: string;
};

export function Centered({ children, className }: CenteredProps) {
  return (
    <div className={`min-h-screen flex items-center justify-center bg-white${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
}
