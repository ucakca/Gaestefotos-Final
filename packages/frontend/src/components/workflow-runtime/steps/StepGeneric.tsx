'use client';

import { motion } from 'framer-motion';
import { Cog, ArrowRight } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

/**
 * StepGeneric — Fallback renderer for unknown/unimplemented step types.
 * Shows the node label and a "Weiter" button.
 */
export function StepGeneric({ node, onComplete }: StepRendererProps) {
  const outputs = node.data.outputs || [];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
        <Cog className="w-7 h-7 text-gray-400" />
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-foreground">{node.data.label}</h3>
        <p className="text-xs text-muted-foreground mt-1 font-mono">{node.data.type}</p>
      </div>

      {outputs.length > 0 ? (
        <div className="w-full max-w-sm space-y-2">
          {outputs.map((output) => (
            <motion.button
              key={output.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onComplete(output.id)}
              className="w-full py-3 px-5 rounded-xl font-medium bg-card border border-border hover:border-primary/50 transition-colors text-foreground"
            >
              {output.label}
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onComplete('default')}
          className="px-8 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2"
        >
          Weiter <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
