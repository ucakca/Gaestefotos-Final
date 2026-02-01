'use client';

import { SVGProps } from 'react';

interface AIBotIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

export default function AIBotIcon({ 
  size = 24, 
  color = '#FFFFFF',
  className,
  ...props 
}: AIBotIconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      {/* Chat Bubble Bot Head */}
      <path 
        d="M3 6C3 4.5 4.5 3 6.5 3H17.5C19.5 3 21 4.5 21 6V14C21 15.5 19.5 17 17.5 17H8L4 21V17C3.5 17 3 16 3 15V6Z" 
        fill={color}
      />
      
      {/* Antenna */}
      <line x1="12" y1="3" x2="12" y2="1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="0.5" r="1.5" fill={color}/>
      
      {/* Eyes */}
      <circle cx="8" cy="9" r="2" fill="#F59E0B"/>
      <circle cx="16" cy="9" r="2" fill="#F59E0B"/>
      
      {/* Smile */}
      <path d="M8 13 Q12 16 16 13" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Alias for backward compatibility
export { AIBotIcon as AIButlerIcon };
