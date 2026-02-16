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
  Lock, Unlock, Copy, History, Shield, RotateCcw,
  ShieldCheck, Play, Undo2, Redo2,
} from 'lucide-react';
import WorkflowNodeComponent from '@/components/workflow-builder/WorkflowNode';
import StepPalette from '@/components/workflow-builder/StepPalette';
import ConfigPanel from '@/components/workflow-builder/ConfigPanel';
import ValidationPanel from '@/components/workflow-builder/ValidationPanel';
import SimulationPanel from '@/components/workflow-builder/SimulationPanel';
import { validateWorkflow, type ValidationResult } from '@/components/workflow-builder/validation';
import { WORKFLOW_PRESETS } from '@/components/workflow-builder/presets';
import type { StepTypeDefinition, WorkflowNodeData } from '@/components/workflow-builder/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const nodeTypes = { workflowStep: WorkflowNodeComponent };

const PRESET_ICONS: Record<string, any> = { Camera, Wand2, Printer, Gamepad2, QrCode };

const FLOW_TYPE_OPTIONS = [
  { value: 'BOOTH', label: 'Photo Booth', icon: '📷' },
  { value: 'MIRROR_BOOTH', label: 'Mirror Booth', icon: '🪞' },
  { value: 'KI_BOOTH', label: 'KI Booth', icon: '🤖' },
  { value: 'KI_KUNST', label: 'KI-Kunst', icon: '🎨' },
  { value: 'FOTO_SPIEL', label: 'Foto-Spiele', icon: '🎮' },
  { value: 'UPLOAD', label: 'Upload Flow', icon: '📤' },
  { value: 'FACE_SEARCH', label: 'Face Search', icon: '👤' },
  { value: 'MOSAIC', label: 'Mosaic Wall', icon: '🧩' },
  { value: 'GUESTBOOK', label: 'Gästebuch', icon: '📖' },
  { value: 'SPINNER', label: '360° Spinner', icon: '🔄' },
  { value: 'DRAWBOT', label: 'Drawbot', icon: '✏️' },
  { value: 'CUSTOM', label: 'Custom', icon: '⚙️' },
];

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
  const [flowType, setFlowType] = useState('BOOTH');
  const [isPublic, setIsPublic] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [showBackups, setShowBackups] = useState<string | null>(null);
  const [backups, setBackups] = useState<any[]>([]);

  // Phase 1: Validation, Simulation, Undo/Redo
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const lastSnapshotRef = useRef<string>('');

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

  // ─── Undo/Redo snapshot tracking ───
  const pushSnapshot = useCallback(() => {
    const snap = JSON.stringify({ nodes, edges });
    if (snap === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snap;
    setUndoStack((prev) => [...prev.slice(-29), { nodes: JSON.parse(snap).nodes, edges: JSON.parse(snap).edges }]);
    setRedoStack([]);
  }, [nodes, edges]);

  // Track changes with debounce
  useEffect(() => {
    if (showList || showPresets) return;
    const timer = setTimeout(pushSnapshot, 500);
    return () => clearTimeout(timer);
  }, [nodes, edges, showList, showPresets, pushSnapshot]);

  const handleUndo = useCallback(() => {
    if (undoStack.length < 2) return;
    const prev = undoStack[undoStack.length - 2];
    const current = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, current]);
    setUndoStack((u) => u.slice(0, -1));
    setNodes(prev.nodes);
    setEdges(prev.edges);
    lastSnapshotRef.current = JSON.stringify(prev);
  }, [undoStack, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setUndoStack((u) => [...u, next]);
    setNodes(next.nodes);
    setEdges(next.edges);
    lastSnapshotRef.current = JSON.stringify(next);
  }, [redoStack, setNodes, setEdges]);

  // Keyboard shortcuts: Ctrl+Z = Undo, Ctrl+Shift+Z = Redo
  useEffect(() => {
    if (showList || showPresets) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showList, showPresets, handleUndo, handleRedo]);

  // ─── Validation handler ───
  const handleValidate = useCallback(() => {
    const result = validateWorkflow(nodes, edges, workflowName);
    setValidationResult(result);
    if (result.valid && result.warnings.length === 0) {
      toast.success('Workflow ist valide');
    } else if (result.valid) {
      toast(`${result.warnings.length} Warnung(en)`, { icon: '⚠️' });
    } else {
      toast.error(`${result.errors.length} Fehler gefunden`);
    }
  }, [nodes, edges, workflowName]);

  // ─── Focus node (from validation/simulation) ───
  const handleFocusNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setHighlightedNodeId(nodeId);
    const node = nodes.find((n: Node) => n.id === nodeId);
    if (node) {
      fitView({ nodes: [node], padding: 0.5, duration: 300 });
    }
    setTimeout(() => setHighlightedNodeId(null), 2000);
  }, [nodes, fitView]);

  // ─── Simulation highlight ───
  const handleSimHighlight = useCallback((nodeId: string | null) => {
    setHighlightedNodeId(nodeId);
    if (nodeId) {
      const node = nodes.find((n: Node) => n.id === nodeId);
      if (node) fitView({ nodes: [node], padding: 0.8, duration: 200 });
    }
  }, [nodes, fitView]);

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
    setFlowType(wf.flowType || 'BOOTH');
    setIsPublic(wf.isPublic);
    setIsDefault(wf.isDefault);
    setIsLocked(wf.isLocked || false);
    setEditingId(wf.id);
    setShowList(false);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [setNodes, setEdges, fitView]);

  // ─── Save (with validation) ───
  const handleSave = useCallback(async () => {
    if (!workflowName.trim()) {
      toast.error('Bitte einen Workflow-Namen eingeben');
      return;
    }
    if (nodes.length === 0) {
      toast.error('Workflow hat keine Steps');
      return;
    }

    // Run validation
    const vResult = validateWorkflow(nodes, edges, workflowName);
    if (!vResult.valid) {
      setValidationResult(vResult);
      toast.error(`${vResult.errors.length} Validierungsfehler — bitte beheben`);
      return;
    }
    if (vResult.warnings.length > 0) {
      setValidationResult(vResult);
    }

    try {
      setSaving(true);
      const payload = {
        name: workflowName,
        description: workflowDesc || null,
        steps: { nodes, edges },
        flowType,
        isPublic,
        isDefault,
      };

      if (editingId) {
        await api.put(`/workflows/${editingId}`, payload);
        toast.success('Workflow gespeichert');
      } else {
        await api.post('/workflows', payload);
        toast.success('Workflow erstellt');
      }

      await loadWorkflows();
      setShowList(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }, [workflowName, workflowDesc, nodes, edges, flowType, isPublic, isDefault, editingId, loadWorkflows]);

  // ─── Delete ───
  const handleDelete = useCallback(async (id: string) => {
    const confirmed = window.confirm('Workflow wirklich löschen?');
    if (!confirmed) return;
    try {
      await api.delete(`/workflows/${id}`);
      toast.success('Workflow gelöscht');
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  }, [loadWorkflows]);

  // ─── Lock / Unlock ───
  const handleLock = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Workflow sperren? Es wird ein Backup erstellt.')) return;
    try {
      await api.post(`/workflows/${id}/lock`);
      toast.success('Workflow gesperrt');
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Sperren');
    }
  }, [loadWorkflows]);

  const handleUnlock = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Workflow entsperren? Es wird ein Backup erstellt.')) return;
    try {
      await api.post(`/workflows/${id}/unlock`);
      toast.success('Workflow entsperrt');
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Entsperren');
    }
  }, [loadWorkflows]);

  // ─── Duplicate ───
  const handleDuplicate = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/workflows/${id}/duplicate`);
      toast.success('Workflow dupliziert');
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Duplizieren');
    }
  }, [loadWorkflows]);

  // ─── Backups ───
  const loadBackups = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.get(`/workflows/${id}/backups`);
      setBackups(data.backups || []);
      setShowBackups(id);
    } catch (err: any) {
      toast.error('Backups konnten nicht geladen werden');
    }
  }, []);

  const handleRestore = useCallback(async (workflowId: string, backupId: string) => {
    if (!window.confirm('Workflow auf dieses Backup zurücksetzen?')) return;
    try {
      await api.post(`/workflows/${workflowId}/restore/${backupId}`);
      toast.success('Backup wiederhergestellt');
      await loadWorkflows();
      setShowBackups(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Wiederherstellen');
    }
  }, [loadWorkflows]);

  // ─── Export ───
  const handleExport = useCallback(async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.get(`/workflows/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.workflow.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Workflow exportiert');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Export fehlgeschlagen');
    }
  }, []);

  // ─── Import ───
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.workflow.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await api.post('/workflows/import', data);
        toast.success('Workflow importiert');
        await loadWorkflows();
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Import fehlgeschlagen — ungültiges Format?');
      }
    };
    input.click();
  }, [loadWorkflows]);

  // ─── New workflow ───
  const handleNew = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setWorkflowName('');
    setWorkflowDesc('');
    setFlowType('BOOTH');
    setIsPublic(false);
    setIsDefault(false);
    setIsLocked(false);
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

  // ─── Analytics data ───
  const [analyticsData, setAnalyticsData] = useState<{ totalWorkflows: number; totalEventsUsing: number; totalPhotosViaWorkflows: number; mostUsed: any } | null>(null);
  const [listTab, setListTab] = useState<'workflows' | 'templates'>('workflows');
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  useEffect(() => {
    if (!showList) return;
    api.get('/workflows/meta/analytics').then(({ data }) => setAnalyticsData(data.summary)).catch(() => {});
  }, [showList]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const { data } = await api.get('/workflows/meta/templates');
      setTemplates(data.templates || []);
    } catch { /* ignore */ } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (listTab === 'templates') loadTemplates();
  }, [listTab, loadTemplates]);

  const handleUseTemplate = useCallback(async (templateId: string) => {
    try {
      await api.post(`/workflows/${templateId}/duplicate`);
      toast.success('Template als Workflow übernommen');
      setListTab('workflows');
      await loadWorkflows();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Übernehmen');
    }
  }, [loadWorkflows]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Workflow List
  // ──────────────────────────────────────────────────────────────────────────
  if (showList) {
    return (
      <div className="h-full flex flex-col bg-muted/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Workflow className="w-5 h-5 text-blue-500" />
              Workflow Builder
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visuelle Booth-Abläufe erstellen und verwalten</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Neuer Workflow
            </button>
          </div>
        </div>

        {/* Analytics Stats */}
        {analyticsData && (
          <div className="flex gap-4 px-6 py-3 bg-card/50 border-b border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Workflow className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{analyticsData.totalWorkflows}</span> Workflows
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{analyticsData.totalEventsUsing}</span> Events nutzen Workflows
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{analyticsData.totalPhotosViaWorkflows.toLocaleString()}</span> Fotos
            </div>
            {analyticsData.mostUsed && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                Meistgenutzt: <span className="font-semibold text-foreground">{analyticsData.mostUsed.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 bg-card/50">
          <button
            onClick={() => setListTab('workflows')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${listTab === 'workflows' ? 'border-blue-500 text-blue-600 bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Meine Workflows
          </button>
          <button
            onClick={() => setListTab('templates')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${listTab === 'templates' ? 'border-blue-500 text-blue-600 bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Template-Marktplatz
          </button>
        </div>

        {/* Template Marketplace */}
        {listTab === 'templates' && (
          <div className="flex-1 overflow-y-auto p-6">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-20">
                <Workflow className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-2">Noch keine Templates veröffentlicht</p>
                <p className="text-xs text-muted-foreground/70">Veröffentliche Workflows als Template über die Aktions-Buttons in deiner Workflow-Liste</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
                {templates.map((tmpl) => {
                  const ft = FLOW_TYPE_OPTIONS.find(f => f.value === tmpl.flowType);
                  return (
                    <div key={tmpl.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-blue-300 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        {ft && <span className="text-lg">{ft.icon}</span>}
                        <h3 className="font-semibold text-foreground truncate">{tmpl.name}</h3>
                      </div>
                      {tmpl.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{tmpl.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {ft && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{ft.label}</span>}
                        {tmpl.isSystem && <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">System</span>}
                        {(tmpl.tags || []).map((t: string) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground/70">v{tmpl.version} · {tmpl._count?.events || 0} Events</span>
                        <button
                          onClick={() => handleUseTemplate(tmpl.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                        >
                          <Copy className="w-3 h-3" /> Verwenden
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Workflow List */}
        {listTab === 'workflows' && (
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/70" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-20">
              <Workflow className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">Noch keine Workflows erstellt</p>
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
                const ft = FLOW_TYPE_OPTIONS.find(f => f.value === wf.flowType);
                return (
                  <div
                    key={wf.id}
                    className={`bg-card rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer group ${wf.isLocked ? 'border-amber-300' : 'border-border'}`}
                    onClick={() => loadWorkflow(wf)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {wf.isLocked && <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                          <h3 className="text-base font-semibold text-foreground truncate">{wf.name}</h3>
                          {ft && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{ft.icon} {ft.label}</span>
                          )}
                          {wf.isSystem && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium flex items-center gap-1"><Shield className="w-3 h-3" />System</span>
                          )}
                          {wf.isDefault && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Standard</span>
                          )}
                          {wf.isPublic && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Öffentlich</span>
                          )}
                        </div>
                        {wf.description && (
                          <p className="text-sm text-muted-foreground truncate">{wf.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground/70">
                          <span>{nodeCount} Steps</span>
                          <span>·</span>
                          <span>v{wf.version || 1}</span>
                          <span>·</span>
                          <span>{new Date(wf.createdAt).toLocaleDateString('de-DE')}</span>
                          {wf._count?.backups > 0 && (
                            <>
                              <span>·</span>
                              <span>{wf._count.backups} Backups</span>
                            </>
                          )}
                          {wf._count?.events > 0 && (
                            <>
                              <span>·</span>
                              <span>{wf._count.events} Events</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        {wf.isLocked ? (
                          <button onClick={(e) => handleUnlock(wf.id, e)} className="p-2 rounded-lg hover:bg-amber-100 text-amber-500" title="Entsperren">
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={(e) => handleLock(wf.id, e)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70" title="Sperren">
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={(e) => handleDuplicate(wf.id, e)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70" title="Duplizieren">
                          <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleExport(wf.id, wf.name, e)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70" title="Exportieren">
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => loadBackups(wf.id, e)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground/70" title="Backups">
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(wf.id); }}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground/70 hover:text-destructive"
                          title="Löschen"
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
        )}

        {/* Backup Panel Overlay */}
        {showBackups && (
          <div className="absolute inset-0 bg-black/30 z-20 flex items-center justify-center p-6" onClick={() => setShowBackups(null)}>
            <div className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" /> Backups
                </h3>
                <button onClick={() => setShowBackups(null)} className="p-1.5 rounded-lg hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {backups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Keine Backups vorhanden</p>
                ) : (
                  <div className="space-y-2">
                    {backups.map((b) => (
                      <div key={b.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{b.name} <span className="text-muted-foreground/70">v{b.version}</span></div>
                          <div className="text-xs text-muted-foreground">{b.reason} · {new Date(b.createdAt).toLocaleString('de-DE')}</div>
                        </div>
                        <button
                          onClick={() => handleRestore(showBackups, b.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER: Preset Selector
  // ──────────────────────────────────────────────────────────────────────────
  if (showPresets) {
    return (
      <div className="h-full flex flex-col bg-muted/50">
        <div className="flex items-center gap-3 px-6 py-4 bg-card border-b border-border">
          <button onClick={handleBackToList} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-foreground">Vorlage wählen</h2>
            <p className="text-sm text-muted-foreground">Starte mit einem Preset oder erstelle von Grund auf</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {/* Empty workflow */}
            <button
              onClick={() => { setShowPresets(false); }}
              className="bg-card rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
            >
              <Plus className="w-8 h-8 mx-auto text-muted-foreground/70 group-hover:text-blue-500 mb-2" />
              <h3 className="font-semibold text-foreground/80 group-hover:text-blue-600">Leerer Workflow</h3>
              <p className="text-xs text-muted-foreground/70 mt-1">Von Grund auf erstellen</p>
            </button>

            {/* Presets */}
            {WORKFLOW_PRESETS.map((preset) => {
              const PresetIcon = PRESET_ICONS[preset.icon] || Workflow;
              return (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className="bg-card rounded-xl border border-border p-6 text-left hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <PresetIcon className="w-8 h-8 text-blue-500 mb-2" />
                  <h3 className="font-semibold text-foreground">{preset.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/70">
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
    <div className="h-full flex flex-col bg-muted">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-card border-b border-border z-10">
        <button onClick={handleBackToList} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isLocked && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> Gesperrt
          </span>
        )}

        <div className="flex-1 flex items-center gap-3">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow-Name *"
            disabled={isLocked}
            className="px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-foreground w-52 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          />
          <select
            value={flowType}
            onChange={(e) => setFlowType(e.target.value)}
            disabled={isLocked}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          >
            {FLOW_TYPE_OPTIONS.map((ft) => (
              <option key={ft.value} value={ft.value}>{ft.icon} {ft.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={workflowDesc}
            onChange={(e) => setWorkflowDesc(e.target.value)}
            placeholder="Beschreibung (optional)"
            disabled={isLocked}
            className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} disabled={isLocked} className="rounded" />
            Öffentlich
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} disabled={isLocked} className="rounded" />
            Standard
          </label>
          <button
            onClick={() => setShowPresets(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-muted/50"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Vorlagen
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={handleUndo}
            disabled={undoStack.length < 2}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-30"
            title="Rückgängig (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 disabled:opacity-30"
            title="Wiederholen (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={handleValidate}
            disabled={nodes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 disabled:opacity-30"
            title="Workflow validieren"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Validieren
          </button>
          <button
            onClick={() => setShowSimulation(!showSimulation)}
            disabled={nodes.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg disabled:opacity-30 ${showSimulation ? 'bg-violet-100 text-violet-700 border-violet-300' : 'text-muted-foreground border-border hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300'}`}
            title="Test-Modus"
          >
            <Play className="w-3.5 h-3.5" />
            Test
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isLocked || !workflowName.trim() || nodes.length === 0}
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
        <div className="w-56 bg-card border-r border-border overflow-y-auto p-3 flex-shrink-0">
          <StepPalette onAddStep={handleAddStep} />
        </div>

        {/* Center: React Flow Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
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
                <div className="bg-card/90 backdrop-blur-sm rounded-xl shadow-lg border border-border px-8 py-6 text-center mt-20">
                  <Workflow className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Ziehe Steps aus der Palette hierher</p>
                  <p className="text-xs text-muted-foreground/70">oder klicke auf einen Step-Typ um ihn hinzuzufügen</p>
                </div>
              </Panel>
            )}

            {/* Stats */}
            {nodes.length > 0 && (
              <Panel position="top-right">
                <div className="bg-card/90 backdrop-blur-sm rounded-lg shadow-sm border border-border px-3 py-2 text-xs text-muted-foreground flex items-center gap-3">
                  <span>{nodes.length} Nodes</span>
                  <span>·</span>
                  <span>{edges.length} Edges</span>
                </div>
              </Panel>
            )}
          </ReactFlow>

          {/* Validation Panel Overlay */}
          {validationResult && (
            <ValidationPanel
              result={validationResult}
              onClose={() => setValidationResult(null)}
              onFocusNode={handleFocusNode}
            />
          )}

          {/* Simulation Panel Overlay */}
          {showSimulation && (
            <SimulationPanel
              nodes={nodes}
              edges={edges}
              onClose={() => { setShowSimulation(false); setHighlightedNodeId(null); }}
              onHighlightNode={handleSimHighlight}
            />
          )}
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
              allNodes={nodes}
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
