'use client';

import Image from 'next/image';

interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export default function Logo({ className = '', width = 150, height = 60 }: LogoProps) {
  return (
    <Image
      src="/images/logo.webp"
      alt="Gästefotos Logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

