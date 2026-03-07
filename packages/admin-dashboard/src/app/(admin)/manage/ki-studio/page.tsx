'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Brain, Search, Filter, Plus, Play, Pause, Settings2, ChevronRight,
  Sparkles, MessageSquare, Monitor, Globe, Loader2, RefreshCw,
  Wand2, Image, Video, Type, FileJson, Zap, ToggleLeft, ToggleRight,
  Pencil, Trash2, Copy, TestTube, History, ArrowLeft, Save, X,
  Check, AlertCircle, TrendingUp, BarChart3,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ModernCard } from '@/components/ui/ModernCard';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';

const PipelineNodeEditor = dynamic(() => import('@/components/PipelineNodeEditor'), { ssr: false });

// ─── Types ──────────────────────────────────────────────────────────────────

interface Pipeline {
  id: string;
  featureKey: string;
  name: string;
  description: string | null;
  executor: 'COMFYUI' | 'LLM' | 'LOCAL' | 'EXTERNAL';
  model: string | null;
  inputType: string;
  outputType: string;
  isActive: boolean;
  isDefault: boolean;
  creditCost: number;
  defaultStrength: number | null;
  defaultSteps: number | null;
  defaultCfg: number | null;
  totalExecutions: number;
  successCount: number;
  avgDurationMs: number | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  workflowJson: any | null;
  createdAt: string;
  updatedAt: string;
  activePrompt: PipelinePrompt | null;
  promptCount: number;
  nodeCount: number;
  eventOverrideCount: number;
}

interface PipelinePrompt {
  id: string;
  pipelineId: string;
  prompt: string;
  negativePrompt: string | null;
  systemPrompt: string | null;
  editPrompt: string | null;
  strength: number | null;
  temperature: number | null;
  maxTokens: number | null;
  version: number;
  isActive: boolean;
  variantLabel: string | null;
  trafficWeight: number;
  testCount: number;
  successCount: number;
  avgRating: number | null;
  changelog: string | null;
  createdAt: string;
}

interface PipelineNode {
  id: string;
  pipelineId: string;
  nodeId: string;
  nodeType: string;
  label: string;
  positionX: number;
  positionY: number;
  config: any;
  connections: any[];
}

interface EventOverride {
  id: string;
  pipelineId: string;
  eventId: string;
  event: { id: string; title: string; slug: string };
  customPrompt: string | null;
  customNegativePrompt: string | null;
  customLogoUrl: string | null;
  logoPosition: string | null;
  logoOpacity: number | null;
  logoScale: number | null;
  customConfig: any | null;
  isActive: boolean;
  createdAt: string;
}

interface PipelineDetail extends Pipeline {
  prompts: PipelinePrompt[];
  nodes: PipelineNode[];
  eventOverrides: EventOverride[];
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  byExecutor: Record<string, number>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EXECUTOR_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  COMFYUI: { label: 'ComfyUI', color: 'text-purple-400', bg: 'bg-purple-500/20', icon: Sparkles },
  LLM: { label: 'LLM', color: 'text-green-400', bg: 'bg-green-500/20', icon: MessageSquare },
  LOCAL: { label: 'Lokal', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Monitor },
  EXTERNAL: { label: 'Extern', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: Globe },
};

const OUTPUT_ICONS: Record<string, any> = {
  IMAGE: Image,
  TEXT: Type,
  VIDEO: Video,
  GIF: Video,
  JSON: FileJson,
};

type TabId = 'board' | 'detail' | 'prompts';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function KiStudioPage() {
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [executorFilter, setExecutorFilter] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<TabId>('board');

  // Detail view
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Prompt editing
  const [editingPrompt, setEditingPrompt] = useState<PipelinePrompt | null>(null);
  const [promptForm, setPromptForm] = useState({
    prompt: '', negativePrompt: '', systemPrompt: '', editPrompt: '',
    strength: '', temperature: '', maxTokens: '',
    variantLabel: '', trafficWeight: '100', changelog: '',
  });
  const [saving, setSaving] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (executorFilter !== 'ALL') params.executor = executorFilter;
      if (activeFilter === 'ACTIVE') params.isActive = 'true';
      if (activeFilter === 'INACTIVE') params.isActive = 'false';
      if (search) params.search = search;

      const [pipelineRes, statsRes] = await Promise.all([
        api.get('/api/admin/pipelines', { params }),
        api.get('/api/admin/pipelines/stats/overview'),
      ]);

      setPipelines(pipelineRes.data.pipelines);
      setStats(statsRes.data);
    } catch (err: any) {
      toast.error('Pipelines konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [executorFilter, activeFilter, search]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const fetchDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/api/admin/pipelines/${id}`);
      setSelectedPipeline(res.data);
      setActiveTab('detail');
    } catch {
      toast.error('Pipeline-Detail konnte nicht geladen werden');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Actions ────────────────────────────────────────────────────────────

  const togglePipeline = async (id: string) => {
    try {
      await api.patch(`/api/admin/pipelines/${id}/toggle`);
      toast.success('Status geändert');
      fetchPipelines();
      if (selectedPipeline?.id === id) fetchDetail(id);
    } catch {
      toast.error('Status-Änderung fehlgeschlagen');
    }
  };

  const openPromptEditor = (prompt: PipelinePrompt) => {
    setEditingPrompt(prompt);
    setPromptForm({
      prompt: prompt.prompt || '',
      negativePrompt: prompt.negativePrompt || '',
      systemPrompt: prompt.systemPrompt || '',
      editPrompt: prompt.editPrompt || '',
      strength: prompt.strength?.toString() || '',
      temperature: prompt.temperature?.toString() || '',
      maxTokens: prompt.maxTokens?.toString() || '',
      variantLabel: prompt.variantLabel || '',
      trafficWeight: prompt.trafficWeight?.toString() || '100',
      changelog: '',
    });
    setActiveTab('prompts');
  };

  const saveNewPromptVersion = async () => {
    if (!selectedPipeline) return;
    try {
      setSaving(true);
      await api.post(`/api/admin/pipelines/${selectedPipeline.id}/prompts`, {
        prompt: promptForm.prompt,
        negativePrompt: promptForm.negativePrompt || null,
        systemPrompt: promptForm.systemPrompt || null,
        editPrompt: promptForm.editPrompt || null,
        strength: promptForm.strength ? parseFloat(promptForm.strength) : null,
        temperature: promptForm.temperature ? parseFloat(promptForm.temperature) : null,
        maxTokens: promptForm.maxTokens ? parseInt(promptForm.maxTokens) : null,
        variantLabel: promptForm.variantLabel || null,
        trafficWeight: promptForm.trafficWeight ? parseInt(promptForm.trafficWeight) : 100,
        changelog: promptForm.changelog || 'Updated via KI-Studio',
      });
      toast.success('Neue Prompt-Version erstellt');
      fetchDetail(selectedPipeline.id);
      setActiveTab('detail');
      setEditingPrompt(null);
    } catch {
      toast.error('Prompt konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const activatePrompt = async (promptId: string) => {
    if (!selectedPipeline) return;
    try {
      await api.post(`/api/admin/pipelines/${selectedPipeline.id}/prompts/${promptId}/activate`);
      toast.success('Prompt-Version aktiviert');
      fetchDetail(selectedPipeline.id);
    } catch {
      toast.error('Aktivierung fehlgeschlagen');
    }
  };

  const saveNodes = async (nodes: any[]) => {
    if (!selectedPipeline) return;
    try {
      await api.put(`/api/admin/pipelines/${selectedPipeline.id}/nodes`, { nodes });
      toast.success('Nodes gespeichert');
      fetchDetail(selectedPipeline.id);
    } catch {
      toast.error('Nodes konnten nicht gespeichert werden');
    }
  };

  const updateTrafficWeight = async (promptId: string, weight: number) => {
    if (!selectedPipeline) return;
    try {
      await api.put(`/api/admin/pipelines/${selectedPipeline.id}/prompts/${promptId}`, { trafficWeight: weight });
      toast.success('Traffic-Gewichtung aktualisiert');
      fetchDetail(selectedPipeline.id);
    } catch {
      toast.error('Gewichtung konnte nicht gespeichert werden');
    }
  };

  const createVariant = (basePrompt: PipelinePrompt) => {
    setEditingPrompt(basePrompt);
    setPromptForm({
      prompt: basePrompt.prompt || '',
      negativePrompt: basePrompt.negativePrompt || '',
      systemPrompt: basePrompt.systemPrompt || '',
      editPrompt: basePrompt.editPrompt || '',
      strength: basePrompt.strength?.toString() || '',
      temperature: basePrompt.temperature?.toString() || '',
      maxTokens: basePrompt.maxTokens?.toString() || '',
      variantLabel: 'B',
      trafficWeight: '50',
      changelog: '',
    });
    setActiveTab('prompts');
  };

  const createEventOverride = async (data: { eventId: string; customPrompt?: string; customNegativePrompt?: string; customLogoUrl?: string; logoPosition?: string; logoOpacity?: number; logoScale?: number }) => {
    if (!selectedPipeline) return;
    try {
      await api.post(`/api/admin/pipelines/${selectedPipeline.id}/events`, data);
      toast.success('Event-Override erstellt');
      fetchDetail(selectedPipeline.id);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Override für dieses Event existiert bereits');
      } else {
        toast.error('Override konnte nicht erstellt werden');
      }
    }
  };

  const updateEventOverride = async (overrideId: string, data: Partial<EventOverride>) => {
    if (!selectedPipeline) return;
    try {
      await api.put(`/api/admin/pipelines/${selectedPipeline.id}/events/${overrideId}`, data);
      toast.success('Event-Override aktualisiert');
      fetchDetail(selectedPipeline.id);
    } catch {
      toast.error('Override konnte nicht aktualisiert werden');
    }
  };

  const deleteEventOverride = async (overrideId: string) => {
    if (!selectedPipeline) return;
    if (!confirm('Event-Override wirklich löschen?')) return;
    try {
      await api.delete(`/api/admin/pipelines/${selectedPipeline.id}/events/${overrideId}`);
      toast.success('Event-Override gelöscht');
      fetchDetail(selectedPipeline.id);
    } catch {
      toast.error('Override konnte nicht gelöscht werden');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab !== 'board' && (
              <button
                onClick={() => { setActiveTab('board'); setSelectedPipeline(null); setEditingPrompt(null); }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="w-7 h-7 text-purple-400" />
                KI-Studio
              </h1>
              <p className="text-sm text-white/50 mt-1">
                {activeTab === 'board' && 'Pipeline Board — Alle KI-Features auf einen Blick'}
                {activeTab === 'detail' && selectedPipeline && `${selectedPipeline.name} — Detail & Prompts`}
                {activeTab === 'prompts' && 'Prompt Editor — Neue Version erstellen'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchPipelines}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Aktualisieren
          </button>
        </div>

        {/* Stats Bar */}
        {stats && activeTab === 'board' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatBadge label="Gesamt" value={stats.total} color="white" />
            <StatBadge label="Aktiv" value={stats.active} color="green" />
            <StatBadge label="Inaktiv" value={stats.inactive} color="red" />
            {Object.entries(stats.byExecutor).map(([exec, count]) => (
              <StatBadge key={exec} label={EXECUTOR_CONFIG[exec]?.label || exec} value={count} color={exec === 'COMFYUI' ? 'purple' : exec === 'LLM' ? 'green' : exec === 'LOCAL' ? 'blue' : 'orange'} />
            ))}
          </div>
        )}

        {/* Content */}
        {activeTab === 'board' && (
          <PipelineBoard
            pipelines={pipelines}
            loading={loading}
            search={search}
            setSearch={setSearch}
            executorFilter={executorFilter}
            setExecutorFilter={setExecutorFilter}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onSelect={(p) => fetchDetail(p.id)}
            onToggle={togglePipeline}
          />
        )}

        {activeTab === 'detail' && selectedPipeline && (
          <PipelineDetailView
            pipeline={selectedPipeline}
            loading={detailLoading}
            onToggle={() => togglePipeline(selectedPipeline.id)}
            onEditPrompt={openPromptEditor}
            onActivatePrompt={activatePrompt}
            onSaveNodes={saveNodes}
            onUpdateTrafficWeight={updateTrafficWeight}
            onCreateVariant={createVariant}
            onCreateEventOverride={createEventOverride}
            onUpdateEventOverride={updateEventOverride}
            onDeleteEventOverride={deleteEventOverride}
          />
        )}

        {activeTab === 'prompts' && editingPrompt && selectedPipeline && (
          <PromptEditorView
            pipeline={selectedPipeline}
            basePrompt={editingPrompt}
            form={promptForm}
            setForm={setPromptForm}
            saving={saving}
            onSave={saveNewPromptVersion}
            onCancel={() => { setActiveTab('detail'); setEditingPrompt(null); }}
          />
        )}
      </div>
    </PageTransition>
  );
}

// ─── Pipeline Board ─────────────────────────────────────────────────────────

function PipelineBoard({
  pipelines, loading, search, setSearch,
  executorFilter, setExecutorFilter, activeFilter, setActiveFilter,
  onSelect, onToggle,
}: {
  pipelines: Pipeline[];
  loading: boolean;
  search: string;
  setSearch: (s: string) => void;
  executorFilter: string;
  setExecutorFilter: (s: string) => void;
  activeFilter: string;
  setActiveFilter: (s: string) => void;
  onSelect: (p: Pipeline) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pipeline suchen..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
          {['ALL', 'COMFYUI', 'LLM', 'LOCAL', 'EXTERNAL'].map((f) => (
            <button
              key={f}
              onClick={() => setExecutorFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                executorFilter === f
                  ? 'bg-purple-500/30 text-purple-300'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {f === 'ALL' ? 'Alle' : EXECUTOR_CONFIG[f]?.label || f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-1">
          {[
            { key: 'ALL', label: 'Alle' },
            { key: 'ACTIVE', label: 'Aktiv' },
            { key: 'INACTIVE', label: 'Inaktiv' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFilter === f.key
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <ModernCard>
          <div className="text-center py-12 text-white/40">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Keine Pipelines gefunden</p>
          </div>
        </ModernCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pipelines.map((p) => (
            <PipelineCard key={p.id} pipeline={p} onSelect={onSelect} onToggle={onToggle} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Pipeline Card ──────────────────────────────────────────────────────────

function PipelineCard({ pipeline: p, onSelect, onToggle }: { pipeline: Pipeline; onSelect: (p: Pipeline) => void; onToggle: (id: string) => void }) {
  const exec = EXECUTOR_CONFIG[p.executor] || EXECUTOR_CONFIG.LOCAL;
  const ExecIcon = exec.icon;
  const OutputIcon = OUTPUT_ICONS[p.outputType] || Image;
  const successRate = p.totalExecutions > 0 ? Math.round((p.successCount / p.totalExecutions) * 100) : null;

  return (
    <ModernCard hover className="relative group">
      <div onClick={() => onSelect(p)} className="cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${exec.bg}`}>
              <ExecIcon className={`w-4 h-4 ${exec.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">{p.name}</h3>
              <p className="text-[11px] text-white/40 font-mono">{p.featureKey}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(p.id); }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            title={p.isActive ? 'Deaktivieren' : 'Aktivieren'}
          >
            {p.isActive ? (
              <ToggleRight className="w-5 h-5 text-green-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-white/30" />
            )}
          </button>
        </div>

        {/* Description */}
        {p.description && (
          <p className="text-xs text-white/50 mb-3 line-clamp-2">{p.description}</p>
        )}

        {/* Flow indicator */}
        <div className="flex items-center gap-1.5 mb-3 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white/5 text-white/50">
            {p.inputType.replace('_', ' ')}
          </span>
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className={`px-2 py-0.5 rounded ${exec.bg} ${exec.color} font-medium`}>
            {exec.label}
          </span>
          <ChevronRight className="w-3 h-3 text-white/20" />
          <span className="px-2 py-0.5 rounded bg-white/5 text-white/50 flex items-center gap-1">
            <OutputIcon className="w-3 h-3" />
            {p.outputType}
          </span>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between text-[11px] text-white/40 pt-2 border-t border-white/5">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> {p.creditCost} Credits
            </span>
            {p.model && (
              <span className="truncate max-w-[80px]" title={p.model}>{p.model}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {successRate !== null && (
              <span className={successRate >= 90 ? 'text-green-400' : successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                {successRate}%
              </span>
            )}
            <span>{p.promptCount} Prompt{p.promptCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </ModernCard>
  );
}

// ─── Pipeline Detail View ───────────────────────────────────────────────────

function PipelineDetailView({
  pipeline: p, loading, onToggle, onEditPrompt, onActivatePrompt, onSaveNodes, onUpdateTrafficWeight, onCreateVariant,
  onCreateEventOverride, onUpdateEventOverride, onDeleteEventOverride,
}: {
  pipeline: PipelineDetail;
  loading: boolean;
  onToggle: () => void;
  onEditPrompt: (prompt: PipelinePrompt) => void;
  onActivatePrompt: (promptId: string) => void;
  onSaveNodes: (nodes: any[]) => Promise<void>;
  onUpdateTrafficWeight: (promptId: string, weight: number) => Promise<void>;
  onCreateVariant: (basePrompt: PipelinePrompt) => void;
  onCreateEventOverride: (data: { eventId: string; customPrompt?: string; customNegativePrompt?: string; customLogoUrl?: string; logoPosition?: string; logoOpacity?: number; logoScale?: number }) => Promise<void>;
  onUpdateEventOverride: (overrideId: string, data: Partial<EventOverride>) => Promise<void>;
  onDeleteEventOverride: (overrideId: string) => Promise<void>;
}) {
  const exec = EXECUTOR_CONFIG[p.executor] || EXECUTOR_CONFIG.LOCAL;
  const ExecIcon = exec.icon;

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><SkeletonCard /><SkeletonCard /></div>
        <div><SkeletonCard /></div>
      </div>
    );
  }

  const activePrompt = p.prompts.find((pr) => pr.isActive && !pr.variantLabel);
  const activeVariants = p.prompts.filter((pr) => pr.isActive && pr.variantLabel);
  const allActivePrompts = p.prompts.filter((pr) => pr.isActive);
  const totalWeight = allActivePrompts.reduce((s, pr) => s + pr.trafficWeight, 0);
  const olderPrompts = p.prompts.filter((pr) => !pr.isActive);

  return (
    <div className="space-y-6">
      {/* Node Editor — full width */}
      {p.nodes.length > 0 && (
        <ModernCard>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-purple-400" />
            Pipeline-Flow
            <span className="text-xs font-normal text-white/40">{p.nodes.length} Nodes</span>
          </h3>
          <PipelineNodeEditor
            pipelineId={p.id}
            pipelineName={p.name}
            nodes={p.nodes}
            onSave={onSaveNodes}
          />
        </ModernCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pipeline Info */}
        <ModernCard>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${exec.bg}`}>
                <ExecIcon className={`w-6 h-6 ${exec.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{p.name}</h2>
                <p className="text-sm text-white/40 font-mono">{p.featureKey}</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                p.isActive
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {p.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {p.isActive ? 'Aktiv' : 'Inaktiv'}
            </button>
          </div>

          {p.description && <p className="text-sm text-white/60 mb-4">{p.description}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoPill label="Executor" value={exec.label} />
            <InfoPill label="Model" value={p.model || '—'} />
            <InfoPill label="Input" value={p.inputType} />
            <InfoPill label="Output" value={p.outputType} />
            <InfoPill label="Credits" value={String(p.creditCost)} />
            <InfoPill label="Strength" value={p.defaultStrength?.toFixed(2) || '—'} />
            <InfoPill label="Steps" value={String(p.defaultSteps || '—')} />
            <InfoPill label="CFG" value={p.defaultCfg?.toFixed(1) || '—'} />
          </div>
        </ModernCard>

        {/* Active Prompt */}
        {activePrompt && (
          <ModernCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Aktiver Prompt
                <span className="text-xs font-normal text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                  v{activePrompt.version}
                </span>
              </h3>
              <button
                onClick={() => onEditPrompt(activePrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-sm font-medium transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Neue Version
              </button>
            </div>

            <div className="space-y-3">
              <PromptField label="Prompt" value={activePrompt.prompt} />
              {activePrompt.negativePrompt && <PromptField label="Negative" value={activePrompt.negativePrompt} />}
              {activePrompt.systemPrompt && <PromptField label="System" value={activePrompt.systemPrompt} />}
              {activePrompt.editPrompt && <PromptField label="Edit Instruction" value={activePrompt.editPrompt} />}

              <div className="flex gap-3 text-xs text-white/40 pt-2 border-t border-white/5">
                {activePrompt.strength != null && <span>Strength: {activePrompt.strength}</span>}
                {activePrompt.temperature != null && <span>Temp: {activePrompt.temperature}</span>}
                {activePrompt.testCount > 0 && <span>Tests: {activePrompt.testCount}</span>}
                {activePrompt.avgRating != null && <span>Rating: {activePrompt.avgRating.toFixed(1)}</span>}
              </div>
            </div>
          </ModernCard>
        )}

        {/* A/B Testing */}
        {activePrompt && (
          <ModernCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                A/B Testing
                {activeVariants.length > 0 && (
                  <span className="text-xs font-normal text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    {allActivePrompts.length} Varianten aktiv
                  </span>
                )}
              </h3>
              <button
                onClick={() => onCreateVariant(activePrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 text-sm font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Variante erstellen
              </button>
            </div>

            {/* Traffic Distribution Bar */}
            {allActivePrompts.length > 1 && (
              <div className="mb-4">
                <p className="text-xs text-white/40 mb-2">Traffic-Verteilung</p>
                <div className="flex rounded-lg overflow-hidden h-6">
                  {allActivePrompts.map((pr, i) => {
                    const pct = totalWeight > 0 ? (pr.trafficWeight / totalWeight) * 100 : 0;
                    const colors = ['bg-purple-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-pink-500'];
                    return (
                      <div
                        key={pr.id}
                        className={`${colors[i % colors.length]} flex items-center justify-center text-[10px] font-bold text-white transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${pr.variantLabel || 'Default'}: ${Math.round(pct)}%`}
                      >
                        {pct >= 10 && `${pr.variantLabel || 'A'} ${Math.round(pct)}%`}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant Cards */}
            <div className="space-y-2">
              {allActivePrompts.map((pr) => (
                <div key={pr.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    pr.variantLabel ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {pr.variantLabel || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/70 font-medium truncate">{pr.prompt.slice(0, 80)}...</span>
                      <span className="text-[10px] text-white/30 font-mono">v{pr.version}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/40">
                      {pr.testCount > 0 && <span>Tests: {pr.testCount}</span>}
                      {pr.avgRating != null && <span>Rating: {pr.avgRating.toFixed(1)}</span>}
                      {pr.successCount > 0 && <span>Erfolge: {pr.successCount}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={pr.trafficWeight}
                        onChange={(e) => onUpdateTrafficWeight(pr.id, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs text-center focus:outline-none focus:border-yellow-500/50"
                      />
                      <span className="text-[10px] text-white/30">%</span>
                    </div>
                    <button
                      onClick={() => onEditPrompt(pr)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-purple-400 transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {allActivePrompts.length <= 1 && (
              <p className="text-xs text-white/30 mt-2">
                Erstelle eine Variante, um A/B-Tests mit verschiedenen Prompts durchzuführen.
              </p>
            )}
          </ModernCard>
        )}

        {/* Prompt History */}
        {olderPrompts.length > 0 && (
          <ModernCard>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-white/40" />
              Prompt-Verlauf
              <span className="text-xs font-normal text-white/40">{olderPrompts.length} Version{olderPrompts.length !== 1 ? 'en' : ''}</span>
            </h3>

            <div className="space-y-2">
              {olderPrompts.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-white/50">v{pr.version}</span>
                      {pr.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">aktiv</span>}
                      {pr.variantLabel && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Variante {pr.variantLabel}</span>}
                      {pr.changelog && <span className="text-[11px] text-white/30 truncate">{pr.changelog}</span>}
                    </div>
                    <p className="text-xs text-white/40 truncate">{pr.prompt}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!pr.isActive && (
                      <button
                        onClick={() => onActivatePrompt(pr.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-green-400 transition-colors"
                        title="Diese Version aktivieren"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEditPrompt(pr)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-purple-400 transition-colors"
                      title="Als Basis für neue Version"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ModernCard>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Metrics */}
        <ModernCard>
          <h3 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Metriken
          </h3>
          <div className="space-y-3">
            <MetricRow label="Ausführungen" value={String(p.totalExecutions)} />
            <MetricRow label="Erfolgreich" value={String(p.successCount)} />
            <MetricRow label="Erfolgsrate" value={p.totalExecutions > 0 ? `${Math.round((p.successCount / p.totalExecutions) * 100)}%` : '—'} />
            <MetricRow label="Ø Dauer" value={p.avgDurationMs ? `${(p.avgDurationMs / 1000).toFixed(1)}s` : '—'} />
            <MetricRow label="Letzter Test" value={p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleDateString('de') : '—'} />
            <MetricRow label="Erstellt" value={new Date(p.createdAt).toLocaleDateString('de')} />
          </div>
        </ModernCard>

        {/* Event Overrides */}
        <EventOverrideSection
          overrides={p.eventOverrides}
          onCreate={onCreateEventOverride}
          onUpdate={onUpdateEventOverride}
          onDelete={onDeleteEventOverride}
        />

        {/* Workflow JSON indicator */}
        {p.workflowJson && (
          <ModernCard>
            <h3 className="text-sm font-semibold text-white/60 mb-2">ComfyUI Workflow</h3>
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Workflow JSON vorhanden
            </p>
            <p className="text-[11px] text-white/30 mt-1">
              {Object.keys(p.workflowJson).length} Nodes im Workflow
            </p>
          </ModernCard>
        )}
      </div>
      </div>
    </div>
  );
}

// ─── Event Override Section ─────────────────────────────────────────────────

function EventOverrideSection({
  overrides, onCreate, onUpdate, onDelete,
}: {
  overrides: EventOverride[];
  onCreate: (data: { eventId: string; customPrompt?: string; customNegativePrompt?: string; customLogoUrl?: string; logoPosition?: string; logoOpacity?: number; logoScale?: number }) => Promise<void>;
  onUpdate: (overrideId: string, data: Partial<EventOverride>) => Promise<void>;
  onDelete: (overrideId: string) => Promise<void>;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newEventId, setNewEventId] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newNegPrompt, setNewNegPrompt] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');

  const handleCreate = async () => {
    if (!newEventId.trim()) { toast.error('Event-ID ist erforderlich'); return; }
    await onCreate({
      eventId: newEventId.trim(),
      customPrompt: newPrompt || undefined,
      customNegativePrompt: newNegPrompt || undefined,
      customLogoUrl: newLogoUrl || undefined,
    });
    setNewEventId(''); setNewPrompt(''); setNewNegPrompt(''); setNewLogoUrl('');
    setShowAddForm(false);
  };

  return (
    <ModernCard>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/60 flex items-center gap-2">
          <Globe className="w-4 h-4" /> Event-Overrides
          {overrides.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{overrides.length}</span>
          )}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-orange-400 transition-colors"
          title="Neuen Override hinzufügen"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 mb-3 space-y-2">
          <input
            type="text"
            value={newEventId}
            onChange={(e) => setNewEventId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/50"
            placeholder="Event-ID (UUID)"
          />
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/50 resize-none"
            placeholder="Custom Prompt (optional)"
            rows={2}
          />
          <textarea
            value={newNegPrompt}
            onChange={(e) => setNewNegPrompt(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/50 resize-none"
            placeholder="Custom Negative Prompt (optional)"
            rows={2}
          />
          <input
            type="text"
            value={newLogoUrl}
            onChange={(e) => setNewLogoUrl(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-orange-500/50"
            placeholder="Logo URL (optional)"
          />
          <button
            onClick={handleCreate}
            className="w-full py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/30 transition-colors"
          >
            Override erstellen
          </button>
        </div>
      )}

      {/* Overrides List */}
      {overrides.length === 0 && !showAddForm ? (
        <p className="text-xs text-white/30">Keine Event-Overrides konfiguriert.</p>
      ) : (
        <div className="space-y-2">
          {overrides.map((eo) => (
            <div key={eo.id} className={`rounded-xl border transition-colors ${eo.isActive ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'}`}>
              <div
                className="flex items-center justify-between p-2.5 cursor-pointer"
                onClick={() => setExpandedId(expandedId === eo.id ? null : eo.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/70 truncate">{eo.event?.title || eo.eventId.slice(0, 8)}</span>
                    {!eo.isActive && <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/20 text-red-400">inaktiv</span>}
                    {eo.customLogoUrl && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">Logo</span>}
                  </div>
                  {eo.customPrompt && <p className="text-[11px] text-white/30 truncate mt-0.5">{eo.customPrompt}</p>}
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-white/30 transition-transform ${expandedId === eo.id ? 'rotate-90' : ''}`} />
              </div>

              {/* Expanded Details */}
              {expandedId === eo.id && (
                <div className="px-2.5 pb-2.5 space-y-2 border-t border-white/5 pt-2">
                  {eo.customPrompt && (
                    <div>
                      <span className="text-[10px] text-white/40 block">Custom Prompt:</span>
                      <p className="text-[11px] text-white/60 break-words">{eo.customPrompt}</p>
                    </div>
                  )}
                  {eo.customNegativePrompt && (
                    <div>
                      <span className="text-[10px] text-white/40 block">Negative Prompt:</span>
                      <p className="text-[11px] text-white/60 break-words">{eo.customNegativePrompt}</p>
                    </div>
                  )}
                  {eo.customLogoUrl && (
                    <div>
                      <span className="text-[10px] text-white/40 block">Logo: {eo.logoPosition} · {Math.round((eo.logoOpacity || 0.8) * 100)}% · {Math.round((eo.logoScale || 0.15) * 100)}%</span>
                      <p className="text-[11px] text-blue-400 truncate">{eo.customLogoUrl}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate(eo.id, { isActive: !eo.isActive }); }}
                      className={`p-1 rounded text-[10px] ${eo.isActive ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'} transition-colors`}
                      title={eo.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {eo.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(eo.id); }}
                      className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ModernCard>
  );
}

// ─── Prompt Editor ──────────────────────────────────────────────────────────

function PromptEditorView({
  pipeline, basePrompt, form, setForm, saving, onSave, onCancel,
}: {
  pipeline: PipelineDetail;
  basePrompt: PipelinePrompt;
  form: any;
  setForm: (f: any) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const exec = EXECUTOR_CONFIG[pipeline.executor];
  const isLLM = pipeline.executor === 'LLM';
  const isComfyUI = pipeline.executor === 'COMFYUI';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ModernCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Neue Prompt-Version</h2>
            <p className="text-sm text-white/40">
              Basiert auf v{basePrompt.version} · Pipeline: {pipeline.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-sm transition-colors"
            >
              <X className="w-4 h-4 inline mr-1" /> Abbrechen
            </button>
            <button
              onClick={onSave}
              disabled={saving || !form.prompt.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Als neue Version speichern
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Main Prompt */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              {isLLM ? 'User Prompt' : 'Prompt'} *
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 resize-y"
              placeholder="Prompt text..."
            />
          </div>

          {/* Negative Prompt (Image gen: ComfyUI + EXTERNAL) */}
          {!isLLM && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Negative Prompt</label>
              <textarea
                value={form.negativePrompt}
                onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 resize-y"
                placeholder="What to avoid..."
              />
            </div>
          )}

          {/* Edit Prompt (ComfyUI / Qwen Image Edit instruction) */}
          {isComfyUI && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">Edit Instruction (Qwen)</label>
              <textarea
                value={form.editPrompt}
                onChange={(e) => setForm({ ...form, editPrompt: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 resize-y"
                placeholder="z.B. 'Transform this photo into a cartoon style rendering'"
              />
              <p className="text-[11px] text-white/30 mt-1">Qwen Image Edit Anweisung — wird in TextEncodeQwenImageEdit injiziert.</p>
            </div>
          )}

          {/* System Prompt (LLM only) */}
          {isLLM && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">System Prompt</label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 resize-y"
                placeholder="System instructions..."
              />
            </div>
          )}

          {/* Parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {!isLLM && (
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Strength</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={form.strength}
                  onChange={(e) => setForm({ ...form, strength: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                  placeholder="0.75"
                />
              </div>
            )}
            {isLLM && (
              <>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    placeholder="0.7"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    placeholder="512"
                  />
                </div>
              </>
            )}
          </div>

          {/* A/B Variant Settings */}
          <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
            <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4" /> A/B Variante (optional)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Varianten-Label</label>
                <input
                  type="text"
                  value={form.variantLabel}
                  onChange={(e) => setForm({ ...form, variantLabel: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                  placeholder="z.B. B, C, oder leer für Default"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Traffic-Gewichtung</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.trafficWeight}
                    onChange={(e) => setForm({ ...form, trafficWeight: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-500/50"
                    placeholder="100"
                  />
                  <span className="text-xs text-white/40 whitespace-nowrap">%</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-white/30 mt-2">
              Leer lassen für den Standard-Prompt. Traffic wird gewichtet auf alle aktiven Varianten verteilt.
            </p>
          </div>

          {/* Changelog */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Änderungsnotiz</label>
            <input
              type="text"
              value={form.changelog}
              onChange={(e) => setForm({ ...form, changelog: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25"
              placeholder="Was wurde geändert?"
            />
          </div>
        </div>
      </ModernCard>
    </div>
  );
}

// ─── Small Components ───────────────────────────────────────────────────────

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    white: 'text-white', green: 'text-green-400', red: 'text-red-400',
    purple: 'text-purple-400', blue: 'text-blue-400', orange: 'text-orange-400',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
      <span className={`text-lg font-bold ${colorMap[color] || 'text-white'}`}>{value}</span>
      <span className="text-xs text-white/40">{label}</span>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-lg bg-white/5">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white/70 font-medium truncate">{value}</p>
    </div>
  );
}

function PromptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-white/70 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/40">{label}</span>
      <span className="text-sm text-white/70 font-medium">{value}</span>
    </div>
  );
}
