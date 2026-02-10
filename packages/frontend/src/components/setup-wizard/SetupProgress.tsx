'use client';

import { motion } from 'framer-motion';
import { PHASE_INFO, SetupPhase } from './types';

interface SetupProgressProps {
  currentPhase: SetupPhase;
  overallProgress: number;
  currentStepTitle: string;
}

export default function SetupProgress({
  currentPhase,
  overallProgress,
  currentStepTitle,
}: SetupProgressProps) {
  const phaseInfo = PHASE_INFO[currentPhase];

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 mb-4 shadow-sm border border-amber-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{phaseInfo.icon}</span>
          <div>
            <h2 className="font-semibold text-app-fg">Event einrichten</h2>
            <p className="text-sm text-app-muted">{phaseInfo.title}</p>
          </div>
        </div>
        <span className="text-lg font-bold text-amber-600">{overallProgress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-amber-100 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${overallProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Next Step Highlight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-app-card rounded-xl p-3 flex items-center justify-between shadow-sm border border-amber-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </motion.div>
          </div>
          <div>
            <p className="text-xs text-app-muted font-medium">Nächster Schritt</p>
            <p className="font-semibold text-app-fg">{currentStepTitle}</p>
          </div>
        </div>
        <svg className="w-5 h-5 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.div>
    </div>
  );
}
