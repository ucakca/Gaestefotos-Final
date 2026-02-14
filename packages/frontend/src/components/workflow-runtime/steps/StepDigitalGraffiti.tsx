'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepDigitalGraffiti({ node, onComplete }: StepRendererProps) {
  const config = node.data.config;
  const placeholder = config.placeholder || 'Text eingeben...';
  const isRequired = config.required !== false;
  const maxLength = config.maxLength || undefined;
  const isTextArea = !maxLength || maxLength > 20;

  const [value, setValue] = useState('');

  const canSubmit = !isRequired || value.trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <h3 className="text-lg font-bold text-foreground">{node.data.label}</h3>

      {isTextArea ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={config.enableEmojis ? 4 : 2}
          className="w-full max-w-sm px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full max-w-sm px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl font-mono tracking-widest"
          autoFocus
        />
      )}

      {isRequired && value.trim().length === 0 && (
        <p className="text-xs text-muted-foreground">Pflichtfeld</p>
      )}

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onComplete('default', { [node.id + '_text']: value.trim(), text: value.trim() })}
        disabled={!canSubmit}
        className="px-8 py-3 bg-primary text-white rounded-xl font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" /> Weiter
      </motion.button>
    </div>
  );
}
