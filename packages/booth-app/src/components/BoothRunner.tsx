'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, WifiOff, RefreshCw, Camera } from 'lucide-react';
import api from '@/lib/api';
import { WorkflowEngine } from '@/lib/workflow-runtime/engine';
import type { WorkflowDefinition, WorkflowNode, WorkflowState, StepResult } from '@/lib/workflow-runtime/types';

// ─── Step Renderers (Booth-optimized: fullscreen, large touch targets) ──────

import { BoothStepIdle } from './booth-steps/BoothStepIdle';
import { BoothStepCountdown } from './booth-steps/BoothStepCountdown';
import { BoothStepCapture } from './booth-steps/BoothStepCapture';
import { BoothStepSelection } from './booth-steps/BoothStepSelection';
import { BoothStepResult } from './booth-steps/BoothStepResult';
import { BoothStepGeneric } from './booth-steps/BoothStepGeneric';

interface BoothConfig {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  flowType: string;
  apiUrl: string;
}

interface BoothRunnerProps {
  config: BoothConfig;
  online: boolean;
}

export type BoothStepProps = {
  node: WorkflowNode;
  collectedData: Record<string, any>;
  onComplete: (outputId: string, data?: Record<string, any>) => void;
  eventId: string;
};

const STEP_MAP: Record<string, React.FC<BoothStepProps>> = {
  TOUCH_TO_START: BoothStepIdle,
  TRIGGER_MANUAL: BoothStepIdle,
  COUNTDOWN: BoothStepCountdown,
  TAKE_PHOTO: BoothStepCapture,
  SELECTION_SCREEN: BoothStepSelection,
  AFTER_SHARE: BoothStepResult,
  COMPLIMENT: BoothStepResult,
  QR_CODE: BoothStepResult,
  PRINT: BoothStepResult,
};

export default function BoothRunner({ config, online }: BoothRunnerProps) {
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<WorkflowEngine | null>(null);
  const [state, setState] = useState<WorkflowState>({
    status: 'idle',
    currentNodeId: null,
    history: [],
    collectedData: {},
    error: null,
    startedAt: null,
  });
  const [currentNode, setCurrentNode] = useState<WorkflowNode | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  // Load workflow from backend
  useEffect(() => {
    setLoading(true);
    setError(null);

    api
      .get(`/workflows/by-type/${config.flowType}`)
      .then((res) => {
        const wf = res.data?.workflow;
        if (wf) {
          setWorkflow({
            id: wf.id,
            name: wf.name,
            description: wf.description,
            flowType: wf.flowType,
            steps: wf.steps,
          });
        } else {
          setError('Kein Workflow für diesen Booth-Typ gefunden');
        }
      })
      .catch((err: any) => {
        setError(err?.response?.data?.error || 'Workflow konnte nicht geladen werden');
      })
      .finally(() => setLoading(false));
  }, [config.flowType]);

  // Initialize engine when workflow loads
  useEffect(() => {
    if (!workflow) return;

    const engine = new WorkflowEngine(workflow);
    engineRef.current = engine;

    const unsub = engine.on((event) => {
      setState(engine.getState());
      setCurrentNode(engine.getCurrentNode());

      if (event.type === 'WORKFLOW_COMPLETED') {
        // Auto-restart after a delay for booth loops
        setTimeout(() => {
          engine.reset();
          engine.start();
          setSessionCount((c: number) => c + 1);
        }, 5000);
      }
    });

    // Auto-start
    engine.start();

    return () => {
      unsub();
    };
  }, [workflow]);

  const completeStep = useCallback((outputId: string, data: Record<string, any> = {}) => {
    engineRef.current?.completeStep(outputId, data);
  }, []);

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-12 h-12 text-booth-accent animate-spin" />
        <p className="text-booth-muted">Workflow wird geladen...</p>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-red-400 text-6xl">⚠️</div>
        <h2 className="text-2xl font-bold text-booth-fg">{error}</h2>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-booth-accent text-white rounded-xl font-semibold flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" /> Neu laden
        </button>
      </div>
    );
  }

  // ─── Offline Warning ───────────────────────────────────────────────────

  if (!online) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <WifiOff className="w-16 h-16 text-red-400" />
        <h2 className="text-2xl font-bold text-booth-fg">Keine Verbindung</h2>
        <p className="text-booth-muted">Bitte WLAN-Verbindung prüfen</p>
      </div>
    );
  }

  // ─── No current node ───────────────────────────────────────────────────

  if (!currentNode) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-10 h-10 text-booth-accent animate-spin" />
      </div>
    );
  }

  // ─── Render current step ───────────────────────────────────────────────

  const StepComponent = STEP_MAP[currentNode.data.type] || BoothStepGeneric;

  return (
    <div className="relative w-full h-full">
      {/* Session counter (small, top-right) */}
      <div className="absolute top-2 right-4 text-xs text-booth-muted/50 z-10">
        Session #{sessionCount + 1}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentNode.id + '-' + sessionCount}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full flex items-center justify-center"
        >
          <StepComponent
            node={currentNode}
            collectedData={state.collectedData}
            onComplete={completeStep}
            eventId={config.eventId}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
