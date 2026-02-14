'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Printer, Loader2, CheckCircle } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

export function StepPrint({ node, onComplete }: StepRendererProps) {
  const [printing, setPrinting] = useState(false);
  const [done, setDone] = useState(false);

  const handlePrint = () => {
    setPrinting(true);
    // Simulate print delay — in real implementation this calls the print API
    setTimeout(() => {
      setPrinting(false);
      setDone(true);
      setTimeout(() => {
        onComplete('default', { printed: true });
      }, 1500);
    }, 3000);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      {done ? (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground">Gedruckt!</h3>
        </>
      ) : printing ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Printer className="w-16 h-16 text-primary" />
          </motion.div>
          <h3 className="text-xl font-bold text-foreground">Wird gedruckt...</h3>
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </>
      ) : (
        <>
          <Printer className="w-16 h-16 text-primary" />
          <h3 className="text-xl font-bold text-foreground">{node.data.label}</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePrint}
            className="px-8 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center gap-2"
          >
            <Printer className="w-5 h-5" /> Jetzt drucken!
          </motion.button>
        </>
      )}
    </div>
  );
}
