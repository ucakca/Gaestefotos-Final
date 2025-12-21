'use client';

import React from 'react';

type SectionProps = {
  children: React.ReactNode;
  className?: string;
  borderColorClassName?: string;
};

export function Section({ children, className, borderColorClassName = 'border-gray-100' }: SectionProps) {
  return <div className={`px-4 py-3 border-b ${borderColorClassName}${className ? ` ${className}` : ''}`}>{children}</div>;
}
