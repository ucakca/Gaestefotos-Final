'use client';

import { motion } from 'framer-motion';
import { Play, Upload, QrCode, Clock, Flag, Hand } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';

const TRIGGER_ICONS: Record<string, any> = {
  TRIGGER_MANUAL: Play,
  TRIGGER_PHOTO_UPLOAD: Upload,
  TRIGGER_QR_SCAN: QrCode,
  TRIGGER_TIMER: Clock,
  TRIGGER_EVENT_STATE: Flag,
  TOUCH_TO_START: Hand,
};

export function StepTriggerManual({ node, onComplete }: StepRendererProps) {
  const Icon = TRIGGER_ICONS[node.data.type] || Play;
  const buttonLabel = node.data.config.buttonLabel || node.data.label || 'Weiter';

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-app-accent/20 to-app-accent/5 flex items-center justify-center"
      >
        <Icon className="w-10 h-10 text-app-accent" />
      </motion.div>

      <div className="text-center">
        <h3 className="text-xl font-bold text-app-fg mb-1">{node.data.label}</h3>
        {node.data.config.requireConfirmation !== false && (
          <p className="text-app-muted text-sm">Tippe um fortzufahren</p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => onComplete('default', { triggered: true, triggerType: node.data.type })}
        className="px-8 py-4 bg-app-accent text-white rounded-2xl font-semibold text-lg shadow-lg shadow-app-accent/20"
      >
        {buttonLabel}
      </motion.button>
    </div>
  );
}
