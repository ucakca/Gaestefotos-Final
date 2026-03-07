'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Loader2, RotateCcw } from 'lucide-react';

// ─── Custom Node Components ─────────────────────────────────────────────────

function InputNode({ data }: NodeProps) {
  const d = data as Record<string, any>;
  return (
    <div className="px-4 py-3 rounded-xl bg-blue-900/60 border-2 border-blue-500/50 min-w-[160px] shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-blue-300/60 mb-1">Input</div>
      <div className="text-sm font-semibold text-blue-100">{d.label}</div>
      {d.inputType && (
        <div className="text-[10px] text-blue-300/40 mt-1">{d.inputType}</div>
      )}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-200" />
    </div>
  );
}

function ConfigNode({ data }: NodeProps) {
  const d = data as Record<string, any>;
  return (
    <div className="px-4 py-3 rounded-xl bg-yellow-900/60 border-2 border-yellow-500/50 min-w-[160px] shadow-lg">
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-yellow-400 !border-2 !border-yellow-200" />
      <div className="text-[10px] uppercase tracking-wider text-yellow-300/60 mb-1">Config</div>
      <div className="text-sm font-semibold text-yellow-100">{d.label}</div>
      {d.configType && (
        <div className="text-[10px] text-yellow-300/40 mt-1">{d.configType}</div>
      )}
    </div>
  );
}

function ProcessorNode({ data }: NodeProps) {
  const d = data as Record<string, any>;
  const executorColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    COMFYUI: { bg: 'bg-purple-900/60', border: 'border-purple-500/50', text: 'text-purple-100', accent: 'text-purple-300' },
    LLM: { bg: 'bg-green-900/60', border: 'border-green-500/50', text: 'text-green-100', accent: 'text-green-300' },
    LOCAL: { bg: 'bg-cyan-900/60', border: 'border-cyan-500/50', text: 'text-cyan-100', accent: 'text-cyan-300' },
    EXTERNAL: { bg: 'bg-orange-900/60', border: 'border-orange-500/50', text: 'text-orange-100', accent: 'text-orange-300' },
  };
  const c = executorColors[d.executor || 'LOCAL'] || executorColors.LOCAL;

  return (
    <div className={`px-4 py-3 rounded-xl ${c.bg} border-2 ${c.border} min-w-[180px] shadow-lg`}>
      <Handle type="target" position={Position.Left} id="input" className="!w-3 !h-3 !bg-white/60 !border-2 !border-white/40 !top-[55%]" />
      <Handle type="target" position={Position.Left} id="prompt" className="!w-3 !h-3 !bg-yellow-400 !border-2 !border-yellow-200 !top-[30%]" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-white/60 !border-2 !border-white/40" />
      <div className={`text-[10px] uppercase tracking-wider ${c.accent}/60 mb-1`}>Processor</div>
      <div className={`text-sm font-semibold ${c.text}`}>{d.label}</div>
      {d.executor && (
        <div className={`text-[10px] ${c.accent}/40 mt-1`}>{d.executor}</div>
      )}
    </div>
  );
}

function OutputNode({ data }: NodeProps) {
  const d = data as Record<string, any>;
  return (
    <div className="px-4 py-3 rounded-xl bg-emerald-900/60 border-2 border-emerald-500/50 min-w-[160px] shadow-lg">
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-emerald-200" />
      <div className="text-[10px] uppercase tracking-wider text-emerald-300/60 mb-1">Output</div>
      <div className="text-sm font-semibold text-emerald-100">{d.label}</div>
      {d.outputType && (
        <div className="text-[10px] text-emerald-300/40 mt-1">{d.outputType}</div>
      )}
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PipelineNode {
  id: string;
  pipelineId: string;
  nodeId: string;
  nodeType: string;
  label: string;
  positionX: number;
  positionY: number;
  width?: number | null;
  height?: number | null;
  config: any;
  connections: any[];
}

interface PipelineNodeEditorProps {
  pipelineId: string;
  pipelineName: string;
  nodes: PipelineNode[];
  onSave: (nodes: any[]) => Promise<void>;
}

// ─── Main Component ─────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  input: InputNode,
  config: ConfigNode,
  processor: ProcessorNode,
  output: OutputNode,
};

function pipelineNodesToFlow(pNodes: PipelineNode[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = pNodes.map((n) => ({
    id: n.nodeId,
    type: n.nodeType,
    position: { x: n.positionX, y: n.positionY },
    data: {
      label: n.label,
      ...(n.config || {}),
    },
    ...(n.width ? { width: n.width } : {}),
    ...(n.height ? { height: n.height } : {}),
  }));

  const edges: Edge[] = [];
  for (const n of pNodes) {
    if (n.connections && Array.isArray(n.connections)) {
      for (const conn of n.connections) {
        edges.push({
          id: `${n.nodeId}->${conn.targetNodeId}`,
          source: n.nodeId,
          target: conn.targetNodeId,
          sourceHandle: undefined,
          targetHandle: conn.targetPort || undefined,
          animated: true,
          style: { stroke: 'rgba(168, 85, 247, 0.4)', strokeWidth: 2 },
        });
      }
    }
  }

  return { nodes, edges };
}

function flowToPipelineNodes(nodes: Node[], edges: Edge[], pipelineId: string): any[] {
  return nodes.map((n) => {
    const connections = edges
      .filter((e) => e.source === n.id)
      .map((e) => ({
        targetNodeId: e.target,
        targetPort: e.targetHandle || 'input',
      }));

    const { label, ...configData } = n.data as any;

    return {
      nodeId: n.id,
      nodeType: n.type || 'input',
      label: label || n.id,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      width: n.width ? Math.round(n.width) : null,
      height: n.height ? Math.round(n.height) : null,
      config: Object.keys(configData).length > 0 ? configData : null,
      connections,
    };
  });
}

export default function PipelineNodeEditor({
  pipelineId,
  pipelineName,
  nodes: initialPipelineNodes,
  onSave,
}: PipelineNodeEditorProps) {
  const initial = useMemo(() => pipelineNodesToFlow(initialPipelineNodes), [initialPipelineNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'rgba(168, 85, 247, 0.4)', strokeWidth: 2 } }, eds));
      setHasChanges(true);
    },
    [setEdges],
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setHasChanges(true);
    },
    [onNodesChange],
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setHasChanges(true);
    },
    [onEdgesChange],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const pipelineNodes = flowToPipelineNodes(nodes, edges, pipelineId);
      await onSave(pipelineNodes);
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const reset = pipelineNodesToFlow(initialPipelineNodes);
    setNodes(reset.nodes);
    setEdges(reset.edges);
    setHasChanges(false);
  };

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: 'rgba(168, 85, 247, 0.4)', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0a0a1a' }}
      >
        <Background color="rgba(168, 85, 247, 0.06)" gap={20} size={1} />
        <Controls
          className="!bg-white/5 !border-white/10 !rounded-xl [&>button]:!bg-white/5 [&>button]:!border-white/10 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10"
        />
        <MiniMap
          className="!bg-white/5 !border-white/10 !rounded-xl"
          nodeColor={(n) => {
            switch (n.type) {
              case 'input': return '#3b82f6';
              case 'config': return '#eab308';
              case 'processor': return '#a855f7';
              case 'output': return '#10b981';
              default: return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />

        <Panel position="top-right" className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Nodes speichern
          </button>
        </Panel>

        <Panel position="top-left">
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/50">
            {pipelineName} — {nodes.length} Nodes, {edges.length} Verbindungen
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
