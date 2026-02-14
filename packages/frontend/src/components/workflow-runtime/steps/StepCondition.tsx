'use client';

import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

/**
 * StepCondition — Manual condition branching.
 * If the condition field is already in collectedData, the engine auto-evaluates.
 * Otherwise this renders buttons for the user to choose a branch.
 */
export function StepCondition({ node, onComplete }: StepRendererProps) {
  const outputs = node.data.outputs || [
    { id: 'then', label: 'Ja', type: 'default' as const },
    { id: 'else', label: 'Nein', type: 'conditional' as const },
  ];

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-14 h-14 rounded-xl bg-cyan-100 flex items-center justify-center">
        <GitBranch className="w-7 h-7 text-cyan-600" />
      </div>

      <h3 className="text-xl font-bold text-app-fg text-center">{node.data.label}</h3>

      <div className="w-full max-w-sm space-y-3">
        {outputs.map((output, i) => (
          <motion.button
            key={output.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onComplete(output.id, { condition_choice: output.id })}
            className={`w-full py-4 px-5 rounded-xl font-medium transition-colors border-2 ${
              output.type === 'default'
                ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-400'
                : 'bg-red-50 text-red-700 border-red-200 hover:border-red-400'
            }`}
          >
            {output.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
