'use client';

import React from 'react';

type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function Container({ children, className }: ContainerProps) {
  return <div className={`w-full max-w-md px-4${className ? ` ${className}` : ''}`}>{children}</div>;
}
