'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus, Save, Loader2, Trash2, X, FolderOpen,
  FileDown, ChevronLeft, List, Workflow,
  Camera, Wand2, Printer, Gamepad2, QrCode,
} from 'lucide-react';
import WorkflowNodeComponent from '@/components/workflow-builder/WorkflowNode';
import StepPalette from '@/components/workflow-builder/StepPalette';
import ConfigPanel from '@/components/workflow-builder/ConfigPanel';
import { WORKFLOW_PRESETS } from '@/components/workflow-builder/presets';
import type { StepTypeDefinition, WorkflowNodeData } from '@/components/workflow-builder/types';
import api from '@/lib/api';

const nodeTypes = { workflowStep: WorkflowNodeComponent };

const PRESET_ICONS: Record<string, any> = { Camera, Wand2, Printer, Gamepad2, QrCode };

let globalNodeId = 0;
function nextNodeId() { return `node-${++globalNodeId}-${Date.now()}`; }

// ─── Inner Editor (needs ReactFlow context) ──────────────────────────────────

function WorkflowEditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDesc, setWorkflowDesc] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isDefault, setIsDefault] = useState(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [showPresets, setShowPresets] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // ─── Load workflows ───
  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/workflows');
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  // ─── Edge connect ───
  const onConnect = useCallback((connection: Connection) => {
    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      animated: false,
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  // ─── Add step from palette ───
  const handleAddStep = useCallback((stepDef: StepTypeDefinition) => {
    const id = nextNodeId();
    const existingCount = nodes.length;
    const x = 50 + (existingCount % 5) * 280;
    const y = 80 + Math.floor(existingCount / 5) * 200;

    const newNode: Node = {
      id,
      type: 'workflowStep',
      position: { x, y },
      data: {
        type: stepDef.type,
        label: stepDef.label,
        category: stepDef.category,
        stepNumber: existingCount + 1,
        config: { ...stepDef.defaultConfig },
        color: stepDef.color,
        bgColor: stepDef.bgColor,
        borderColor: stepDef.borderColor,
        icon: stepDef.icon,
        outputs: stepDef.outputs,
      } satisfies WorkflowNodeData,
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  // ─── Drop handler for drag from palette ───
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const stepData = e.dataTransfer.getData('application/workflow-step');
    if (!stepData) return;

    const stepDef: StepTypeDefinition = JSON.parse(stepData);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = nextNodeId();

    const newNode: Node = {
      id,
      type: 'workflowStep',
      position,
      data: {
        type: stepDef.type,
        label: stepDef.label,
        category: stepDef.category,
        stepNumber: nodes.length + 1,
        config: { ...stepDef.defaultConfig },
        color: stepDef.color,
        bgColor: stepDef.bgColor,
        borderColor: stepDef.borderColor,
        icon: stepDef.icon,
        outputs: stepDef.outputs,
      } satisfies WorkflowNodeData,
    };

    setNodes((nds) => [...nds, newNode]);
  }, [nodes, screenToFlowPosition, setNodes]);

  // ─── Node selection ───
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // ─── Update node config ───
  const handleUpdateConfig = useCallback((nodeId: string, config: Record<string, any>) => {
    setNodes((nds: Node[]) => nds.map((n: Node) =>
      n.id === nodeId ? { ...n, data: { ...(n.data as Record<string, any>), config } } : n
    ));
  }, [setNodes]);

  const handleUpdateLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds: Node[]) => nds.map((n: Node) =>
      n.id === nodeId ? { ...n, data: { ...(n.data as Record<string, any>), label } } : n
    ));
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds: Node[]) => nds.filter((n: Node) => n.id !== nodeId));
    setEdges((eds: Edge[]) => eds.filter((e: Edge) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  // ─── Renumber steps ───
  useEffect(() => {
    // Topological-ish ordering based on x position
    const sorted = [...nodes].sort((a: Node, b: Node) => a.position.x - b.position.x || a.position.y - b.position.y);
    let changed = false;
    const updated = sorted.map((n: Node, idx: number) => {
      const d = n.data as unknown as WorkflowNodeData;
      if (d.stepNumber !== idx + 1) {
        changed = true;
        return { ...n, data: { ...(n.data as Record<string, any>), stepNumber: idx + 1 } };
      }
      return n;
    });
    if (changed) {
      setNodes(updated as Node[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ─── Load preset ───
  const loadPreset = useCallback((preset: typeof WORKFLOW_PRESETS[0]) => {
    setNodes(preset.nodes);
    setEdges(preset.edges);
    setWorkflowName(preset.name);
    setWorkflowDesc(preset.description);
    setShowPresets(false);
    setShowList(false);
    setEditingId(null);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setNodes, setEdges, fitView]);

  // ─── Load saved workflow ───
  const loadWorkflow = useCallback((wf: any) => {
    const savedNodes = wf.steps?.nodes || wf.nodes || [];
    const savedEdges = wf.steps?.edges || wf.edges || [];
    setNodes(savedNodes);
    setEdges(savedEdges);
    setWorkflowName(wf.name);
    setWorkflowDesc(wf.description || '');
    setIsPublic(wf.isPublic);
    setIsDefault(wf.isDefault);
    setEditingId(wf.id);
    setShowList(false);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setNodes, setEdges, fitView]);

  // ─── Save ───
  const handleSave = useCallback(async () => {
    if (!workflowName.trim() || nodes.length === 0) return;
    try {
      setSaving(true);
      const payload = {
        name: workflowName,
        description: workflowDesc || null,
        steps: { nodes, edges },
        isPublic,
        isDefault,
      };

      if (editingId) {
        await api.put(`/workflows/${editingId}`, payload);
      } else {
        await api.post('/workflows', payload);
      }

      await loadWorkflows();
      setShowList(true);
    } catch (err) {
      console.error('Save failed', err);
      alert('Fehler beim Speichern!');
    } finally {
      setSaving(false);
    }
  }, [workflowName, workflowDesc, nodes, edges, isPublic, isDefault, editingId, loadWorkflows]);

  // ─── Delete ───
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Workflow wirklich löschen?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      await loadWorkflows();
    } catch (err) {
      console.error('Delete failed', err);
    }
  }, [loadWorkflows]);

  // ─── New workflow ───
  const handleNew = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setWorkflowName('');
    setWorkflowDesc('');
    setIsPublic(false);
    setIsDefault(false);
    setEditingId(null);
    setSelectedNodeId(null);
    setShowList(false);
    setShowPresets(true);
  }, [setNodes, setEdges]);

  const handleBackToList = useCallback(() => {
    setShowList(true);
    setShowPresets(false);
    setSelectedNodeId(null);
  }, []);

  const selectedNode = selectedNodeId ? nodes.find((n: Node) => n.id === selectedNodeId) : null;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Workflow List
  // ──────────────────────────────────────────────────────────────────────────
  if (showList) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-blue-500" />
              Workflow Builder
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Visuelle Booth-Abläufe erstellen und verwalten</p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Neuer Workflow
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-20">
              <Workflow className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">Noch keine Workflows erstellt</p>
              <button
                onClick={handleNew}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Ersten Workflow erstellen
              </button>
            </div>
          ) : (
            <div className="grid gap-4 max-w-4xl">
              {workflows.map((wf) => {
                const nodeCount = wf.steps?.nodes?.length || (Array.isArray(wf.steps) ? (wf.steps as any[]).length : 0);
                return (
                  <div
                    key={wf.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => loadWorkflow(wf)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-800 truncate">{wf.name}</h3>
                          {wf.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Standard</span>
                          )}
                          {wf.isPublic && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Öffentlich</span>
                          )}
                        </div>
                        {wf.description && (
                          <p className="text-sm text-gray-500 truncate">{wf.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{nodeCount} Steps</span>
                          <span>·</span>
                          <span>{new Date(wf.createdAt).toLocaleDateString('de-DE')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }}
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Preset Selector
  // ──────────────────────────────────────────────────────────────────────────
  if (showPresets) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-200">
          <button onClick={handleBackToList} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Vorlage wählen</h2>
            <p className="text-sm text-gray-500">Starte mit einem Preset oder erstelle von Grund auf</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {/* Empty workflow */}
            <button
              onClick={() => { setShowPresets(false); }}
              className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
            >
              <Plus className="w-8 h-8 mx-auto text-gray-400 group-hover:text-blue-500 mb-2" />
              <h3 className="font-semibold text-gray-700 group-hover:text-blue-600">Leerer Workflow</h3>
              <p className="text-xs text-gray-400 mt-1">Von Grund auf erstellen</p>
            </button>

            {/* Presets */}
            {WORKFLOW_PRESETS.map((preset) => {
              const PresetIcon = PRESET_ICONS[preset.icon] || Workflow;
              return (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <PresetIcon className="w-8 h-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-gray-800">{preset.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preset.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                    <span>{preset.nodes.length} Nodes</span>
                    <span>·</span>
                    <span>{preset.edges.length} Verbindungen</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Visual Editor
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 z-10">
        <button onClick={handleBackToList} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow-Name *"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-800 w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <input
            type="text"
            value={workflowDesc}
            onChange={(e) => setWorkflowDesc(e.target.value)}
            placeholder="Beschreibung (optional)"
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="rounded" />
            Öffentlich
          </label>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="rounded" />
            Standard
          </label>
          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Vorlagen
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !workflowName.trim() || nodes.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Main area: palette + canvas + config */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Step Palette */}
        <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto p-3 flex-shrink-0">
          <StepPalette onAddStep={handleAddStep} />
        </div>

        {/* Center: React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              style: { stroke: '#94a3b8', strokeWidth: 2 },
              type: 'smoothstep',
            }}
            connectionLineStyle={{ stroke: '#94a3b8', strokeWidth: 2 }}
            snapToGrid
            snapGrid={[20, 20]}
            minZoom={0.2}
            maxZoom={2}
          >
            <Controls position="bottom-right" />
            <MiniMap
              position="bottom-left"
              nodeColor={(node) => {
                const d = node.data as unknown as WorkflowNodeData;
                switch (d?.category) {
                  case 'animation': return '#f97316';
                  case 'feature': return '#f59e0b';
                  case 'cloud': return '#3b82f6';
                  case 'hardware': return '#10b981';
                  default: return '#94a3b8';
                }
              }}
              maskColor="rgba(0,0,0,0.08)"
              style={{ borderRadius: 8 }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />

            {/* Empty state */}
            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-8 py-6 text-center mt-20">
                  <Workflow className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500 mb-1">Ziehe Steps aus der Palette hierher</p>
                  <p className="text-xs text-gray-400">oder klicke auf einen Step-Typ um ihn hinzuzufügen</p>
                </div>
              </Panel>
            )}

            {/* Stats */}
            {nodes.length > 0 && (
              <Panel position="top-right">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 px-3 py-2 text-xs text-gray-500 flex items-center gap-3">
                  <span>{nodes.length} Nodes</span>
                  <span>·</span>
                  <span>{edges.length} Edges</span>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right: Config Panel */}
        {selectedNode && (
          <div className="w-72 flex-shrink-0">
            <ConfigPanel
              nodeId={selectedNode.id}
              data={selectedNode.data as any as WorkflowNodeData}
              onUpdate={handleUpdateConfig}
              onUpdateLabel={handleUpdateLabel}
              onDelete={handleDeleteNode}
              onClose={() => setSelectedNodeId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page wrapper with ReactFlowProvider ──────────────────────────────────────

export default function WorkflowBuilderPage() {
  return (
    <div className="h-screen">
      <ReactFlowProvider>
        <WorkflowEditorInner />
      </ReactFlowProvider>
    </div>
  );
}
