// ─── Workflow Runtime Engine ─────────────────────────────────────────────────
// Framework-agnostic state machine that executes workflow definitions.
// Tracks current node, handles transitions via edges, manages collected data.

import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowState,
  WorkflowStatus,
  StepResult,
  EngineEvent,
  EngineEventListener,
} from './types';

export class WorkflowEngine {
  private definition: WorkflowDefinition;
  private nodeMap: Map<string, WorkflowNode>;
  private edgesBySource: Map<string, WorkflowEdge[]>;
  private state: WorkflowState;
  private listeners: Set<EngineEventListener> = new Set();

  constructor(definition: WorkflowDefinition) {
    this.definition = definition;
    this.nodeMap = new Map();
    this.edgesBySource = new Map();

    // Index nodes
    for (const node of definition.steps.nodes) {
      this.nodeMap.set(node.id, node);
    }

    // Index edges by source node
    for (const edge of definition.steps.edges) {
      const existing = this.edgesBySource.get(edge.source) || [];
      existing.push(edge);
      this.edgesBySource.set(edge.source, existing);
    }

    // Initial state
    this.state = {
      status: 'idle',
      currentNodeId: null,
      history: [],
      collectedData: {},
      error: null,
      startedAt: null,
    };
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  getState(): Readonly<WorkflowState> {
    return { ...this.state };
  }

  getDefinition(): WorkflowDefinition {
    return this.definition;
  }

  getCurrentNode(): WorkflowNode | null {
    if (!this.state.currentNodeId) return null;
    return this.nodeMap.get(this.state.currentNodeId) || null;
  }

  getNode(nodeId: string): WorkflowNode | null {
    return this.nodeMap.get(nodeId) || null;
  }

  getAllNodes(): WorkflowNode[] {
    return this.definition.steps.nodes;
  }

  /** Start the workflow from the first node (topologically: leftmost/topmost node with no incoming edges) */
  start(): void {
    const startNode = this.findStartNode();
    if (!startNode) {
      this.setError('Kein Start-Node gefunden');
      return;
    }

    this.state = {
      status: 'running',
      currentNodeId: startNode.id,
      history: [],
      collectedData: {},
      error: null,
      startedAt: Date.now(),
    };

    this.emit({ type: 'STEP_ENTERED', nodeId: startNode.id, node: startNode });
  }

  /** Reset the workflow back to idle */
  reset(): void {
    this.state = {
      status: 'idle',
      currentNodeId: null,
      history: [],
      collectedData: {},
      error: null,
      startedAt: null,
    };
  }

  /** Complete the current step and transition to the next node */
  completeStep(outputId: string = 'default', data: Record<string, any> = {}): void {
    if (this.state.status !== 'running' || !this.state.currentNodeId) {
      return;
    }

    const currentNodeId = this.state.currentNodeId;

    // Record the step result
    const result: StepResult = {
      nodeId: currentNodeId,
      outputId,
      data,
      timestamp: Date.now(),
    };

    this.state.history.push(result);
    this.state.collectedData = { ...this.state.collectedData, ...data };

    this.emit({ type: 'STEP_COMPLETED', nodeId: currentNodeId, result });

    // Find next node via edges
    const nextNode = this.findNextNode(currentNodeId, outputId);

    if (nextNode) {
      this.state.currentNodeId = nextNode.id;
      this.emit({ type: 'STEP_ENTERED', nodeId: nextNode.id, node: nextNode });

      // Auto-advance for certain node types
      this.handleAutoAdvance(nextNode);
    } else {
      // No outgoing edge → workflow complete
      this.state.status = 'completed';
      this.state.currentNodeId = null;
      this.emit({ type: 'WORKFLOW_COMPLETED', collectedData: this.state.collectedData });
    }
  }

  /** Go back to the previous step (undo) */
  goBack(): boolean {
    if (this.state.history.length === 0) return false;

    const lastResult = this.state.history.pop()!;
    this.state.currentNodeId = lastResult.nodeId;

    // Remove data contributed by the undone step
    // (simplified: we just re-merge from remaining history)
    this.state.collectedData = {};
    for (const h of this.state.history) {
      this.state.collectedData = { ...this.state.collectedData, ...h.data };
    }

    const node = this.nodeMap.get(lastResult.nodeId);
    if (node) {
      this.emit({ type: 'STEP_ENTERED', nodeId: node.id, node });
    }

    return true;
  }

  /** Pause the workflow */
  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused';
    }
  }

  /** Resume a paused workflow */
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
    }
  }

  // ─── Event System ───────────────────────────────────────────────────────

  on(listener: EngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[WorkflowEngine] Listener error:', e);
      }
    }
  }

  // ─── Internal ───────────────────────────────────────────────────────────

  private findStartNode(): WorkflowNode | null {
    const nodesWithIncoming = new Set<string>();
    for (const edge of this.definition.steps.edges) {
      nodesWithIncoming.add(edge.target);
    }

    // Nodes with no incoming edges = potential start nodes
    const candidates = this.definition.steps.nodes.filter(
      (n) => !nodesWithIncoming.has(n.id)
    );

    if (candidates.length === 0) {
      // Fallback: first node in array
      return this.definition.steps.nodes[0] || null;
    }

    // Prefer trigger nodes, then leftmost (smallest x)
    const triggers = candidates.filter((n) =>
      n.data.type.startsWith('TRIGGER_') || n.data.type === 'TOUCH_TO_START'
    );

    if (triggers.length > 0) {
      return triggers.sort((a, b) => a.position.x - b.position.x)[0];
    }

    return candidates.sort((a, b) => a.position.x - b.position.x)[0];
  }

  private findNextNode(currentNodeId: string, outputId: string): WorkflowNode | null {
    const edges = this.edgesBySource.get(currentNodeId) || [];

    // Try exact match on sourceHandle
    let edge = edges.find((e) => e.sourceHandle === outputId);

    // Fallback: default handle
    if (!edge && outputId !== 'default') {
      edge = edges.find((e) => e.sourceHandle === 'default' || !e.sourceHandle);
    }

    // Fallback: any edge from this node
    if (!edge && edges.length > 0) {
      edge = edges[0];
    }

    if (!edge) {
      this.emit({ type: 'NO_NEXT_STEP', nodeId: currentNodeId, outputId });
      return null;
    }

    return this.nodeMap.get(edge.target) || null;
  }

  private handleAutoAdvance(node: WorkflowNode): void {
    const { type, config } = node.data;

    // DELAY nodes auto-advance after their configured duration
    if (type === 'DELAY') {
      const duration = config.duration || 5;
      const unit = config.unit || 'seconds';
      let ms = duration * 1000;
      if (unit === 'minutes') ms = duration * 60 * 1000;
      if (unit === 'hours') ms = duration * 3600 * 1000;

      setTimeout(() => {
        if (this.state.currentNodeId === node.id && this.state.status === 'running') {
          this.completeStep('default', { delayed: true, delayMs: ms });
        }
      }, ms);
    }

    // CONDITION nodes auto-evaluate based on collected data
    if (type === 'CONDITION') {
      const result = this.evaluateCondition(node);
      // Don't auto-advance conditions — let the UI show the branch,
      // but provide the evaluation result
      // The step renderer will call completeStep('then') or completeStep('else')
    }
  }

  /** Evaluate a CONDITION node against collected data */
  evaluateCondition(node: WorkflowNode): boolean {
    const { field, operator, value } = node.data.config;
    const fieldValue = this.state.collectedData[field];

    switch (operator) {
      case 'equals':
        return String(fieldValue) === String(value);
      case 'not_equals':
        return String(fieldValue) !== String(value);
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue || '').includes(String(value));
      case 'is_true':
        return !!fieldValue;
      case 'is_false':
        return !fieldValue;
      default:
        return false;
    }
  }

  private setError(error: string): void {
    this.state.status = 'error';
    this.state.error = error;
    this.emit({ type: 'WORKFLOW_ERROR', error });
  }
}
