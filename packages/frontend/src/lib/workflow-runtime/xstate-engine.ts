// ─── XState-based Workflow Runtime Engine ───────────────────────────────────
// Replaces the custom WorkflowEngine class with a formal XState state machine.
// Provides the same public API but with proper state machine guarantees,
// guards, actions, and devtools support.

import { setup, assign, createActor, type AnyActorRef } from 'xstate';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowState,
  StepResult,
  EngineEvent,
  EngineEventListener,
} from './types';

// ─── XState Context & Events ────────────────────────────────────────────────

interface WorkflowContext {
  definition: WorkflowDefinition;
  nodeMap: Map<string, WorkflowNode>;
  edgesBySource: Map<string, WorkflowEdge[]>;
  currentNodeId: string | null;
  history: StepResult[];
  collectedData: Record<string, any>;
  error: string | null;
  startedAt: number | null;
}

type WorkflowMachineEvent =
  | { type: 'START' }
  | { type: 'RESET' }
  | { type: 'COMPLETE_STEP'; outputId: string; data: Record<string, any> }
  | { type: 'GO_BACK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ERROR'; error: string };

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildNodeMap(def: WorkflowDefinition): Map<string, WorkflowNode> {
  const map = new Map<string, WorkflowNode>();
  for (const node of def.steps.nodes) {
    map.set(node.id, node);
  }
  return map;
}

function buildEdgeIndex(def: WorkflowDefinition): Map<string, WorkflowEdge[]> {
  const map = new Map<string, WorkflowEdge[]>();
  for (const edge of def.steps.edges) {
    const existing = map.get(edge.source) || [];
    existing.push(edge);
    map.set(edge.source, existing);
  }
  return map;
}

function findStartNode(def: WorkflowDefinition, nodeMap: Map<string, WorkflowNode>): WorkflowNode | null {
  const nodesWithIncoming = new Set<string>();
  for (const edge of def.steps.edges) {
    nodesWithIncoming.add(edge.target);
  }

  const candidates = def.steps.nodes.filter((n) => !nodesWithIncoming.has(n.id));

  if (candidates.length === 0) {
    return def.steps.nodes[0] || null;
  }

  const triggers = candidates.filter(
    (n) => n.data.type.startsWith('TRIGGER_') || n.data.type === 'TOUCH_TO_START'
  );

  if (triggers.length > 0) {
    return triggers.sort((a, b) => a.position.x - b.position.x)[0];
  }

  return candidates.sort((a, b) => a.position.x - b.position.x)[0];
}

function findNextNode(
  currentNodeId: string,
  outputId: string,
  edgesBySource: Map<string, WorkflowEdge[]>,
  nodeMap: Map<string, WorkflowNode>
): WorkflowNode | null {
  const edges = edgesBySource.get(currentNodeId) || [];

  let edge = edges.find((e) => e.sourceHandle === outputId);
  if (!edge && outputId !== 'default') {
    edge = edges.find((e) => e.sourceHandle === 'default' || !e.sourceHandle);
  }
  if (!edge && edges.length > 0) {
    edge = edges[0];
  }
  if (!edge) return null;

  return nodeMap.get(edge.target) || null;
}

function evaluateConditionFromData(node: WorkflowNode, collectedData: Record<string, any>): boolean {
  const { field, operator, value } = node.data.config;
  const fieldValue = collectedData[field];

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

// ─── XState Machine Definition ──────────────────────────────────────────────

function createWorkflowMachine(definition: WorkflowDefinition) {
  const nodeMap = buildNodeMap(definition);
  const edgesBySource = buildEdgeIndex(definition);

  return setup({
    types: {
      context: {} as WorkflowContext,
      events: {} as WorkflowMachineEvent,
    },
    guards: {
      hasHistory: ({ context }) => context.history.length > 0,
      hasStartNode: ({ context }) => {
        return findStartNode(context.definition, context.nodeMap) !== null;
      },
      hasNextNode: ({ context, event }) => {
        if (event.type !== 'COMPLETE_STEP' || !context.currentNodeId) return false;
        return findNextNode(context.currentNodeId, event.outputId, context.edgesBySource, context.nodeMap) !== null;
      },
    },
    actions: {
      setStartNode: assign(({ context }) => {
        const startNode = findStartNode(context.definition, context.nodeMap);
        return {
          currentNodeId: startNode?.id || null,
          startedAt: Date.now(),
          history: [] as StepResult[],
          collectedData: {} as Record<string, any>,
          error: null,
        };
      }),
      recordStepAndAdvance: assign(({ context, event }) => {
        if (event.type !== 'COMPLETE_STEP' || !context.currentNodeId) return {};

        const result: StepResult = {
          nodeId: context.currentNodeId,
          outputId: event.outputId,
          data: event.data,
          timestamp: Date.now(),
        };

        const newHistory = [...context.history, result];
        const newData = { ...context.collectedData, ...event.data };
        const nextNode = findNextNode(context.currentNodeId, event.outputId, context.edgesBySource, context.nodeMap);

        return {
          history: newHistory,
          collectedData: newData,
          currentNodeId: nextNode?.id || null,
        };
      }),
      completeWorkflow: assign(({ context, event }) => {
        if (event.type !== 'COMPLETE_STEP' || !context.currentNodeId) return {};

        const result: StepResult = {
          nodeId: context.currentNodeId,
          outputId: event.outputId,
          data: event.data,
          timestamp: Date.now(),
        };

        return {
          history: [...context.history, result],
          collectedData: { ...context.collectedData, ...event.data },
          currentNodeId: null,
        };
      }),
      goBackOneStep: assign(({ context }) => {
        const newHistory = [...context.history];
        newHistory.pop();

        const newData: Record<string, any> = {};
        for (const h of newHistory) {
          Object.assign(newData, h.data);
        }

        const prevNodeId = newHistory.length > 0
          ? newHistory[newHistory.length - 1].nodeId
          : findStartNode(context.definition, context.nodeMap)?.id || null;

        // Actually go back to the step we just popped (the one the user wants to redo)
        const lastResult = context.history[context.history.length - 1];

        return {
          history: newHistory,
          collectedData: newData,
          currentNodeId: lastResult?.nodeId || prevNodeId,
        };
      }),
      resetContext: assign(() => ({
        currentNodeId: null,
        history: [] as StepResult[],
        collectedData: {} as Record<string, any>,
        error: null,
        startedAt: null,
      })),
      setErrorMsg: assign(({ event }) => ({
        error: event.type === 'ERROR' ? event.error : 'Unbekannter Fehler',
      })),
    },
  }).createMachine({
    id: 'workflow',
    context: {
      definition,
      nodeMap,
      edgesBySource,
      currentNodeId: null,
      history: [],
      collectedData: {},
      error: null,
      startedAt: null,
    },
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: [
            {
              guard: 'hasStartNode',
              target: 'running',
              actions: 'setStartNode',
            },
            {
              target: 'error',
              actions: assign({ error: 'Kein Start-Node gefunden' }),
            },
          ],
        },
      },
      running: {
        on: {
          COMPLETE_STEP: [
            {
              guard: 'hasNextNode',
              target: 'running',
              actions: 'recordStepAndAdvance',
            },
            {
              target: 'completed',
              actions: 'completeWorkflow',
            },
          ],
          GO_BACK: {
            guard: 'hasHistory',
            target: 'running',
            actions: 'goBackOneStep',
          },
          PAUSE: 'paused',
          ERROR: {
            target: 'error',
            actions: 'setErrorMsg',
          },
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      paused: {
        on: {
          RESUME: 'running',
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      completed: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
      error: {
        on: {
          RESET: {
            target: 'idle',
            actions: 'resetContext',
          },
        },
      },
    },
  });
}

// ─── XState-backed WorkflowEngine (same public API as old engine) ───────────

export class XStateWorkflowEngine {
  private definition: WorkflowDefinition;
  private nodeMap: Map<string, WorkflowNode>;
  private actor: AnyActorRef;
  private listeners: Set<EngineEventListener> = new Set();

  constructor(definition: WorkflowDefinition) {
    this.definition = definition;
    this.nodeMap = buildNodeMap(definition);

    const machine = createWorkflowMachine(definition);
    this.actor = createActor(machine);

    // Subscribe to state changes and emit EngineEvents
    this.actor.subscribe((snapshot) => {
      const ctx = snapshot.context as WorkflowContext;
      const stateValue = snapshot.value as string;

      // Emit events based on state transitions
      if (stateValue === 'completed') {
        this.emit({ type: 'WORKFLOW_COMPLETED', collectedData: ctx.collectedData });
      } else if (stateValue === 'error') {
        this.emit({ type: 'WORKFLOW_ERROR', error: ctx.error || 'Unbekannter Fehler' });
      } else if (stateValue === 'running' && ctx.currentNodeId) {
        const node = this.nodeMap.get(ctx.currentNodeId);
        if (node) {
          this.emit({ type: 'STEP_ENTERED', nodeId: ctx.currentNodeId, node });
        }
      }
    });

    this.actor.start();
  }

  // ─── Public API (compatible with old WorkflowEngine) ──────────────────

  getState(): WorkflowState {
    const snapshot = this.actor.getSnapshot();
    const ctx = snapshot.context as WorkflowContext;
    const stateValue = snapshot.value as string;

    return {
      status: stateValue as any,
      currentNodeId: ctx.currentNodeId,
      history: ctx.history,
      collectedData: ctx.collectedData,
      error: ctx.error,
      startedAt: ctx.startedAt,
    };
  }

  getDefinition(): WorkflowDefinition {
    return this.definition;
  }

  getCurrentNode(): WorkflowNode | null {
    const ctx = (this.actor.getSnapshot().context as WorkflowContext);
    if (!ctx.currentNodeId) return null;
    return this.nodeMap.get(ctx.currentNodeId) || null;
  }

  getNode(nodeId: string): WorkflowNode | null {
    return this.nodeMap.get(nodeId) || null;
  }

  getAllNodes(): WorkflowNode[] {
    return this.definition.steps.nodes;
  }

  start(): void {
    this.actor.send({ type: 'START' });
  }

  reset(): void {
    this.actor.send({ type: 'RESET' });
  }

  completeStep(outputId: string = 'default', data: Record<string, any> = {}): void {
    // Emit STEP_COMPLETED before transition
    const ctx = this.actor.getSnapshot().context as WorkflowContext;
    if (ctx.currentNodeId) {
      const result: StepResult = {
        nodeId: ctx.currentNodeId,
        outputId,
        data,
        timestamp: Date.now(),
      };
      this.emit({ type: 'STEP_COMPLETED', nodeId: ctx.currentNodeId, result });
    }

    this.actor.send({ type: 'COMPLETE_STEP', outputId, data });
  }

  goBack(): boolean {
    const ctx = this.actor.getSnapshot().context as WorkflowContext;
    if (ctx.history.length === 0) return false;
    this.actor.send({ type: 'GO_BACK' });
    return true;
  }

  pause(): void {
    this.actor.send({ type: 'PAUSE' });
  }

  resume(): void {
    this.actor.send({ type: 'RESUME' });
  }

  evaluateCondition(node: WorkflowNode): boolean {
    const ctx = this.actor.getSnapshot().context as WorkflowContext;
    return evaluateConditionFromData(node, ctx.collectedData);
  }

  // ─── Event System ─────────────────────────────────────────────────────

  on(listener: EngineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[XStateWorkflowEngine] Listener error:', e);
      }
    }
  }

  /** Stop the XState actor (cleanup) */
  destroy(): void {
    this.actor.stop();
    this.listeners.clear();
  }
}
