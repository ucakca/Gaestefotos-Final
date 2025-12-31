'use client';

import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return <div className={`bg-app-card rounded-lg border border-app-border${className ? ` ${className}` : ''}`}>{children}</div>;
}
