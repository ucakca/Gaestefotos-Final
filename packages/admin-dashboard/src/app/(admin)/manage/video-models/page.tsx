'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Video,
  Loader2,
  RefreshCw,
  Zap,
  Crown,
  Gauge,
  ExternalLink,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface VideoModel {
  key: string;
  model: string;
  label: string;
  tier: 'fast' | 'standard' | 'premium';
}

const TIER_CONFIG: Record<string, { label: string; variant: 'success' | 'info' | 'accent'; icon: any; desc: string }> = {
  fast: { label: 'Schnell', variant: 'success', icon: Zap, desc: '~30s Generierung, gute Qualität' },
  standard: { label: 'Standard', variant: 'info', icon: Gauge, desc: '~60s Generierung, sehr gute Qualität' },
  premium: { label: 'Premium', variant: 'accent', icon: Crown, desc: '~90-120s Generierung, beste Qualität' },
};

const MODEL_DETAILS: Record<string, { provider: string; description: string; strengths: string[] }> = {
  seedance: {
    provider: 'ByteDance',
    description: 'Seedance ist ByteDances neuestes Video-Modell mit schneller Generierung und guter Bewegungsqualität.',
    strengths: ['Schnelle Generierung', 'Natürliche Bewegungen', 'Gutes Preis-Leistungs-Verhältnis'],
  },
  kling: {
    provider: 'Kuaishou',
    description: 'Kling 2.1 ist das Premium-Modell von Kuaishou mit der höchsten Videoqualität und realistischen Details.',
    strengths: ['Höchste Qualität', 'Realistische Details', 'Cinematic Look'],
  },
  wan: {
    provider: 'Wan AI',
    description: 'Wan 2.1 bietet eine gute Balance zwischen Geschwindigkeit und Qualität für die meisten Anwendungsfälle.',
    strengths: ['Ausgewogene Qualität', 'Vielseitig einsetzbar', 'Stabile Ergebnisse'],
  },
  vidu: {
    provider: 'Vidu AI',
    description: 'Vidu ist auf schnelle Generierung optimiert und liefert gute Ergebnisse in kurzer Zeit.',
    strengths: ['Sehr schnell', 'Konsistente Qualität', 'Ideal für Events'],
  },
  hailuo: {
    provider: 'MiniMax',
    description: 'Hailuo von MiniMax ist eines der neuesten Modelle mit innovativen Bewegungsalgorithmen.',
    strengths: ['Neueste Technologie', 'Kreative Bewegungen', 'Gute Gesichtserkennung'],
  },
};

export default function VideoModelsPage() {
  const [models, setModels] = useState<VideoModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const loadModels = async () => {
    setLoading(true);
    try {
      const r = await api.get('/ai-jobs/video-models');
      setModels(r.data?.models || []);
    } catch (e: any) {
      toast.error('Video-Modelle konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadModels(); }, []);

  const tierOrder = { fast: 0, standard: 1, premium: 2 };
  const sortedModels = [...models].sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <Video className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Video Modelle</h1>
              <p className="text-sm text-gray-400">{models.length} FAL.ai Modelle verfügbar · Image-to-Video</p>
            </div>
          </div>
          <button
            onClick={loadModels}
            disabled={loading}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Info Banner */}
        <ModernCard className="p-4 border border-orange-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">AI Video Booth — Multi-Model Unterstützung</p>
              <p className="text-xs text-gray-400 mt-1">
                Jedes Video-Modell wird über FAL.ai bereitgestellt und kann im Booth für Gäste zur Verfügung gestellt werden.
                Gäste wählen ein Modell, und das Ergebnis wird asynchron per QR-Code zugestellt.
                Zusätzlich sind Runway und LumaAI als Fallback-Provider verfügbar.
              </p>
            </div>
          </div>
        </ModernCard>

        {/* Models Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-white/5 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : sortedModels.length === 0 ? (
          <ModernCard className="p-12 text-center">
            <Video className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Keine Video-Modelle verfügbar</p>
          </ModernCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedModels.map(model => {
              const tier = TIER_CONFIG[model.tier] || TIER_CONFIG.standard;
              const details = MODEL_DETAILS[model.key];
              const TierIcon = tier.icon;
              const isSelected = selectedModel === model.key;

              return (
                <ModernCard
                  key={model.key}
                  hover
                  onClick={() => setSelectedModel(isSelected ? null : model.key)}
                  className={`p-5 transition-all ${isSelected ? 'ring-2 ring-orange-500/50 border-orange-500/30' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-500/20 rounded-lg">
                        <Video className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{model.label}</h3>
                        {details && <p className="text-[10px] text-gray-500">{details.provider}</p>}
                      </div>
                    </div>
                    <Badge variant={tier.variant}>
                      <TierIcon className="w-3 h-3" />
                      {tier.label}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-500 font-mono mb-3 bg-white/5 px-2 py-1 rounded">
                    {model.model}
                  </p>

                  {details && (
                    <>
                      <p className="text-xs text-gray-400 mb-3">{details.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {details.strengths.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-[10px] text-gray-300">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-gray-600 mt-3">{tier.desc}</p>
                </ModernCard>
              );
            })}
          </div>
        )}

        {/* Additional Providers */}
        <ModernCard className="p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Weitere Video-Provider (Fallback)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <Video className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white">Runway Gen-3</p>
                <p className="text-[10px] text-gray-400">Premium Video-Generierung, sehr hohe Qualität</p>
              </div>
              <Badge variant="accent" className="ml-auto">Premium</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
              <div className="p-1.5 bg-violet-500/20 rounded-lg">
                <Video className="w-4 h-4 text-violet-400" />
              </div>
              <div>
                <p className="text-sm text-white">LumaAI Dream Machine</p>
                <p className="text-[10px] text-gray-400">Kreative Video-Generierung, gute Bewegungen</p>
              </div>
              <Badge variant="secondary" className="ml-auto">Standard</Badge>
            </div>
          </div>
        </ModernCard>
      </div>
    </PageTransition>
  );
}
