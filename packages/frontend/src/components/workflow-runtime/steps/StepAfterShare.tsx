'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepAfterShare({ node, onComplete }: StepRendererProps) {
  const config = node.data.config;
  const animation = config.animation || 'single';
  const outputs = node.data.outputs || [];
  const hasOutputs = outputs.length > 0;
  const isError = animation === 'error';

  // Auto-advance after 2s if no interactive outputs
  useEffect(() => {
    if (!hasOutputs) {
      const timer = setTimeout(() => {
        onComplete('default');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasOutputs, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        {isError ? (
          <AlertTriangle className="w-16 h-16 text-red-500" />
        ) : animation === 'sparkle' ? (
          <Sparkles className="w-16 h-16 text-purple-500" />
        ) : (
          <CheckCircle className="w-16 h-16 text-green-500" />
        )}
      </motion.div>

      <h3 className="text-xl font-bold text-app-fg">{node.data.label}</h3>

      {hasOutputs ? (
        <div className="w-full max-w-sm space-y-3 mt-2">
          {outputs.map((output) => (
            <motion.button
              key={output.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => onComplete(output.id)}
              className={`w-full py-3 px-5 rounded-xl font-medium border-2 transition-colors ${
                output.type === 'retake'
                  ? 'bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-400'
                  : 'bg-app-accent text-white border-app-accent'
              }`}
            >
              {output.label}
            </motion.button>
          ))}
        </div>
      ) : (
        <p className="text-app-muted text-sm">Weiter...</p>
      )}
    </div>
  );
}
