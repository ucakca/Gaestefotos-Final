'use client';

import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { SETUP_STEPS, PHASE_INFO, SetupPhase, SetupStep } from './types';

interface SetupChecklistProps {
  completedSteps: string[];
  currentStepId: string;
  currentPhase: SetupPhase;
  onStepClick: (stepId: string) => void;
}

export default function SetupChecklist({
  completedSteps,
  currentStepId,
  currentPhase,
  onStepClick,
}: SetupChecklistProps) {
  const totalCompleted = completedSteps.length;
  const totalSteps = SETUP_STEPS.length;

  const getStepStatus = (step: SetupStep) => {
    if (completedSteps.includes(step.id)) return 'completed';
    if (step.id === currentStepId) return 'active';
    return 'pending';
  };

  const phases: SetupPhase[] = [1, 2, 3, 4, 5];

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Alle Schritte</h3>
          <span className="text-sm text-muted-foreground">{totalCompleted}/{totalSteps} abgeschlossen</span>
        </div>
      </div>

      {/* Steps List */}
      <div className="divide-y divide-app-border/50">
        {phases.map((phase) => {
          const phaseSteps = SETUP_STEPS.filter(s => s.phase === phase);
          const phaseInfo = PHASE_INFO[phase];
          const isCurrentPhase = phase === currentPhase;
          const isPhaseCompleted = phaseSteps.every(s => completedSteps.includes(s.id));
          const isPhaseLocked = phase > currentPhase && !isPhaseCompleted;

          return (
            <div key={phase} className={isPhaseLocked ? 'opacity-50' : ''}>
              {/* Phase Header (collapsible on mobile) */}
              <div className="px-4 py-2 bg-background flex items-center gap-2">
                <span className="text-sm">{phaseInfo.icon}</span>
                <span className="text-xs font-medium text-muted-foreground">{phaseInfo.title}</span>
                {isPhaseCompleted && (
                  <Icons.CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                )}
              </div>

              {/* Steps in Phase */}
              {phaseSteps.map((step, index) => {
                const status = getStepStatus(step);
                const IconComponent = step.icon ? (Icons as any)[step.icon] : Icons.Circle;
                const canClick = status !== 'pending' || completedSteps.length >= SETUP_STEPS.findIndex(s => s.id === step.id);

                return (
                  <motion.button
                    key={step.id}
                    onClick={() => canClick && onStepClick(step.id)}
                    disabled={!canClick}
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                      status === 'active'
                        ? 'bg-amber-50'
                        : status === 'completed'
                        ? 'bg-green-50/50 hover:bg-green-50'
                        : 'hover:bg-background'
                    } ${!canClick ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    whileTap={canClick ? { scale: 0.98 } : {}}
                  >
                    {/* Status Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      status === 'completed'
                        ? 'bg-green-500'
                        : status === 'active'
                        ? 'bg-orange-500'
                        : 'bg-app-border'
                    }`}>
                      <AnimatePresence mode="wait">
                        {status === 'completed' ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Icons.Check className="w-4 h-4 text-white" />
                          </motion.div>
                        ) : status === 'active' ? (
                          <motion.div
                            key="active"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <IconComponent className="w-4 h-4 text-white" />
                          </motion.div>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            {SETUP_STEPS.findIndex(s => s.id === step.id) + 1}
                          </span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Step Title */}
                    <span className={`flex-1 font-medium ${
                      status === 'completed'
                        ? 'text-green-700'
                        : status === 'active'
                        ? 'text-orange-700'
                        : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>

                    {/* Arrow for active/clickable */}
                    {(status === 'active' || status === 'completed') && (
                      <Icons.ChevronRight className={`w-5 h-5 ${
                        status === 'active' ? 'text-orange-400' : 'text-muted-foreground'
                      }`} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
