'use client';

import { useEffect, useState, memo } from 'react';
import CountUp from 'react-countup';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter = memo(function AnimatedCounter({ 
  value, 
  duration = 2, 
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}: AnimatedCounterProps) {
  const [prevValue, setPrevValue] = useState(0);

  useEffect(() => {
    setPrevValue(value);
  }, [value]);

  return (
    <CountUp
      start={prevValue}
      end={value}
      duration={duration}
      decimals={decimals}
      prefix={prefix}
      suffix={suffix}
      className={className}
      preserveValue
    />
  );
});
