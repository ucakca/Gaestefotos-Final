'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepDelay({ node, onComplete }: StepRendererProps) {
  const config = node.data.config;
  const duration = config.duration || 5;
  const unit = config.unit || 'seconds';

  let totalMs = duration * 1000;
  if (unit === 'minutes') totalMs = duration * 60 * 1000;
  if (unit === 'hours') totalMs = duration * 3600 * 1000;

  const [remaining, setRemaining] = useState(totalMs);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, totalMs - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        onComplete('default', { delayed: true, delayMs: totalMs });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [totalMs, onComplete]);

  const progress = 1 - remaining / totalMs;
  const seconds = Math.ceil(remaining / 1000);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <Clock className="w-12 h-12 text-primary" />
      </motion.div>

      <h3 className="text-lg font-bold text-foreground">{node.data.label}</h3>

      <div className="w-48 h-2 bg-background rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="text-2xl font-mono font-bold text-foreground">
        {seconds}s
      </p>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onComplete('default', { delayed: true, skippedDelay: true })}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Überspringen
      </motion.button>
    </div>
  );
}
