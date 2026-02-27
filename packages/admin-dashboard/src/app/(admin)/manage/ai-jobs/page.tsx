'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  QrCode,
  Image as ImageIcon,
  Video,
  Wand2,
  ScanFace,
  ClipboardList,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Timer,
  BarChart3,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface AiJob {
  id: string;
  eventId: string;
  photoId: string | null;
  deviceId: string | null;
  feature: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  shortCode: string;
  resultUrl: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  durationSec: number | null;
}

interface JobStats {
  QUEUED?: number;
  PROCESSING?: number;
  COMPLETED?: number;
  FAILED?: number;
}

interface FeatureStat {
  feature: string;
  count: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'error'; icon: any }> = {
  QUEUED: { label: 'Wartend', variant: 'info', icon: Clock },
  PROCESSING: { label: 'Verarbeitung', variant: 'warning', icon: Loader2 },
  COMPLETED: { label: 'Fertig', variant: 'success', icon: CheckCircle2 },
  FAILED: { label: 'Fehlgeschlagen', variant: 'error', icon: XCircle },
};

const FEATURE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  style_transfer: { label: 'Style Transfer', icon: Wand2, color: 'text-purple-400' },
  face_swap: { label: 'Face Swap', icon: ScanFace, color: 'text-pink-400' },
  face_switch: { label: 'Face Switch', icon: ScanFace, color: 'text-pink-400' },
  ai_video: { label: 'AI Video', icon: Video, color: 'text-orange-400' },
  survey_ai: { label: 'Survey AI', icon: ClipboardList, color: 'text-green-400' },
};

function formatDuration(sec: number | null): string {
  if (sec === null || sec === undefined) return '-';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AiJobsPage() {
  const [jobs, setJobs] = useState<AiJob[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<JobStats>({});
  const [features, setFeatures] = useState<FeatureStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFeature, setFilterFeature] = useState('');
  const [search, setSearch] = useState('');
  const pageSize = 50;

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: pageSize, offset: page * pageSize };
      if (filterStatus) params.status = filterStatus;
      if (filterFeature) params.feature = filterFeature;
      const r = await api.get('/ai-jobs/admin/list', { params });
      setJobs(r.data?.jobs || []);
      setTotal(r.data?.total || 0);
      setStats(r.data?.stats || {});
      setFeatures(r.data?.features || []);
    } catch (e: any) {
      toast.error('Jobs konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterFeature]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Auto-refresh every 10s
  useEffect(() => {
    const iv = setInterval(loadJobs, 10000);
    return () => clearInterval(iv);
  }, [loadJobs]);

  const filteredJobs = jobs.filter(j =>
    !search ||
    j.shortCode.toLowerCase().includes(search.toLowerCase()) ||
    j.id.toLowerCase().includes(search.toLowerCase()) ||
    (j.eventId || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAll = (stats.QUEUED || 0) + (stats.PROCESSING || 0) + (stats.COMPLETED || 0) + (stats.FAILED || 0);
  const successRate = totalAll > 0 ? Math.round(((stats.COMPLETED || 0) / totalAll) * 100) : 0;

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl">
              <QrCode className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Jobs Monitor</h1>
              <p className="text-sm text-gray-400">{total} Jobs · Async Delivery Pipeline</p>
            </div>
          </div>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-400">Aktualisieren</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ModernCard className="p-4 text-center">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats.QUEUED || 0}</div>
            <div className="text-xs text-gray-400">Wartend</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <Loader2 className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats.PROCESSING || 0}</div>
            <div className="text-xs text-gray-400">In Verarbeitung</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats.COMPLETED || 0}</div>
            <div className="text-xs text-gray-400">Fertig</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{stats.FAILED || 0}</div>
            <div className="text-xs text-gray-400">Fehlgeschlagen</div>
          </ModernCard>
          <ModernCard className="p-4 text-center">
            <BarChart3 className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{successRate}%</div>
            <div className="text-xs text-gray-400">Erfolgsrate</div>
          </ModernCard>
        </div>

        {/* Feature Breakdown */}
        {features.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {features.map(f => {
              const cfg = FEATURE_CONFIG[f.feature] || { label: f.feature, icon: Zap, color: 'text-gray-400' };
              const Icon = cfg.icon;
              return (
                <button
                  key={f.feature}
                  onClick={() => setFilterFeature(filterFeature === f.feature ? '' : f.feature)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                    filterFeature === f.feature
                      ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                  {cfg.label} ({f.count})
                </button>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Short Code, Job-ID oder Event suchen…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
            />
          </div>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setFilterStatus(filterStatus === key ? '' : key); setPage(0); }}
              className={`px-3 py-2 rounded-lg text-xs transition-colors border ${
                filterStatus === key
                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Jobs Table */}
        {loading && jobs.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <ModernCard className="p-12 text-center">
            <QrCode className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Keine AI Jobs gefunden</p>
          </ModernCard>
        ) : (
          <ModernCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Short Code</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Feature</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Dauer</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Erstellt</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Event</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">Ergebnis</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map(job => {
                    const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.QUEUED;
                    const featureCfg = FEATURE_CONFIG[job.feature] || { label: job.feature, icon: Zap, color: 'text-gray-400' };
                    const StatusIcon = statusCfg.icon;
                    const FeatureIcon = featureCfg.icon;

                    return (
                      <tr key={job.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-cyan-300">{job.shortCode}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <FeatureIcon className={`w-3.5 h-3.5 ${featureCfg.color}`} />
                            <span className="text-white">{featureCfg.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusCfg.variant}>
                            <StatusIcon className={`w-3 h-3 ${job.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                            {statusCfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Timer className="w-3 h-3" />
                            {formatDuration(job.durationSec)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {formatTime(job.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 font-mono">{(job.eventId || '').slice(0, 8)}…</span>
                        </td>
                        <td className="px-4 py-3">
                          {job.status === 'COMPLETED' && job.resultUrl ? (
                            <a href={job.resultUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors">
                              <ExternalLink className="w-3 h-3" />
                              <span className="text-xs">Anzeigen</span>
                            </a>
                          ) : job.status === 'FAILED' && job.error ? (
                            <span className="text-xs text-red-400 truncate max-w-32 block" title={job.error}>
                              {job.error.slice(0, 40)}…
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
                <span className="text-xs text-gray-400">
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} von {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * pageSize >= total}
                    className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )}
          </ModernCard>
        )}
      </div>
    </PageTransition>
  );
}
