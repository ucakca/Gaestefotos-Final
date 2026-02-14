'use client';

import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';
import type { BoothStepProps } from '../BoothRunner';

export function BoothStepIdle({ node, onComplete }: BoothStepProps) {
  const label = node.data.config.buttonLabel || node.data.label || 'Touch to Start';

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-8 cursor-pointer select-none"
      onClick={() => onComplete('default', { triggered: true })}
      whileTap={{ scale: 0.97 }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        className="w-40 h-40 rounded-full bg-gradient-to-br from-booth-accent to-indigo-700 flex items-center justify-center shadow-2xl shadow-booth-accent/30"
      >
        <Hand className="w-20 h-20 text-white" />
      </motion.div>

      <div className="text-center">
        <h1 className="text-5xl font-black text-booth-fg mb-3">{label}</h1>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-xl text-booth-muted"
        >
          Tippe um zu starten
        </motion.p>
      </div>
    </motion.div>
  );
}
