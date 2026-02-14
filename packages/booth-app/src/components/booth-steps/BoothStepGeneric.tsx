'use client';

import { motion } from 'framer-motion';
import { Cog, ArrowRight } from 'lucide-react';
import type { BoothStepProps } from '../BoothRunner';

export function BoothStepGeneric({ node, onComplete }: BoothStepProps) {
  const outputs = node.data.outputs || [];

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="w-24 h-24 rounded-2xl bg-booth-card border border-booth-border flex items-center justify-center">
        <Cog className="w-12 h-12 text-booth-muted" />
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-black text-booth-fg">{node.data.label}</h1>
        <p className="text-lg text-booth-muted mt-2 font-mono">{node.data.type}</p>
      </div>

      {outputs.length > 0 ? (
        <div className="space-y-3 w-full max-w-md">
          {outputs.map((output) => (
            <motion.button
              key={output.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onComplete(output.id)}
              className="w-full py-5 px-8 rounded-2xl font-bold text-xl bg-booth-card border-2 border-booth-border text-booth-fg hover:border-booth-accent/50 transition-colors"
            >
              {output.label}
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onComplete('default')}
          className="px-12 py-5 bg-booth-accent text-white rounded-2xl font-bold text-xl flex items-center gap-3 shadow-xl"
        >
          Weiter <ArrowRight className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
}
