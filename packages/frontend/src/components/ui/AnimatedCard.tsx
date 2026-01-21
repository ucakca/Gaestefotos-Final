'use client';

import { memo } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardHover } from '@/lib/animations';

interface AnimatedCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
}

export const AnimatedCard = memo(function AnimatedCard({ 
  children, 
  className, 
  hover = true,
  clickable = false,
  ...props 
}: AnimatedCardProps) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-app-border bg-app-card',
        clickable && 'cursor-pointer',
        className
      )}
      whileHover={hover ? cardHover : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
});
