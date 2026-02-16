'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Workflow, AlertTriangle } from 'lucide-react';
import type { StepRendererProps } from '../WorkflowRunner';
import type { WorkflowDefinition } from '@/lib/workflow-runtime/types';
import { useWorkflowEngine } from '@/lib/workflow-runtime/useWorkflowEngine';

/**
 * StepSubWorkflow — executes a nested workflow inside the parent workflow.
 *
 * Config:
 *   - config.workflowId: ID of the sub-workflow to load
 *   - config.workflowType: flowType to load by type (fallback if no workflowId)
 *   - config.label: optional display label
 *   - config.passData: boolean — if true, pass parent collectedData as initial context
 *
 * On complete, merges sub-workflow collectedData into parent (prefixed with subWorkflow_).
 */
export function StepSubWorkflow({ node, collectedData, onComplete, eventId }: StepRendererProps) {
  const { config } = node.data;
  const workflowId = config?.workflowId;
  const workflowType = config?.workflowType;
  const label = config?.label || 'Sub-Workflow';
  const passData = config?.passData !== false;

  const [subDefinition, setSubDefinition] = useState<WorkflowDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch sub-workflow definition
  useEffect(() => {
    let cancelled = false;

    async function loadSubWorkflow() {
      try {
        setLoading(true);
        setError(null);

        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        let url: string;

        if (workflowId) {
          url = `${apiBase}/api/workflows/${workflowId}`;
        } else if (workflowType) {
          url = `${apiBase}/api/workflows/by-type/${workflowType}`;
        } else {
          throw new Error('Kein workflowId oder workflowType konfiguriert');
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Sub-Workflow nicht gefunden (${res.status})`);
        }

        const data = await res.json();
        const def = data.workflow || data;

        if (!cancelled) {
          setSubDefinition(def);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Fehler beim Laden des Sub-Workflows');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSubWorkflow();
    return () => { cancelled = true; };
  }, [workflowId, workflowType]);

  // Sub-workflow engine
  const subEngine = useWorkflowEngine(subDefinition);

  // Auto-start sub-workflow once loaded
  useEffect(() => {
    if (subDefinition && subEngine.state.status === 'idle') {
      subEngine.start();
    }
  }, [subDefinition, subEngine]);

  // Handle sub-workflow completion
  const handleSubComplete = useCallback((subData: Record<string, any>) => {
    // Merge sub-workflow data into parent, prefixed to avoid collisions
    const merged: Record<string, any> = {
      [`subWorkflow_${node.id}_completed`]: true,
    };

    for (const [key, value] of Object.entries(subData)) {
      merged[`sub_${key}`] = value;
    }

    onComplete('default', merged);
  }, [node.id, onComplete]);

  // Watch for sub-workflow completion
  useEffect(() => {
    if (subEngine.state.status === 'completed') {
      handleSubComplete(subEngine.state.collectedData);
    }
  }, [subEngine.state.status, subEngine.state.collectedData, handleSubComplete]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Lade {label}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <button
          onClick={() => onComplete('skip', { subWorkflowError: error })}
          className="px-4 py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80"
        >
          Überspringen
        </button>
      </div>
    );
  }

  if (subEngine.state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-destructive">{subEngine.state.error}</p>
        <button
          onClick={() => onComplete('skip', { subWorkflowError: subEngine.state.error })}
          className="px-4 py-2 rounded-lg bg-muted text-sm text-foreground hover:bg-muted/80"
        >
          Überspringen
        </button>
      </div>
    );
  }

  // Render sub-workflow step
  const { currentNode } = subEngine;

  if (!currentNode) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Workflow className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{label} wird ausgeführt...</p>
      </div>
    );
  }

  // Dynamically import the step component registry from WorkflowRunner
  // We need to render the sub-workflow's current step using the same STEP_COMPONENTS
  // For this we use the StepGeneric as a wrapper and rely on the engine
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        <Workflow className="w-3.5 h-3.5" />
        <span>{label}</span>
        <span className="ml-auto">
          Schritt {subEngine.state.history.length + 1} / {subDefinition?.steps.nodes.length || '?'}
        </span>
      </div>

      <SubStepRenderer
        node={currentNode}
        collectedData={subEngine.state.collectedData}
        onComplete={subEngine.completeStep}
        eventId={eventId}
      />
    </div>
  );
}

// Lazy-loaded step renderer that reuses the same step components as WorkflowRunner
function SubStepRenderer({ node, collectedData, onComplete, eventId }: StepRendererProps) {
  // Import step components dynamically to avoid circular imports
  const [StepComponent, setStepComponent] = useState<React.FC<StepRendererProps> | null>(null);

  useEffect(() => {
    const type = node.data.type;

    // Map node types to step component imports
    const importMap: Record<string, () => Promise<any>> = {
      TRIGGER_MANUAL: () => import('./StepTriggerManual'),
      TRIGGER_PHOTO_UPLOAD: () => import('./StepTriggerManual'),
      TRIGGER_QR_SCAN: () => import('./StepTriggerManual'),
      TRIGGER_TIMER: () => import('./StepTriggerManual'),
      TRIGGER_EVENT_STATE: () => import('./StepTriggerManual'),
      TOUCH_TO_START: () => import('./StepTriggerManual'),
      TAKE_PHOTO: () => import('./StepTakePhoto'),
      SELECTION_SCREEN: () => import('./StepSelectionScreen'),
      DIGITAL_GRAFFITI: () => import('./StepDigitalGraffiti'),
      CONDITION: () => import('./StepCondition'),
      FACE_SEARCH: () => import('./StepFaceSearch'),
      AFTER_SHARE: () => import('./StepAfterShare'),
      DELAY: () => import('./StepDelay'),
      COUNTDOWN: () => import('./StepCountdown'),
      PRINT: () => import('./StepPrint'),
    };

    const loader = importMap[type] || (() => import('./StepGeneric'));
    loader().then((mod) => {
      // Components export as named: StepTakePhoto, StepGeneric, etc.
      const Component = Object.values(mod)[0] as React.FC<StepRendererProps>;
      setStepComponent(() => Component);
    });
  }, [node.data.type]);

  if (!StepComponent) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <StepComponent node={node} collectedData={collectedData} onComplete={onComplete} eventId={eventId} />;
}
