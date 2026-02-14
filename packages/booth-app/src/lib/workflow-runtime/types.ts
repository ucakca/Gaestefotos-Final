// ─── Workflow Runtime Types ──────────────────────────────────────────────────
// Framework-agnostic types for the workflow execution engine.
// Used by both the guest web app and the Electron booth app.

export interface WorkflowNode {
  id: string;
  type: string; // 'workflowStep'
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowNodeData {
  type: string; // e.g. 'TRIGGER_MANUAL', 'TAKE_PHOTO', 'CONDITION', etc.
  label: string;
  category: string;
  stepNumber: number;
  config: Record<string, any>;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  outputs: OutputHandle[];
}

export interface OutputHandle {
  id: string;
  label: string;
  type: 'default' | 'skip' | 'retake' | 'conditional';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  flowType: string;
  steps: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

// ─── Runtime State ──────────────────────────────────────────────────────────

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

export interface StepResult {
  nodeId: string;
  outputId: string; // which output handle was chosen (e.g. 'default', 'then', 'else', 'retake')
  data: Record<string, any>; // collected data from this step
  timestamp: number;
}

export interface WorkflowState {
  status: WorkflowStatus;
  currentNodeId: string | null;
  history: StepResult[];
  collectedData: Record<string, any>; // merged data from all steps
  error: string | null;
  startedAt: number | null;
}

// ─── Step Handler Interface ─────────────────────────────────────────────────

export interface StepContext {
  node: WorkflowNode;
  collectedData: Record<string, any>;
  history: StepResult[];
  eventId?: string;
}

export type StepCompleteCallback = (outputId: string, data?: Record<string, any>) => void;

// ─── Engine Events ──────────────────────────────────────────────────────────

export type EngineEvent =
  | { type: 'STEP_ENTERED'; nodeId: string; node: WorkflowNode }
  | { type: 'STEP_COMPLETED'; nodeId: string; result: StepResult }
  | { type: 'WORKFLOW_COMPLETED'; collectedData: Record<string, any> }
  | { type: 'WORKFLOW_ERROR'; error: string }
  | { type: 'NO_NEXT_STEP'; nodeId: string; outputId: string };

export type EngineEventListener = (event: EngineEvent) => void;
