'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, QrCode, Printer } from 'lucide-react';
import type { BoothStepProps } from '../BoothRunner';

const ICONS: Record<string, any> = {
  AFTER_SHARE: CheckCircle,
  COMPLIMENT: Sparkles,
  QR_CODE: QrCode,
  PRINT: Printer,
};

export function BoothStepResult({ node, onComplete }: BoothStepProps) {
  const Icon = ICONS[node.data.type] || CheckCircle;
  const outputs = node.data.outputs || [];
  const hasOutputs = outputs.length > 0;
  const animation = node.data.config.animation || 'single';

  // Auto-advance after 3s if no interactive outputs
  useEffect(() => {
    if (!hasOutputs) {
      const timer = setTimeout(() => {
        onComplete('default');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasOutputs, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12 }}
      >
        <Icon className="w-32 h-32 text-booth-accent" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-black text-booth-fg text-center"
      >
        {node.data.label}
      </motion.h1>

      {hasOutputs ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-6 mt-4"
        >
          {outputs.map((output) => (
            <motion.button
              key={output.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => onComplete(output.id)}
              className={`px-10 py-5 rounded-2xl font-bold text-xl transition-all ${
                output.type === 'retake'
                  ? 'bg-booth-card border-2 border-booth-border text-booth-muted'
                  : 'bg-booth-accent text-white shadow-lg shadow-booth-accent/30'
              }`}
            >
              {output.label}
            </motion.button>
          ))}
        </motion.div>
      ) : (
        <motion.p
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-xl text-booth-muted"
        >
          Weiter...
        </motion.p>
      )}
    </div>
  );
}
