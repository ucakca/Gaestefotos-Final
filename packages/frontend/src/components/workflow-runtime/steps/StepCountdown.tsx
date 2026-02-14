'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepCountdown({ node, onComplete }: StepRendererProps) {
  const duration = node.data.config.duration || 3;
  const [count, setCount] = useState(duration);
  const doneRef = useRef(false);

  useEffect(() => {
    if (count <= 0 && !doneRef.current) {
      doneRef.current = true;
      onComplete('default', { countdownFinished: true });
      return;
    }

    const timer = setTimeout(() => {
      setCount((c: number) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-8xl font-black text-primary"
        >
          {count > 0 ? count : '📸'}
        </motion.div>
      </AnimatePresence>

      <p className="text-muted-foreground mt-6">{node.data.label}</p>
    </div>
  );
}
