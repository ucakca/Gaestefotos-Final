'use client';

import { useMemo } from 'react';
import {
  Camera,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Timer,
  Star,
  Edit3,
  CheckCircle2,
  Workflow,
  Play,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: string;
  label: string;
  duration?: number;
  config?: Record<string, any>;
}

interface WorkflowGraphVisualizerProps {
  steps: WorkflowStep[];
  activeStepIdx?: number;
  className?: string;
}

const STEP_STYLE: Record<string, {
  icon: React.FC<any>;
  bg: string;
  border: string;
  text: string;
  ring: string;
}> = {
  WELCOME: { icon: MessageSquare, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-400' },
  COUNTDOWN: { icon: Timer, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-400' },
  CAPTURE: { icon: Camera, bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-400' },
  PREVIEW: { icon: ImageIcon, bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-400' },
  FILTER: { icon: Sparkles, bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-400' },
  GRAFFITI: { icon: Edit3, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-400' },
  SHARE: { icon: Star, bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-400' },
  THANK_YOU: { icon: CheckCircle2, bg: 'bg-teal-50 dark:bg-teal-950/30', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-600 dark:text-teal-400', ring: 'ring-teal-400' },
  SUB_WORKFLOW: { icon: GitBranch, bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-400' },
};

const DEFAULT_STYLE = {
  icon: Workflow,
  bg: 'bg-gray-50 dark:bg-gray-950/30',
  border: 'border-gray-300 dark:border-gray-700',
  text: 'text-gray-600 dark:text-gray-400',
  ring: 'ring-gray-400',
};

// Node dimensions
const NODE_W = 160;
const NODE_H = 72;
const GAP_X = 48;
const PADDING = 24;

/**
 * Visual graph representation of a workflow's steps.
 * Renders nodes connected by arrows in a horizontal flow layout.
 */
export function WorkflowGraphVisualizer({ steps, activeStepIdx, className = '' }: WorkflowGraphVisualizerProps) {
  const layout = useMemo(() => {
    if (steps.length === 0) return { nodes: [], width: 0, height: 0 };

    const nodes = steps.map((step, idx) => {
      const x = PADDING + idx * (NODE_W + GAP_X);
      const y = PADDING;
      return { ...step, x, y, idx };
    });

    const width = PADDING * 2 + steps.length * NODE_W + (steps.length - 1) * GAP_X;
    const height = PADDING * 2 + NODE_H;

    return { nodes, width, height };
  }, [steps]);

  if (steps.length === 0) {
    return (
      <div className={`flex items-center justify-center py-6 text-muted-foreground text-sm ${className}`}>
        <Workflow className="w-5 h-5 mr-2 opacity-40" />
        Keine Steps — füge Steps hinzu um den Workflow zu visualisieren
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="min-w-full"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              className="fill-border"
            />
          </marker>
          <marker
            id="arrowhead-active"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 8 3, 0 6"
              className="fill-primary"
            />
          </marker>
        </defs>

        {/* Edges */}
        {layout.nodes.map((node, idx) => {
          if (idx === 0) return null;
          const prev = layout.nodes[idx - 1];
          const x1 = prev.x + NODE_W;
          const y1 = prev.y + NODE_H / 2;
          const x2 = node.x;
          const y2 = node.y + NODE_H / 2;
          const isActive = activeStepIdx !== undefined && idx === activeStepIdx;

          return (
            <line
              key={`edge-${idx}`}
              x1={x1 + 4}
              y1={y1}
              x2={x2 - 4}
              y2={y2}
              strokeWidth={isActive ? 2.5 : 1.5}
              markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
              className={isActive ? 'stroke-primary' : 'stroke-border'}
            />
          );
        })}

        {/* Nodes */}
        {layout.nodes.map((node) => {
          const style = STEP_STYLE[node.type] || DEFAULT_STYLE;
          const isActive = activeStepIdx === node.idx;

          return (
            <g key={node.id}>
              <foreignObject
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={NODE_H}
              >
                <div
                  className={`
                    w-full h-full rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-1
                    transition-all duration-200
                    ${style.bg} ${style.border}
                    ${isActive ? `ring-2 ${style.ring} shadow-lg scale-105` : 'shadow-sm'}
                  `}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-mono ${style.text} opacity-60`}>{node.idx + 1}</span>
                    <style.icon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground truncate max-w-[140px] text-center leading-tight">
                    {node.label}
                  </span>
                  {node.duration && (
                    <span className="text-[9px] text-muted-foreground">{node.duration}s</span>
                  )}
                  {node.type === 'SUB_WORKFLOW' && (
                    <span className="text-[9px] text-violet-500 font-medium">Sub-Flow</span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Start indicator */}
        <foreignObject x={2} y={PADDING + NODE_H / 2 - 10} width={20} height={20}>
          <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
        </foreignObject>
      </svg>
    </div>
  );
}
