'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { useWorkflowEngine } from '@/lib/workflow-runtime/useWorkflowEngine';
import type { WorkflowDefinition, WorkflowNode, StepCompleteCallback } from '@/lib/workflow-runtime/types';
import { StepTriggerManual } from './steps/StepTriggerManual';
import { StepTakePhoto } from './steps/StepTakePhoto';
import { StepSelectionScreen } from './steps/StepSelectionScreen';
import { StepDigitalGraffiti } from './steps/StepDigitalGraffiti';
import { StepCondition } from './steps/StepCondition';
import { StepFaceSearch } from './steps/StepFaceSearch';
import { StepAfterShare } from './steps/StepAfterShare';
import { StepDelay } from './steps/StepDelay';
import { StepCountdown } from './steps/StepCountdown';
import { StepPrint } from './steps/StepPrint';
import { StepGeneric } from './steps/StepGeneric';

export interface WorkflowRunnerProps {
  definition: WorkflowDefinition | null;
  eventId: string;
  autoStart?: boolean;
  onComplete?: (collectedData: Record<string, any>) => void;
  onError?: (error: string) => void;
  className?: string;
}

const STEP_COMPONENTS: Record<string, React.FC<StepRendererProps>> = {
  TRIGGER_MANUAL: StepTriggerManual,
  TRIGGER_PHOTO_UPLOAD: StepTriggerManual,
  TRIGGER_QR_SCAN: StepTriggerManual,
  TRIGGER_TIMER: StepTriggerManual,
  TRIGGER_EVENT_STATE: StepTriggerManual,
  TOUCH_TO_START: StepTriggerManual,
  TAKE_PHOTO: StepTakePhoto,
  SELECTION_SCREEN: StepSelectionScreen,
  DIGITAL_GRAFFITI: StepDigitalGraffiti,
  CONDITION: StepCondition,
  FACE_SEARCH: StepFaceSearch,
  AFTER_SHARE: StepAfterShare,
  DELAY: StepDelay,
  COUNTDOWN: StepCountdown,
  PRINT: StepPrint,
};

export interface StepRendererProps {
  node: WorkflowNode;
  collectedData: Record<string, any>;
  onComplete: StepCompleteCallback;
  eventId: string;
}

export default function WorkflowRunner({
  definition,
  eventId,
  autoStart = false,
  onComplete,
  onError,
  className = '',
}: WorkflowRunnerProps) {
  const {
    state,
    currentNode,
    start,
    reset,
    completeStep,
    goBack,
    evaluateCondition,
    events,
  } = useWorkflowEngine(definition);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && definition && state.status === 'idle') {
      start();
    }
  }, [autoStart, definition, state.status, start]);

  // Notify parent on complete
  useEffect(() => {
    const lastEvent = events[events.length - 1];
    if (lastEvent?.type === 'WORKFLOW_COMPLETED') {
      onComplete?.(state.collectedData);
    }
    if (lastEvent?.type === 'WORKFLOW_ERROR') {
      onError?.(lastEvent.error);
    }
  }, [events, state.collectedData, onComplete, onError]);

  // Auto-evaluate CONDITION nodes
  useEffect(() => {
    if (currentNode && currentNode.data.type === 'CONDITION') {
      const result = evaluateCondition(currentNode);
      // If the field being tested exists in collectedData, auto-advance
      const field = currentNode.data.config.field;
      if (field in state.collectedData) {
        completeStep(result ? 'then' : 'else', { [`_condition_${currentNode.id}`]: result });
      }
      // Otherwise, the StepCondition component will handle it manually
    }
  }, [currentNode, evaluateCondition, completeStep, state.collectedData]);

  if (!definition) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-muted-foreground">Kein Workflow geladen</p>
      </div>
    );
  }

  // Idle state — show start button
  if (state.status === 'idle') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 gap-4 ${className}`}>
        <h3 className="text-xl font-bold text-foreground">{definition.name}</h3>
        {definition.description && (
          <p className="text-muted-foreground text-center max-w-md">{definition.description}</p>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={start}
          className="px-6 py-3 bg-app-accent text-white rounded-xl font-semibold shadow-md"
        >
          Workflow starten
        </motion.button>
      </div>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 gap-4 ${className}`}>
        <div className="text-red-500 text-lg font-bold">Fehler</div>
        <p className="text-muted-foreground text-center">{state.error}</p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Neu starten
        </motion.button>
      </div>
    );
  }

  // Completed state
  if (state.status === 'completed') {
    return (
      <div className={`flex flex-col items-center justify-center p-8 gap-4 ${className}`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-4xl"
        >
          ✅
        </motion.div>
        <h3 className="text-xl font-bold text-foreground">Fertig!</h3>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Nochmal
        </motion.button>
      </div>
    );
  }

  // Running state — render current step
  if (!currentNode) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentNode.data.type] || StepGeneric;
  const canGoBack = state.history.length > 0;
  const stepIndex = state.history.length + 1;
  const totalSteps = definition.steps.nodes.length;

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Progress Bar + Back Button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50">
        {canGoBack && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-background transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{currentNode.data.label}</span>
            <span>Schritt {stepIndex}</span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-app-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((stepIndex / totalSteps) * 100, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentNode.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            className="p-4"
          >
            <StepComponent
              node={currentNode}
              collectedData={state.collectedData}
              onComplete={completeStep}
              eventId={eventId}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
