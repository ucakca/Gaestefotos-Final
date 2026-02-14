'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoothStepProps } from '../BoothRunner';

export function BoothStepCountdown({ node, onComplete }: BoothStepProps) {
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
    <div className="flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-[200px] font-black leading-none"
          style={{
            color: count > 0 ? '#6366f1' : '#22c55e',
            textShadow: '0 0 80px rgba(99,102,241,0.5)',
          }}
        >
          {count > 0 ? count : '📸'}
        </motion.div>
      </AnimatePresence>

      {node.data.config.sound && count > 0 && (
        <p className="text-booth-muted text-2xl mt-8">Mach dich bereit!</p>
      )}
    </div>
  );
}
