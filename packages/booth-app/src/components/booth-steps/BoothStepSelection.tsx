'use client';

import { motion } from 'framer-motion';
import type { BoothStepProps } from '../BoothRunner';

export function BoothStepSelection({ node, onComplete }: BoothStepProps) {
  const outputs = node.data.outputs || [];
  const label = node.data.label;

  if (outputs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-black text-booth-fg">{label}</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onComplete('default')}
          className="px-12 py-6 bg-booth-accent text-white rounded-2xl font-bold text-2xl shadow-xl"
        >
          Weiter
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10 max-w-2xl mx-auto">
      <h1 className="text-4xl font-black text-booth-fg text-center">{label}</h1>

      <div className="w-full space-y-4">
        {outputs.map((output, i) => (
          <motion.button
            key={output.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onComplete(output.id, { selection: output.id, selectionLabel: output.label })}
            className={`w-full py-6 px-8 rounded-2xl font-bold text-2xl text-left transition-all border-3 ${
              output.type === 'default'
                ? 'bg-booth-accent text-white border-booth-accent shadow-lg shadow-booth-accent/20'
                : output.type === 'retake'
                ? 'bg-booth-card text-booth-muted border-booth-border hover:border-booth-accent/50'
                : 'bg-booth-card text-booth-fg border-booth-border hover:border-booth-accent/50'
            }`}
          >
            {output.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
