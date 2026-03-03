'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Server, Play, Square, ExternalLink, RefreshCw, Loader2,
  Download, Upload, Check, X, Cpu, Zap, Cloud, CloudOff,
  Wand2, Clock, AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ModernCard } from '@/components/ui/ModernCard';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface EndpointInfo {
  id: string;
  name: string;
  image: string;
  gpuIds: string;
  workers: { min: number; max: number } | null;
  health: {
    workers?: { idle: number; ready: number; running: number; initializing: number };
    jobs?: { completed: number; failed: number; inQueue: number; inProgress: number };
  } | null;
}

interface PodInfo {
  id: string;
  name: string;
  status: string;
  uptime: number;
  editorUrl: string | null;
}

interface WorkflowInfo {
  effect: string;
  label: string;
  icon: string;
  hasWorkflow: boolean;
  nodeCount: number;
}

export default function ComfyUIManagerPage() {
  const [loading, setLoading] = useState(true);
  const [endpoint, setEndpoint] = useState<EndpointInfo | null>(null);
  const [pod, setPod] = useState<PodInfo | null>(null);
  const [dockerImage, setDockerImage] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [workflowStats, setWorkflowStats] = useState({ total: 0, available: 0 });
  const [podCreating, setPodCreating] = useState(false);
  const [podDeleting, setPodDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Load status ──────────────────────────────────────────────────────────

  const loadStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/comfyui/status');
      setEndpoint(data.endpoint);
      setPod(data.pod);
      setDockerImage(data.dockerImage || '');
    } catch (err: any) {
      console.error('Failed to load ComfyUI status', err);
    }
  }, []);

  const loadWorkflows = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/comfyui/workflows');
      setWorkflows(data.workflows || []);
      setWorkflowStats({ total: data.total, available: data.available });
    } catch (err: any) {
      console.error('Failed to load workflows', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStatus(), loadWorkflows()]);
    setRefreshing(false);
  }, [loadStatus, loadWorkflows]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadStatus(), loadWorkflows()]).finally(() => setLoading(false));
  }, [loadStatus, loadWorkflows]);

  // Auto-refresh every 10s when pod is active
  useEffect(() => {
    if (!pod) return;
    const iv = setInterval(loadStatus, 10000);
    return () => clearInterval(iv);
  }, [pod, loadStatus]);

  // ─── Pod actions ──────────────────────────────────────────────────────────

  const createPod = async () => {
    setPodCreating(true);
    try {
      const { data } = await api.post('/admin/comfyui/pod', { gpuType: 'AMPERE_24' });
      toast.success(data.message || 'Pod wird gestartet...');
      setPod(data.pod);
      setTimeout(loadStatus, 5000);
      setTimeout(loadStatus, 15000);
      setTimeout(loadStatus, 30000);
      setTimeout(loadStatus, 60000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Pod-Erstellung fehlgeschlagen');
    } finally {
      setPodCreating(false);
    }
  };

  const deletePod = async () => {
    if (!confirm('Pod wirklich stoppen und löschen? Ungespeicherte Änderungen gehen verloren.')) return;
    setPodDeleting(true);
    try {
      await api.delete('/admin/comfyui/pod');
      toast.success('Pod wird beendet...');
      setPod(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Stoppen');
    } finally {
      setPodDeleting(false);
    }
  };

  // ─── Workflow actions ─────────────────────────────────────────────────────

  const downloadWorkflow = async (effect: string) => {
    try {
      const { data } = await api.get(`/admin/comfyui/workflows/${effect}`);
      const blob = new Blob([JSON.stringify(data.workflow, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${effect}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${effect}.json heruntergeladen`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Download fehlgeschlagen');
    }
  };

  const uploadWorkflow = async (effect: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const workflow = JSON.parse(text);
        await api.put(`/admin/comfyui/workflows/${effect}`, { workflow });
        toast.success(`Workflow "${effect}" aktualisiert — sofort aktiv!`);
        await loadWorkflows();
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Upload fehlgeschlagen — ungültiges JSON?');
      }
    };
    input.click();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      </PageTransition>
    );
  }

  const health = endpoint?.health;
  const totalWorkers = health?.workers
    ? health.workers.idle + health.workers.ready + health.workers.running + health.workers.initializing
    : 0;
  const isEndpointHealthy = totalWorkers > 0 || (health?.workers?.ready ?? 0) > 0;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-xl">
              <Cpu className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">ComfyUI Manager</h1>
              <p className="text-sm text-gray-400">
                GPU Pod verwalten · Workflows synchronisieren · Serverless Endpoint überwachen
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-white">{workflowStats.available}/{workflowStats.total}</div>
            <div className="text-xs text-gray-400 mt-0.5">Workflows aktiv</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className={`text-xl font-bold ${isEndpointHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isEndpointHealthy ? 'Online' : 'Idle'}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Endpoint Status</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{health?.workers?.running ?? 0}</div>
            <div className="text-xs text-gray-400 mt-0.5">Worker aktiv</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{health?.jobs?.completed ?? 0}</div>
            <div className="text-xs text-gray-400 mt-0.5">Jobs erledigt</div>
          </ModernCard>
        </div>

        {/* ── Serverless Endpoint Status ────────────────────────────────────── */}
        <ModernCard className="p-5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Serverless Endpoint</h2>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
              isEndpointHealthy
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isEndpointHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isEndpointHealthy ? 'Online' : 'Idle (startet bei Bedarf)'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Endpoint</p>
              <p className="text-sm font-medium text-white truncate">{endpoint?.name || '—'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 font-mono">{endpoint?.id || '—'}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">GPU</p>
              <p className="text-sm font-medium text-white">{endpoint?.gpuIds || '—'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Worker: {endpoint?.workers?.min ?? '?'} – {endpoint?.workers?.max ?? '?'}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Worker Status</p>
              <p className="text-sm font-medium text-white">
                {health?.workers?.running ?? 0} aktiv
                <span className="text-gray-500 text-xs ml-1">/ {health?.workers?.idle ?? 0} idle</span>
              </p>
              {(health?.workers?.initializing ?? 0) > 0 && (
                <p className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {health?.workers?.initializing} initialisiert...
                </p>
              )}
            </div>
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <p className="text-xs text-gray-500 mb-1">Jobs</p>
              <p className="text-sm font-medium text-white">{health?.jobs?.completed ?? 0} erledigt</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {health?.jobs?.failed ?? 0} fehlgeschlagen · {health?.jobs?.inQueue ?? 0} in Queue
              </p>
            </div>
          </div>

          <div className="mt-3">
            <code className="text-[10px] px-2 py-1 rounded bg-black/30 font-mono text-gray-500">
              {endpoint?.image || dockerImage || '—'}
            </code>
          </div>
        </ModernCard>

        {/* ── GPU Pod Control ───────────────────────────────────────────────── */}
        <ModernCard className="p-5 border border-violet-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-violet-400" />
              <h2 className="text-white font-semibold">GPU Pod (ComfyUI Editor)</h2>
            </div>
            {pod && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {pod.status}
                {pod.uptime > 0 && (
                  <span className="text-gray-400 ml-1">({Math.round(pod.uptime / 60)} min)</span>
                )}
              </div>
            )}
          </div>

          {!pod ? (
            <div className="text-center py-8">
              <CloudOff className="w-12 h-12 mx-auto text-gray-700 mb-3" />
              <p className="text-gray-400 mb-1">Kein aktiver Pod</p>
              <p className="text-xs text-gray-600 mb-6">
                Starte einen GPU Pod um Workflows im ComfyUI Editor zu bearbeiten und zu testen.
              </p>
              <button
                onClick={createPod}
                disabled={podCreating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-sm font-medium text-violet-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {podCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {podCreating ? 'Pod wird erstellt...' : 'GPU Pod starten'}
              </button>
              <p className="text-[10px] text-gray-600 mt-3">
                RTX 4090 · ~$0.40/Std · Editor verfügbar nach ~60s
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Pod ID</p>
                  <p className="text-sm font-medium text-white font-mono">{pod.id}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="text-sm font-medium text-white">{pod.name}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Kosten</p>
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    ~${((pod.uptime / 3600) * 0.40).toFixed(2)} bisher
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {pod.editorUrl && (
                  <a
                    href={pod.editorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-sm font-medium text-blue-300 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    ComfyUI Editor öffnen
                  </a>
                )}
                <button
                  onClick={deletePod}
                  disabled={podDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-sm font-medium text-red-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {podDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  Pod stoppen & löschen
                </button>
              </div>

              {!pod.editorUrl && (
                <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-lg">
                  <Clock className="w-4 h-4 shrink-0" />
                  Editor wird vorbereitet... Bitte warten (~30-60s).
                  <button onClick={loadStatus} className="ml-auto text-amber-400 underline hover:no-underline">
                    Refresh
                  </button>
                </div>
              )}
            </div>
          )}
        </ModernCard>

        {/* ── ComfyUI Workflows ─────────────────────────────────────────────── */}
        <ModernCard className="p-5 border border-pink-500/20">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-pink-400" />
              <h2 className="text-white font-semibold">Qwen Image Edit Workflows</h2>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-medium">
              {workflowStats.available} / {workflowStats.total} aktiv
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Jeder Effect hat einen eigenen Workflow (JSON). Änderungen sind sofort aktiv — kein Docker-Rebuild nötig.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {workflows.map((wf) => (
              <div
                key={wf.effect}
                className={`relative rounded-xl border p-4 transition-all ${
                  wf.hasWorkflow
                    ? 'border-white/10 bg-white/5 hover:border-violet-500/40 hover:bg-white/[0.07]'
                    : 'border-dashed border-white/5 bg-white/[0.02] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{wf.icon}</span>
                    <h3 className="text-sm font-semibold text-white">{wf.label}</h3>
                  </div>
                  {wf.hasWorkflow ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <X className="w-4 h-4 text-gray-700" />
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-[10px]">{wf.effect}</code>
                  {wf.hasWorkflow && (
                    <span>· {wf.nodeCount} Nodes</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {wf.hasWorkflow && (
                    <button
                      onClick={() => downloadWorkflow(wf.effect)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      JSON
                    </button>
                  )}
                  <button
                    onClick={() => uploadWorkflow(wf.effect)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-lg transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    {wf.hasWorkflow ? 'Update' : 'Upload'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ModernCard>

        {/* ── Info Box ──────────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/10">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-blue-300">Workflow-Bearbeitungsablauf</div>
            <ol className="text-xs text-blue-400/80 mt-1.5 space-y-1 list-decimal list-inside">
              <li><strong className="text-blue-300">Pod starten</strong> → GPU Pod mit ComfyUI Editor hochfahren</li>
              <li><strong className="text-blue-300">Editor öffnen</strong> → Workflow JSON herunterladen und im Editor laden</li>
              <li><strong className="text-blue-300">Bearbeiten & Testen</strong> → Nodes anpassen, Prompt optimieren</li>
              <li><strong className="text-blue-300">Exportieren</strong> → Workflow als API-Format JSON exportieren</li>
              <li><strong className="text-blue-300">Upload</strong> → JSON hier hochladen → sofort in Produktion aktiv</li>
              <li><strong className="text-blue-300">Pod stoppen</strong> → Kosten sparen (keine laufenden Kosten)</li>
            </ol>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
