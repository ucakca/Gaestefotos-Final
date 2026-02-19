'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, X,
  CheckCircle2, Clock, Zap, ArrowRight,
} from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import type { WorkflowNodeData } from './types';

interface SimulationPanelProps {
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onHighlightNode: (nodeId: string | null) => void;
}

type SimState = 'idle' | 'running' | 'paused' | 'done';

interface StepLog {
  nodeId: string;
  label: string;
  type: string;
  status: 'pending' | 'active' | 'done' | 'skipped';
  timestamp: number;
  duration?: number;
}

export default function SimulationPanel({ nodes, edges, onClose, onHighlightNode }: SimulationPanelProps) {
  const [simState, setSimState] = useState<SimState>('idle');
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [stepLog, setStepLog] = useState<StepLog[]>([]);
  const [speed, setSpeed] = useState(1000); // ms per step

  // Build execution order (topological sort by edges from triggers)
  const executionOrder = useCallback(() => {
    const triggerNodes = nodes.filter((n) => {
      const d = n.data as unknown as WorkflowNodeData;
      return d?.category === 'trigger';
    });

    const startNodes = triggerNodes.length > 0
      ? triggerNodes
      : nodes.filter((n) => !edges.some((e) => e.target === n.id));

    if (startNodes.length === 0 && nodes.length > 0) return [nodes[0].id];

    const visited = new Set<string>();
    const order: string[] = [];
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    }

    function bfs(startId: string) {
      const queue = [startId];
      while (queue.length > 0) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        order.push(id);
        for (const next of adj.get(id) || []) {
          if (!visited.has(next)) queue.push(next);
        }
      }
    }

    for (const start of startNodes) bfs(start.id);

    // Add any unvisited nodes
    for (const n of nodes) {
      if (!visited.has(n.id)) order.push(n.id);
    }

    return order;
  }, [nodes, edges]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const initStepLog = useCallback(() => {
    const order = executionOrder();
    return order.map((id) => {
      const node = nodeMap.get(id);
      const d = node?.data as unknown as WorkflowNodeData;
      return {
        nodeId: id,
        label: d?.label || id,
        type: d?.type || 'unknown',
        status: 'pending' as const,
        timestamp: 0,
      };
    });
  }, [executionOrder, nodeMap]);

  const handleStart = () => {
    const log = initStepLog();
    setStepLog(log);
    setCurrentIdx(0);
    setSimState('running');
    if (log.length > 0) {
      onHighlightNode(log[0].nodeId);
    }
  };

  const handlePause = () => setSimState('paused');
  const handleResume = () => setSimState('running');

  const handleReset = () => {
    setSimState('idle');
    setCurrentIdx(-1);
    setStepLog([]);
    onHighlightNode(null);
  };

  const advanceStep = useCallback(() => {
    setStepLog((prev) => {
      const next = [...prev];
      if (currentIdx >= 0 && currentIdx < next.length) {
        next[currentIdx] = { ...next[currentIdx], status: 'done', duration: speed };
      }
      if (currentIdx + 1 < next.length) {
        next[currentIdx + 1] = { ...next[currentIdx + 1], status: 'active', timestamp: Date.now() };
      }
      return next;
    });

    const nextIdx = currentIdx + 1;
    if (nextIdx < stepLog.length) {
      setCurrentIdx(nextIdx);
      onHighlightNode(stepLog[nextIdx]?.nodeId || null);
    } else {
      setSimState('done');
      onHighlightNode(null);
    }
  }, [currentIdx, stepLog, speed, onHighlightNode]);

  const handleSkip = () => {
    if (simState === 'running' || simState === 'paused') {
      advanceStep();
    }
  };

  // Auto-advance when running
  useEffect(() => {
    if (simState !== 'running' || currentIdx < 0) return;

    // Mark current as active
    setStepLog((prev) => {
      const next = [...prev];
      if (next[currentIdx]?.status === 'pending') {
        next[currentIdx] = { ...next[currentIdx], status: 'active', timestamp: Date.now() };
      }
      return next;
    });

    const timer = setTimeout(() => {
      advanceStep();
    }, speed);

    return () => clearTimeout(timer);
  }, [simState, currentIdx, speed, advanceStep]);

  const progress = stepLog.length > 0
    ? Math.round((stepLog.filter((s) => s.status === 'done').length / stepLog.length) * 100)
    : 0;

  return (
    <div className="absolute bottom-4 right-4 w-[340px] max-h-[420px] bg-card rounded-xl border border-border shadow-2xl z-30 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-violet-50">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-sm text-foreground">Test-Modus</span>
          {simState !== 'idle' && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="text-xs px-1.5 py-0.5 rounded border border-border bg-app-card text-app-fg"
          >
            <option value={2000}>0.5x</option>
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={200}>5x</option>
          </select>
          <button onClick={onClose} className="p-1 rounded hover:bg-black/5 ml-1">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {simState !== 'idle' && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        {simState === 'idle' ? (
          <button
            onClick={handleStart}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" /> Simulation starten
          </button>
        ) : simState === 'done' ? (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Neustart
          </button>
        ) : (
          <>
            {simState === 'running' ? (
              <button onClick={handlePause} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-200">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button onClick={handleResume} className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg hover:bg-violet-200">
                <Play className="w-3.5 h-3.5" /> Weiter
              </button>
            )}
            <button onClick={handleSkip} className="flex items-center gap-1 px-2.5 py-1.5 bg-muted text-foreground text-xs rounded-lg hover:bg-muted/80">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
            <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </>
        )}

        {simState === 'done' && (
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium ml-auto">
            <CheckCircle2 className="w-3.5 h-3.5" /> Abgeschlossen
          </span>
        )}
      </div>

      {/* Step Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {simState === 'idle' ? (
          <div className="text-center py-6">
            <Zap className="w-8 h-8 text-violet-300 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Simuliere den Workflow-Ablauf Schritt für Schritt</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{nodes.length} Steps werden durchlaufen</p>
          </div>
        ) : (
          stepLog.map((step, i) => (
            <div
              key={step.nodeId}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer hover:bg-muted/50 ${
                step.status === 'active'
                  ? 'bg-violet-50 border border-violet-200 ring-1 ring-violet-300'
                  : step.status === 'done'
                  ? 'bg-emerald-50/50'
                  : 'opacity-50'
              }`}
              onClick={() => onHighlightNode(step.nodeId)}
            >
              {/* Status indicator */}
              <div className="shrink-0">
                {step.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : step.status === 'active' ? (
                  <div className="w-4 h-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground/40" />
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  <span className="text-muted-foreground/60">#{i + 1}</span> {step.label}
                </div>
                <div className="text-muted-foreground/60 font-mono">{step.type}</div>
              </div>

              {/* Arrow indicator for active */}
              {step.status === 'active' && (
                <ArrowRight className="w-3.5 h-3.5 text-violet-500 animate-pulse shrink-0" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
