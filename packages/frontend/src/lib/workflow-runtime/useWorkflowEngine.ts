'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { XStateWorkflowEngine } from './xstate-engine';
import { workflowEventBus } from './event-bus';
import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowNode,
  EngineEvent,
} from './types';

export interface UseWorkflowEngineReturn {
  state: WorkflowState;
  currentNode: WorkflowNode | null;
  definition: WorkflowDefinition | null;
  start: () => void;
  reset: () => void;
  completeStep: (outputId?: string, data?: Record<string, any>) => void;
  goBack: () => boolean;
  pause: () => void;
  resume: () => void;
  evaluateCondition: (node: WorkflowNode) => boolean;
  events: EngineEvent[];
}

const INITIAL_STATE: WorkflowState = {
  status: 'idle',
  currentNodeId: null,
  history: [],
  collectedData: {},
  error: null,
  startedAt: null,
};

export function useWorkflowEngine(
  definition: WorkflowDefinition | null
): UseWorkflowEngineReturn {
  const engineRef = useRef<XStateWorkflowEngine | null>(null);
  const [state, setState] = useState<WorkflowState>(INITIAL_STATE);
  const [currentNode, setCurrentNode] = useState<WorkflowNode | null>(null);
  const [events, setEvents] = useState<EngineEvent[]>([]);

  // Create/recreate engine when definition changes
  useEffect(() => {
    if (!definition) {
      engineRef.current?.destroy();
      engineRef.current = null;
      setState(INITIAL_STATE);
      setCurrentNode(null);
      setEvents([]);
      return;
    }

    const engine = new XStateWorkflowEngine(definition);
    engineRef.current = engine;

    // Sync React state on every engine event + forward to Event Bus
    const unsub = engine.on((event) => {
      setState(engine.getState());
      setCurrentNode(engine.getCurrentNode());
      setEvents((prev) => [...prev.slice(-49), event]);
      workflowEventBus.emit(event);
    });

    // Set initial state
    setState(engine.getState());

    return () => {
      unsub();
      engine.destroy();
    };
  }, [definition]);

  const start = useCallback(() => {
    engineRef.current?.start();
  }, []);

  const reset = useCallback(() => {
    engineRef.current?.reset();
    setState(engineRef.current?.getState() || INITIAL_STATE);
    setCurrentNode(null);
  }, []);

  const completeStep = useCallback((outputId: string = 'default', data: Record<string, any> = {}) => {
    engineRef.current?.completeStep(outputId, data);
  }, []);

  const goBack = useCallback(() => {
    return engineRef.current?.goBack() || false;
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const evaluateCondition = useCallback((node: WorkflowNode) => {
    return engineRef.current?.evaluateCondition(node) || false;
  }, []);

  return {
    state,
    currentNode,
    definition,
    start,
    reset,
    completeStep,
    goBack,
    pause,
    resume,
    evaluateCondition,
    events,
  };
}
