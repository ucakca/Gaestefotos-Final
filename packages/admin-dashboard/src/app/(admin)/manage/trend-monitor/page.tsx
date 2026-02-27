'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  TrendingUp,
  Play,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Sparkles,
  Globe,
  MessageSquare,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface TrendItem {
  title: string;
  source: string;
  score?: number;
  url?: string;
  tags?: string[];
}

interface TrendSuggestion {
  type: 'template' | 'effect' | 'style' | 'event_theme';
  title: string;
  reason: string;
  category?: string;
  tags?: string[];
  priority: 'high' | 'medium' | 'low';
}

interface TrendReport {
  id: string;
  weekOf: string;
  source: string;
  status: string;
  fetchedAt: string;
  createdAt: string;
  trends: TrendItem[];
  suggestions: TrendSuggestion[];
}

const SOURCE_ICONS: Record<string, any> = {
  civitai: Sparkles,
  hackernews: Globe,
  'fal.ai': Cpu,
  huggingface: Cpu,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-500/20 border-red-500/30 text-red-300',
  medium: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
  low: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
};

const TYPE_ICONS: Record<string, string> = {
  template: '🎭',
  effect: '✨',
  style: '🎨',
  event_theme: '📅',
};

export default function TrendMonitorPage() {
  const [report, setReport] = useState<TrendReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadLatest = async () => {
    setLoading(true);
    try {
      const r = await api.get('/admin/trend-monitor/latest/summary');
      setReport(r.data?.report || null);
      if (!r.data?.report) setMessage(r.data?.message || '');
    } catch {
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLatest(); }, []);

  const runAnalysis = async () => {
    setRunning(true);
    toast.loading('Trend-Analyse läuft… (30-60s)', { id: 'trend-run' });
    try {
      await api.post('/admin/trend-monitor/run');
      // Poll for result
      await new Promise(r => setTimeout(r, 10000));
      let tries = 0;
      while (tries < 8) {
        await new Promise(r => setTimeout(r, 8000));
        tries++;
        const r2 = await api.get('/admin/trend-monitor/latest/summary');
        if (r2.data?.report?.fetchedAt) {
          const fetchedAt = new Date(r2.data.report.fetchedAt);
          const diffMs = Date.now() - fetchedAt.getTime();
          if (diffMs < 90000) {
            setReport(r2.data.report);
            toast.success('Trend-Analyse abgeschlossen ✓', { id: 'trend-run' });
            setRunning(false);
            return;
          }
        }
      }
      toast.error('Analyse läuft noch — bitte später neu laden', { id: 'trend-run' });
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler', { id: 'trend-run' });
    } finally {
      setRunning(false);
    }
  };

  // Group trends by source
  const trendsBySource = report?.trends?.reduce((acc, t) => {
    const key = t.source.split('/')[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, TrendItem[]>) || {};

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Trend Monitor</h1>
              <p className="text-sm text-gray-400">
                Trends aus: HuggingFace, CivitAI, Hacker News, FAL.ai
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadLatest}
              disabled={loading}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={runAnalysis}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm text-green-300 transition-colors disabled:opacity-50"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Analysiert…' : 'Jetzt analysieren'}
            </button>
          </div>
        </div>

        {/* Sources Info */}
        <ModernCard className="p-4">
          <p className="text-xs text-gray-400 mb-3 font-medium">Trend-Quellen (automatisch, keine API-Keys nötig)</p>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '🤗', label: 'HuggingFace Image', desc: 'Trending Bild-Modelle' },
              { icon: '🎬', label: 'HuggingFace Video', desc: 'Trending Video-Modelle' },
              { icon: '🧠', label: 'HuggingFace LLMs', desc: 'Trending Sprach-Modelle' },
              { icon: '🎨', label: 'CivitAI Checkpoints', desc: 'Top bewertete SD-Modelle' },
              { icon: '✨', label: 'CivitAI LoRAs', desc: 'Trending Style-LoRAs' },
              { icon: '📰', label: 'Hacker News AI', desc: 'AI-relevante Tech-News' },
              { icon: '⚡', label: 'FAL.ai Models', desc: 'Neue verfügbare AI-Modelle' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                <span>{icon}</span>
                <div>
                  <p className="text-xs font-medium text-white">{label}</p>
                  <p className="text-[10px] text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </ModernCard>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : !report ? (
          <ModernCard className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">{message || 'Noch keine Trend-Analyse vorhanden'}</p>
            <p className="text-sm text-gray-500">Klicke "Jetzt analysieren" für den ersten Bericht</p>
          </ModernCard>
        ) : (
          <>
            {/* Report Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Woche vom {new Date(report.weekOf).toLocaleDateString('de')}</span>
                {report.fetchedAt && (
                  <span className="text-gray-600">· Abgerufen: {new Date(report.fetchedAt).toLocaleString('de')}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">{report.trends?.length || 0} Trends · {report.suggestions?.length || 0} Vorschläge</span>
              </div>
            </div>

            {/* Suggestions */}
            {report.suggestions?.length > 0 && (
              <ModernCard className="p-5">
                <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  KI-Vorschläge für diese Woche
                </h2>
                <div className="space-y-2">
                  {report.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_COLORS[s.priority]}`}
                    >
                      <span className="text-lg mt-0.5">{TYPE_ICONS[s.type] || '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold">{s.title}</p>
                          <span className="text-[10px] px-1.5 py-0.5 bg-black/20 rounded capitalize">{s.type}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize border ${PRIORITY_COLORS[s.priority]}`}>{s.priority}</span>
                        </div>
                        <p className="text-xs opacity-70 mt-0.5">{s.reason}</p>
                        {s.tags && s.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {s.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-black/20 rounded">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ModernCard>
            )}

            {/* Trends by Source */}
            <ModernCard className="p-5">
              <h2 className="text-base font-semibold text-white mb-4">Trending Topics nach Quelle</h2>
              <div className="space-y-2">
                {Object.entries(trendsBySource).map(([source, items]) => (
                  <div key={source} className="border border-white/10 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSource(expandedSource === source ? null : source)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-white">{source}</span>
                        <span className="text-xs text-gray-500">({items.length} Trends)</span>
                      </div>
                      {expandedSource === source ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSource === source && (
                      <div className="px-4 py-3 space-y-2">
                        {items.map((t, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-xs text-gray-500 w-5 mt-0.5 shrink-0">{i + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-white flex-1 line-clamp-2">{t.title}</p>
                                {t.score && <span className="text-xs text-gray-500 shrink-0">↑{t.score.toLocaleString()}</span>}
                                {t.url && (
                                  <a href={t.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                                    <ExternalLink className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                                  </a>
                                )}
                              </div>
                              {t.tags && t.tags.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {t.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="text-[9px] px-1 py-0.5 bg-white/5 rounded text-gray-500">{tag}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ModernCard>
          </>
        )}
      </div>
    </PageTransition>
  );
}
