'use client';

import { motion } from 'framer-motion';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepSelectionScreen({ node, onComplete }: StepRendererProps) {
  const outputs = node.data.outputs || [];
  const label = node.data.label;

  // If no outputs defined, just show a "Weiter" button
  if (outputs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <h3 className="text-xl font-bold text-foreground">{label}</h3>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onComplete('default')}
          className="px-8 py-3 bg-primary text-white rounded-xl font-semibold"
        >
          Weiter
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h3 className="text-xl font-bold text-foreground">{label}</h3>

      <div className="w-full max-w-sm space-y-3">
        {outputs.map((output, i) => (
          <motion.button
            key={output.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onComplete(output.id, { selection: output.id, selectionLabel: output.label })}
            className={`w-full py-4 px-5 rounded-xl font-medium text-left transition-colors border-2 ${
              output.type === 'default'
                ? 'bg-primary text-white border-primary'
                : output.type === 'skip'
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                : 'bg-card text-foreground border-border hover:border-primary/50'
            }`}
          >
            {output.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
