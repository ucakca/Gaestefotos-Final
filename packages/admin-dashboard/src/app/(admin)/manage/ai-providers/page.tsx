'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  Brain,
  Plus,
  Pencil,
  Trash2,
  Key,
  Activity,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  TestTube,
  BarChart3,
  Plug,
  Star,
  Eye,
  EyeOff,
  Save,
  X,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Clock,
  PlayCircle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { ModernCard } from '@/components/ui/ModernCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard, SkeletonStats } from '@/components/ui/Skeleton';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface AiProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyHint: string | null;
  hasApiKey: boolean;
  defaultModel: string | null;
  models: { id: string; name: string; costPer1kTokens?: number }[] | null;
  isActive: boolean;
  isDefault: boolean;
  rateLimitPerMinute: number | null;
  rateLimitPerDay: number | null;
  monthlyBudgetCents: number | null;
  config: any;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  _count: { usageLogs: number; featureMappings: number };
}

interface AiFeatureMapping {
  id: string;
  feature: string;
  providerId: string;
  model: string | null;
  isEnabled: boolean;
  maxTokens: number | null;
  temperature: number | null;
  provider: { id: string; slug: string; name: string; type: string };
}

interface UsageStats {
  monthly: { requests: number; tokens: number; costCents: number };
  errorRate: string;
  errorRatePerProvider: Record<string, string>;
  perProvider: any[];
  perFeature: any[];
  daily: { day: string; requests: number; tokens: number; cost: number }[];
}

const PROVIDER_TYPES = [
  { value: 'LLM', label: 'LLM (Text)', color: 'bg-blue-500' },
  { value: 'IMAGE_GEN', label: 'Bildgenerierung', color: 'bg-purple-500' },
  { value: 'FACE_RECOGNITION', label: 'Gesichtserkennung', color: 'bg-success/100' },
  { value: 'VIDEO_GEN', label: 'Videogenerierung', color: 'bg-orange-500' },
  { value: 'STT', label: 'Speech-to-Text', color: 'bg-cyan-500' },
  { value: 'TTS', label: 'Text-to-Speech', color: 'bg-pink-500' },
];

const AI_FEATURES = [
  // Host Tools (LLM)
  { key: 'chat', label: 'KI Chat-Assistent', type: 'LLM', credits: 1, workflow: false },
  { key: 'album_suggest', label: 'Album-Vorschläge', type: 'LLM', credits: 1, workflow: false },
  { key: 'description_suggest', label: 'Beschreibungs-Generator', type: 'LLM', credits: 1, workflow: false },
  { key: 'invitation_suggest', label: 'Einladungstext-Generator', type: 'LLM', credits: 1, workflow: false },
  { key: 'challenge_suggest', label: 'Challenge-Vorschläge', type: 'LLM', credits: 1, workflow: false },
  { key: 'guestbook_suggest', label: 'Gästebuch-Nachricht', type: 'LLM', credits: 1, workflow: false },
  { key: 'color_scheme', label: 'Farbschema-Generator', type: 'LLM', credits: 1, workflow: false },
  { key: 'ai_categorize', label: 'AI Kategorisierung', type: 'LLM', credits: 1, workflow: false },
  // Games (LLM)
  { key: 'compliment_mirror', label: 'Compliment Mirror', type: 'LLM', credits: 2, workflow: true },
  { key: 'fortune_teller', label: 'Fortune Teller', type: 'LLM', credits: 2, workflow: true },
  { key: 'ai_roast', label: 'AI Roast', type: 'LLM', credits: 2, workflow: true },
  { key: 'caption_suggest', label: 'Caption Generator', type: 'LLM', credits: 1, workflow: false },
  { key: 'celebrity_lookalike', label: 'Promi-Doppelgänger', type: 'LLM', credits: 2, workflow: true },
  { key: 'ai_bingo', label: 'Foto-Bingo', type: 'LLM', credits: 1, workflow: true },
  { key: 'ai_dj', label: 'AI DJ', type: 'LLM', credits: 1, workflow: true },
  { key: 'ai_meme', label: 'Meme Generator', type: 'LLM', credits: 1, workflow: true },
  { key: 'ai_superlatives', label: 'Party Awards', type: 'LLM', credits: 1, workflow: true },
  { key: 'ai_photo_critic', label: 'Foto-Kritiker', type: 'LLM', credits: 1, workflow: true },
  { key: 'ai_couple_match', label: 'Couple Match', type: 'LLM', credits: 2, workflow: true },
  { key: 'persona_quiz', label: 'Persona Quiz', type: 'LLM', credits: 2, workflow: true },
  { key: 'wedding_speech', label: 'Hochzeitsrede', type: 'LLM', credits: 2, workflow: true },
  { key: 'ai_stories', label: 'Story Generator', type: 'LLM', credits: 2, workflow: true },
  // Image Effects (IMAGE_GEN)
  { key: 'face_switch', label: 'Face Swap', type: 'IMAGE_GEN', credits: 5, workflow: true },
  { key: 'bg_removal', label: 'Hintergrund entfernen', type: 'IMAGE_GEN', credits: 3, workflow: true },
  { key: 'ai_oldify', label: 'Oldify (Alterung)', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'ai_cartoon', label: 'Pixar Cartoon', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'ai_style_pop', label: 'Style Pop', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'time_machine', label: 'Time Machine', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'pet_me', label: 'Pet Me', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'yearbook', label: 'Yearbook', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'emoji_me', label: 'Emoji Me', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'miniature', label: 'Miniature', type: 'IMAGE_GEN', credits: 3, workflow: true },
  { key: 'gif_morph', label: 'GIF Morph', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'gif_aging', label: 'Aging GIF', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'trading_card', label: 'Trading Card', type: 'IMAGE_GEN', credits: 3, workflow: true },
  { key: 'anime', label: 'Anime', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'watercolor', label: 'Aquarell', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'oil_painting', label: 'Ölgemälde', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'sketch', label: 'Bleistiftzeichnung', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'neon_noir', label: 'Neon Noir', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'renaissance', label: 'Renaissance', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'comic_book', label: 'Comic Book', type: 'IMAGE_GEN', credits: 4, workflow: true },
  { key: 'pixel_art', label: 'Pixel Art', type: 'IMAGE_GEN', credits: 4, workflow: true },
  // AI Slot Machine + Cover-Shooting
  { key: 'ai_slot_machine', label: 'AI Slot Machine', type: 'IMAGE_GEN', credits: 5, workflow: true },
  { key: 'cover_shot', label: 'Cover-Shooting', type: 'IMAGE_GEN', credits: 0, workflow: true },
  { key: 'photo_strip', label: 'Photo Strip', type: 'IMAGE_GEN', credits: 0, workflow: false },
  { key: 'style_transfer', label: 'Style Transfer (KI Booth)', type: 'IMAGE_GEN', credits: 5, workflow: true },
  { key: 'drawbot', label: 'Drawbot', type: 'IMAGE_GEN', credits: 8, workflow: true },
  // Video (VIDEO_GEN)
  { key: 'ai_video', label: 'AI Video', type: 'VIDEO_GEN', credits: 5, workflow: true },
  { key: 'highlight_reel', label: 'Highlight Reel', type: 'VIDEO_GEN', credits: 10, workflow: true },
  // Recognition
  { key: 'face_search', label: 'Gesichtssuche (Face Search)', type: 'FACE_RECOGNITION', credits: 0, workflow: true },
];

// Known provider presets for quick setup
const PROVIDER_PRESETS = [
  {
    slug: 'groq',
    name: 'Groq (Llama 3.1)',
    type: 'LLM',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
    description: 'Bereits integriert — schnelle LLM-Inferenz mit Llama 3.1',
    envKey: 'GROQ_API_KEY',
    features: ['chat', 'album_suggest', 'description_suggest', 'invitation_suggest', 'challenge_suggest', 'guestbook_suggest', 'color_scheme', 'caption_suggest', 'compliment_mirror', 'fortune_teller', 'ai_roast', 'celebrity_lookalike', 'persona_quiz', 'wedding_speech', 'ai_stories', 'ai_bingo', 'ai_dj', 'ai_meme', 'ai_superlatives', 'ai_photo_critic', 'ai_couple_match', 'ai_categorize'],
  },
  {
    slug: 'openai',
    name: 'OpenAI (GPT-4)',
    type: 'LLM',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    description: 'Premium LLM — ideal als Fallback oder für komplexere Aufgaben',
    envKey: 'OPENAI_API_KEY',
    features: ['chat', 'album_suggest', 'description_suggest'],
  },
  {
    slug: 'grok',
    name: 'Grok (xAI)',
    type: 'LLM',
    baseUrl: 'https://api.x.ai/v1',
    defaultModel: 'grok-2-latest',
    description: 'xAI Grok — leistungsstarkes LLM mit OpenAI-kompatibler API',
    envKey: 'XAI_API_KEY',
    features: ['chat', 'album_suggest', 'description_suggest', 'invitation_suggest', 'challenge_suggest', 'guestbook_suggest', 'color_scheme', 'compliment_mirror'],
  },
  {
    slug: 'stability-ai',
    name: 'Stability AI (SDXL)',
    type: 'IMAGE_GEN',
    baseUrl: 'https://api.stability.ai',
    defaultModel: 'stable-diffusion-xl-1024-v1-0',
    description: 'Bildgenerierung & Style Transfer',
    envKey: 'STABILITY_API_KEY',
    features: ['style_transfer', 'ai_oldify', 'ai_cartoon', 'ai_style_pop', 'drawbot'],
  },
  {
    slug: 'replicate',
    name: 'Replicate',
    type: 'IMAGE_GEN',
    baseUrl: 'https://api.replicate.com',
    defaultModel: null,
    description: 'Vielseitige Bild-AI: Face Switch, BG Removal, etc.',
    envKey: 'REPLICATE_API_TOKEN',
    features: ['face_switch', 'bg_removal', 'ai_oldify', 'ai_cartoon', 'ai_style_pop'],
  },
  {
    slug: 'remove-bg',
    name: 'remove.bg',
    type: 'IMAGE_GEN',
    baseUrl: 'https://api.remove.bg/v1.0',
    defaultModel: null,
    description: 'Spezialisiert auf Hintergrund-Entfernung',
    envKey: 'REMOVE_BG_API_KEY',
    features: ['bg_removal'],
  },
  {
    slug: 'fal-arcface',
    name: 'FAL.ai InsightFace (ArcFace)',
    type: 'FACE_RECOGNITION',
    baseUrl: null,
    defaultModel: 'fal-ai/insightface',
    description: '🎯 ArcFace 512-dim — deutlich bessere Gesichtserkennung als lokale face-api.js (128-dim)',
    envKey: 'FAL_API_KEY',
    features: ['face_search'],
  },
  {
    slug: 'fal-ai',
    name: 'FAL.ai',
    type: 'IMAGE_GEN',
    baseUrl: null,
    defaultModel: 'fal-ai/flux/dev/image-to-image',
    description: '🏆 Empfohlen — schnellste Bildgenerierung + Face Swap (inswapper) + InstantID',
    envKey: 'FAL_API_KEY',
    features: ['face_switch', 'ai_oldify', 'ai_cartoon', 'ai_style_pop', 'yearbook', 'time_machine', 'pet_me', 'emoji_me', 'miniature', 'gif_morph', 'gif_aging', 'trading_card', 'bg_removal', 'style_transfer', 'ai_slot_machine', 'cover_shot', 'photo_strip', 'anime', 'watercolor', 'oil_painting', 'sketch', 'neon_noir', 'renaissance', 'comic_book', 'pixel_art'],
  },
  {
    slug: 'fal-ai-video',
    name: 'FAL.ai Video',
    type: 'VIDEO_GEN',
    baseUrl: null,
    defaultModel: 'fal-ai/seedance/image-to-video',
    description: '🎬 Video-Generierung — 5 Modelle (Seedance, Kling, Wan, Vidu, Hailuo) via FAL.ai',
    envKey: 'FAL_API_KEY',
    features: ['ai_video', 'highlight_reel'],
  },
  {
    slug: 'runway',
    name: 'Runway Gen-3',
    type: 'VIDEO_GEN',
    baseUrl: 'https://api.dev.runwayml.com',
    defaultModel: 'gen3a_turbo',
    description: 'Premium Video-Generierung — hohe Qualität, Fallback-Provider',
    envKey: 'RUNWAY_API_KEY',
    features: ['ai_video'],
  },
  {
    slug: 'luma-ai',
    name: 'LumaAI Dream Machine',
    type: 'VIDEO_GEN',
    baseUrl: 'https://api.lumalabs.ai',
    defaultModel: 'dream-machine',
    description: 'Kreative Video-Generierung — gute Bewegungen, Fallback-Provider',
    envKey: 'LUMA_API_KEY',
    features: ['ai_video'],
  },
];

// Known models per provider slug for quick selection
const MODEL_LIBRARY: Record<string, { id: string; label: string }[]> = {
  groq: [
    { id: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B Versatile' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  grok: [
    { id: 'grok-2-latest', label: 'Grok 2 Latest' },
    { id: 'grok-2-mini', label: 'Grok 2 Mini' },
  ],
  'stability-ai': [
    { id: 'stable-diffusion-xl-1024-v1-0', label: 'SDXL 1.0' },
    { id: 'stable-diffusion-3-medium', label: 'SD 3 Medium' },
  ],
  'fal-ai': [
    { id: 'fal-ai/flux/dev/image-to-image', label: 'FLUX Dev img2img (Empfohlen)' },
    { id: 'fal-ai/flux-pro', label: 'FLUX Pro (Höchste Qualität)' },
    { id: 'fal-ai/inswapper', label: 'Inswapper (Face Swap)' },
    { id: 'fal-ai/instantid', label: 'InstantID (Identity Preservation)' },
    { id: 'fal-ai/stable-diffusion-v3-medium', label: 'SD 3 Medium' },
    { id: 'fal-ai/aura-flow', label: 'AuraFlow' },
  ],
  'fal-arcface': [
    { id: 'fal-ai/insightface', label: 'InsightFace (ArcFace 512-dim) — Empfohlen' },
    { id: 'fal-ai/face-analysis', label: 'Face Analysis (alternative)' },
  ],
  'fal-ai-video': [
    { id: 'fal-ai/seedance/image-to-video', label: 'Seedance (Schnell)' },
    { id: 'fal-ai/kling-video/v2.1/image-to-video', label: 'Kling 2.1 (Premium)' },
    { id: 'fal-ai/wan/v2.1/image-to-video', label: 'Wan 2.1 (Standard)' },
    { id: 'fal-ai/vidu/image-to-video', label: 'Vidu (Schnell)' },
    { id: 'fal-ai/hailuo/image-to-video', label: 'Hailuo MiniMax (Standard)' },
  ],
  runway: [
    { id: 'gen3a_turbo', label: 'Gen-3 Alpha Turbo' },
    { id: 'gen3a', label: 'Gen-3 Alpha (Höchste Qualität)' },
  ],
  'luma-ai': [
    { id: 'dream-machine', label: 'Dream Machine' },
    { id: 'dream-machine-v1.5', label: 'Dream Machine v1.5' },
  ],
};

function getTypeInfo(type: string) {
  return PROVIDER_TYPES.find(t => t.value === type) || { value: type, label: type, color: 'bg-muted/500' };
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2) + ' €';
}

function BudgetProgressBar({ usedCents, budgetCents }: { usedCents: number; budgetCents: number }) {
  const pct = Math.min((usedCents / budgetCents) * 100, 100);
  const isWarning = pct > 75;
  const isDanger = pct > 90;
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-app-muted">Budget</span>
        <span className={isDanger ? 'text-app-error font-medium' : isWarning ? 'text-app-warning font-medium' : 'text-app-muted'}>
          {formatCents(usedCents)} / {formatCents(budgetCents)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isDanger ? 'bg-app-error' : isWarning ? 'bg-app-warning' : 'bg-app-accent'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function AiProvidersPage() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [mappings, setMappings] = useState<AiFeatureMapping[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'usage'>('providers');
  const [editProvider, setEditProvider] = useState<Partial<AiProvider> & { apiKey?: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testingAll, setTestingAll] = useState(false);
  const [featureSearch, setFeatureSearch] = useState('');
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; durationMs: number } | null>(null);
  const [testAllResults, setTestAllResults] = useState<Record<string, { success: boolean; message: string; durationMs: number }>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [provRes, mapRes, statsRes] = await Promise.all([
        api.get('/admin/ai-providers'),
        api.get('/admin/ai-providers/features/mappings'),
        api.get('/admin/ai-providers/usage/stats?days=30'),
      ]);
      setProviders(provRes.data.providers || []);
      setMappings(mapRes.data.mappings || []);
      setStats(statsRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Laden', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Save Provider ───
  const handleSaveProvider = async () => {
    if (!editProvider) return;
    setSaving(true);
    try {
      const payload: any = {
        slug: editProvider.slug,
        name: editProvider.name,
        type: editProvider.type,
        baseUrl: editProvider.baseUrl || null,
        defaultModel: editProvider.defaultModel || null,
        isActive: editProvider.isActive ?? true,
        isDefault: editProvider.isDefault ?? false,
        rateLimitPerMinute: editProvider.rateLimitPerMinute || null,
        rateLimitPerDay: editProvider.rateLimitPerDay || null,
        monthlyBudgetCents: editProvider.monthlyBudgetCents || null,
      };
      if (editProvider.apiKey !== undefined) {
        payload.apiKey = editProvider.apiKey || null;
      }

      if (editProvider.id) {
        await api.put(`/admin/ai-providers/${editProvider.id}`, payload);
        showToast('Provider gespeichert', 'success');
      } else {
        await api.post('/admin/ai-providers', payload);
        showToast('Provider erstellt', 'success');
      }
      setEditProvider(null);
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete Provider ───
  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Provider wirklich löschen? Alle Usage-Logs werden ebenfalls gelöscht.')) return;
    try {
      await api.delete(`/admin/ai-providers/${id}`);
      showToast('Provider gelöscht', 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Löschen', 'error');
    }
  };

  // ─── Test Provider ───
  const handleTestProvider = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await api.post(`/admin/ai-providers/${id}/test`);
      setTestResult({ id, ...res.data });
    } catch (err: any) {
      setTestResult({ id, success: false, message: err.response?.data?.error || 'Test fehlgeschlagen', durationMs: 0 });
    } finally {
      setTesting(null);
    }
  };

  // ─── Test All Providers ───
  const handleTestAll = async () => {
    const testable = providers.filter(p => p.isActive && p.hasApiKey);
    if (testable.length === 0) {
      showToast('Keine testbaren Provider gefunden', 'error');
      return;
    }
    setTestingAll(true);
    setTestAllResults({});
    let successCount = 0;
    let failCount = 0;

    for (const provider of testable) {
      try {
        const res = await api.post(`/admin/ai-providers/${provider.id}/test`);
        setTestAllResults(prev => ({ ...prev, [provider.id]: res.data }));
        if (res.data.success) successCount++; else failCount++;
      } catch (err: any) {
        const result = { success: false, message: err.response?.data?.error || 'Test fehlgeschlagen', durationMs: 0 };
        setTestAllResults(prev => ({ ...prev, [provider.id]: result }));
        failCount++;
      }
    }

    setTestingAll(false);
    showToast(`Test abgeschlossen: ${successCount} OK, ${failCount} Fehler`, successCount > 0 && failCount === 0 ? 'success' : 'error');
  };

  // ─── Bulk Toggle ───
  const handleBulkToggle = async (active: boolean) => {
    if (!confirm(`Alle Provider ${active ? 'aktivieren' : 'deaktivieren'}?`)) return;
    try {
      await Promise.all(providers.map(p => api.put(`/admin/ai-providers/${p.id}`, { ...p, isActive: active, apiKeyEncrypted: undefined, apiKeyIv: undefined, apiKeyTag: undefined })));
      showToast(`Alle Provider ${active ? 'aktiviert' : 'deaktiviert'}`, 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler bei Bulk-Operation', 'error');
    }
  };

  // ─── Computed Alerts ───
  const alerts = useMemo(() => {
    const list: { type: 'error' | 'warning' | 'info'; message: string }[] = [];
    if (stats && parseFloat(stats.errorRate) > 10) {
      list.push({ type: 'error', message: `Hohe Fehlerrate: ${stats.errorRate}% in den letzten 30 Tagen` });
    }
    if (stats && parseFloat(stats.errorRate) > 5 && parseFloat(stats.errorRate) <= 10) {
      list.push({ type: 'warning', message: `Erhöhte Fehlerrate: ${stats.errorRate}% — Überprüfe Provider-Konfiguration` });
    }
    providers.forEach(p => {
      if (p.monthlyBudgetCents && p.monthlyBudgetCents > 0) {
        const used = stats?.perProvider.find((s: any) => s.providerId === p.id)?._sum?.costCents || 0;
        const pct = (used / p.monthlyBudgetCents) * 100;
        if (pct > 90) list.push({ type: 'error', message: `${p.name}: Budget ${pct.toFixed(0)}% ausgeschöpft (${formatCents(used)} / ${formatCents(p.monthlyBudgetCents)})` });
        else if (pct > 75) list.push({ type: 'warning', message: `${p.name}: Budget bei ${pct.toFixed(0)}% (${formatCents(used)} / ${formatCents(p.monthlyBudgetCents)})` });
      }
    });
    const noKey = providers.filter(p => p.isActive && !p.hasApiKey);
    if (noKey.length > 0) {
      list.push({ type: 'warning', message: `${noKey.length} aktive Provider ohne API Key: ${noKey.map(p => p.name).join(', ')}` });
    }
    const noMapping = AI_FEATURES.filter(f => !mappings.find(m => m.feature === f.key && m.isEnabled));
    if (noMapping.length > 0) {
      list.push({ type: 'info', message: `${noMapping.length} Features ohne aktive Provider-Zuordnung` });
    }
    return list;
  }, [stats, providers, mappings]);

  // ─── Cost Insights ───
  const costInsights = useMemo(() => {
    if (!stats || stats.perProvider.length === 0) return [];
    const insights: { icon: string; text: string }[] = [];
    const sorted = [...stats.perProvider].sort((a, b) => (b._sum?.costCents || 0) - (a._sum?.costCents || 0));
    const topProv = providers.find(p => p.id === sorted[0]?.providerId);
    if (topProv && sorted[0]._sum?.costCents > 0) {
      insights.push({ icon: '💰', text: `Höchste Kosten: ${topProv.name} mit ${formatCents(sorted[0]._sum.costCents)} (${sorted[0]._count} Requests)` });
    }
    const fastest = [...stats.perProvider].sort((a, b) => (a._avg?.durationMs || 999999) - (b._avg?.durationMs || 999999));
    const fastProv = providers.find(p => p.id === fastest[0]?.providerId);
    if (fastProv) {
      insights.push({ icon: '⚡', text: `Schnellster Provider: ${fastProv.name} mit Ø ${Math.round(fastest[0]._avg?.durationMs || 0)}ms` });
    }
    const avgCost = stats.monthly.costCents / Math.max(stats.monthly.requests, 1);
    insights.push({ icon: '📊', text: `Durchschnittliche Kosten pro Request: ${(avgCost / 100).toFixed(4)} €` });
    if (stats.monthly.requests > 0) {
      const projectedMonthly = (stats.monthly.costCents / 30) * 30;
      insights.push({ icon: '📈', text: `Prognostizierte Monatskosten: ${formatCents(projectedMonthly)}` });
    }
    return insights;
  }, [stats, providers]);

  // ─── Update Feature Mapping ───
  const handleUpdateMapping = async (feature: string, providerId: string, isEnabled: boolean) => {
    try {
      await api.put(`/admin/ai-providers/features/mappings/${feature}`, { providerId, isEnabled });
      showToast(`Feature "${feature}" aktualisiert`, 'success');
      fetchAll();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler', 'error');
    }
  };

  if (loading) {
    return (
      <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-foreground">AI Provider Management</h1>
            <p className="text-sm text-app-muted">Lade Daten…</p>
          </div>
        </div>
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <SkeletonCard /><SkeletonCard />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-app-foreground">AI Provider Management</h1>
            <p className="text-sm text-app-muted">API Keys, Token-Tracking, Kosten & Feature-Zuordnung</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await api.post('/admin/ai-providers/auto-setup');
                const s = res.data.summary;
                const parts = [];
                if (s.mappingsCreated.length > 0) parts.push(`${s.mappingsCreated.length} Features zugeordnet`);
                if (s.promptsSeeded > 0) parts.push(`${s.promptsSeeded} Prompts geseeded`);
                if (s.errors.length > 0) parts.push(`${s.errors.length} Fehler`);
                toast.success(parts.length > 0 ? parts.join(', ') : 'Alles bereits konfiguriert!');
                // Reload data
                const [pRes, mRes, sRes] = await Promise.all([
                  api.get('/admin/ai-providers'),
                  api.get('/admin/ai-providers/features/mappings'),
                  api.get('/admin/ai-providers/usage/stats?days=30'),
                ]);
                setProviders(pRes.data.providers || []);
                setMappings(mRes.data.mappings || []);
                setStats(sRes.data);
              } catch (err: any) {
                toast.error(err?.response?.data?.error || 'Auto-Setup fehlgeschlagen');
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/10 hover:shadow-soft transition-all text-sm font-medium"
          >
            <Zap className="w-4 h-4" />
            Auto-Setup
          </button>
          {providers.filter(p => p.isActive && p.hasApiKey).length > 0 && (
            <button
              onClick={handleTestAll}
              disabled={testingAll}
              className="flex items-center gap-2 px-4 py-2.5 border border-app-border text-app-fg rounded-xl hover:bg-app-surface hover:shadow-soft transition-all text-sm font-medium disabled:opacity-50"
            >
              {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Alle testen
            </button>
          )}
          <button
            onClick={() => setEditProvider({
              slug: '', name: '', type: 'LLM', isActive: true, isDefault: false,
              baseUrl: null, defaultModel: null, apiKey: '',
              rateLimitPerMinute: null, rateLimitPerDay: null, monthlyBudgetCents: null,
            })}
            className="flex items-center gap-2 px-5 py-2.5 bg-app-accent text-white rounded-xl hover:bg-app-accent-hover hover:shadow-glow transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Neuer Provider
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Plug}
            label="Provider"
            value={providers.length}
            change={{ value: `${providers.filter(p => p.isActive).length} aktiv`, positive: true }}
            gradient="from-blue-500 to-cyan-500"
          />
          <StatCard
            icon={Zap}
            label="Requests (Monat)"
            value={(stats.monthly?.requests ?? 0).toLocaleString()}
            change={{ value: `${(stats.monthly?.tokens ?? 0).toLocaleString()} Tokens`, positive: true }}
            gradient="from-violet-500 to-purple-500"
          />
          <StatCard
            icon={BarChart3}
            label="Kosten (Monat)"
            value={formatCents(stats.monthly.costCents)}
            change={{ value: 'geschätzt', positive: true }}
            gradient="from-amber-500 to-orange-500"
          />
          <StatCard
            icon={Shield}
            label="Fehlerrate"
            value={`${stats.errorRate}%`}
            change={{ value: 'letzte 30 Tage', positive: parseFloat(stats.errorRate) < 5 }}
            gradient="from-emerald-500 to-teal-500"
          />
        </div>
      )}

      {/* ═══════════ Alerts ═══════════ */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border ${
              alert.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-app-border">
        {([
          { key: 'providers', label: 'Provider', icon: Plug },
          { key: 'usage', label: 'Nutzung & Kosten', icon: BarChart3 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition
              ${activeTab === tab.key
                ? 'border-app-primary text-app-primary'
                : 'border-transparent text-app-muted hover:text-app-foreground'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
        <a
          href="/manage/ai-features"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-app-muted hover:text-app-foreground transition"
        >
          <Sparkles className="w-4 h-4" />
          Feature Registry →
        </a>
      </div>

      {/* ═══════════ Tab: Provider List ═══════════ */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {/* Bulk Ops */}
          {providers.length > 1 && (
            <div className="flex items-center gap-2 justify-end">
              <span className="text-xs text-app-muted mr-1">Bulk:</span>
              <button
                onClick={() => handleBulkToggle(true)}
                className="px-3 py-1.5 text-xs rounded-lg border border-app-success/30 text-app-success hover:bg-app-success/10 transition"
              >
                Alle aktivieren
              </button>
              <button
                onClick={() => handleBulkToggle(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-app-error/30 text-app-error hover:bg-app-error/10 transition"
              >
                Alle deaktivieren
              </button>
            </div>
          )}

          {/* Quick Presets */}
          <ModernCard variant="gradient" className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-app-secondary" />
              <h3 className="text-sm font-semibold text-app-fg">Bekannte Provider</h3>
              <span className="text-xs text-app-muted ml-1">
                {PROVIDER_PRESETS.filter(p => providers.some(pr => pr.slug === p.slug)).length}/{PROVIDER_PRESETS.length} konfiguriert
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROVIDER_PRESETS.map(preset => {
                const typeInfo = getTypeInfo(preset.type);
                const existingProvider = providers.find(p => p.slug === preset.slug);
                const isConfigured = !!existingProvider;
                return (
                  <button
                    key={preset.slug}
                    onClick={() => {
                      if (isConfigured) {
                        setEditProvider({ ...existingProvider, apiKey: undefined });
                      } else {
                        setEditProvider({
                          slug: preset.slug,
                          name: preset.name,
                          type: preset.type,
                          baseUrl: preset.baseUrl,
                          defaultModel: preset.defaultModel,
                          isActive: true,
                          isDefault: preset.slug === 'groq',
                          apiKey: '',
                          rateLimitPerMinute: null,
                          rateLimitPerDay: null,
                          monthlyBudgetCents: null,
                        });
                      }
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left group ${
                      isConfigured
                        ? 'bg-app-success/5 border-app-success/20 hover:border-app-success/40'
                        : 'bg-app-surface border-app-border hover:border-app-secondary/50 hover:shadow-medium'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 rounded-xl ${typeInfo.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                      {isConfigured && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-app-success flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-app-fg">{preset.name}</span>
                        {isConfigured && existingProvider?.hasApiKey && (
                          <Badge variant="success" className="!text-[10px] !px-1.5 !py-0">Bereit</Badge>
                        )}
                        {isConfigured && !existingProvider?.hasApiKey && (
                          <Badge variant="warning" className="!text-[10px] !px-1.5 !py-0">Key fehlt</Badge>
                        )}
                      </div>
                      <div className="text-xs text-app-muted mt-0.5 line-clamp-1">{preset.description}</div>
                      <div className="text-xs text-app-muted/60 mt-1 font-mono">ENV: {preset.envKey}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ModernCard>

          {providers.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="Noch keine AI Provider konfiguriert"
              description="Erstelle deinen ersten Provider um KI-Features zu nutzen. Nutze die Schnelleinrichtung oben für bekannte Provider."
              action={{
                label: 'Neuer Provider',
                onClick: () => setEditProvider({
                  slug: '', name: '', type: 'LLM', isActive: true, isDefault: false,
                  baseUrl: null, defaultModel: null, apiKey: '',
                  rateLimitPerMinute: null, rateLimitPerDay: null, monthlyBudgetCents: null,
                }),
                icon: Plus,
              }}
            />
          ) : (
            providers.map(provider => {
              const typeInfo = getTypeInfo(provider.type);
              const providerUsage = stats?.perProvider.find((p: any) => p.providerId === provider.id);
              const usedCents = providerUsage?._sum?.costCents || 0;
              const errorRate = stats?.errorRatePerProvider?.[provider.id];
              const testAllResult = testAllResults[provider.id];
              const activeTestResult = testAllResult || (testResult?.id === provider.id ? testResult : null);
              return (
                <ModernCard key={provider.id} variant="default" hover className="!p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 rounded-xl ${typeInfo.color} flex items-center justify-center shrink-0`}>
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-app-fg">{provider.name}</h3>
                          {provider.isDefault && (
                            <Badge variant="warning"><Star className="w-3 h-3" /> Default</Badge>
                          )}
                          <Badge variant={provider.isActive ? 'success' : 'error'}>
                            {provider.isActive ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                          {errorRate && parseFloat(errorRate) > 0 && (
                            <Badge variant={parseFloat(errorRate) > 10 ? 'error' : 'warning'}>
                              <AlertTriangle className="w-3 h-3" /> {errorRate}% Fehler
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="info">{typeInfo.label}</Badge>
                          <span className="font-mono text-xs text-app-muted">{provider.slug}</span>
                          {provider.defaultModel && (
                            <span className="text-xs text-app-muted">Modell: <strong className="text-app-fg">{provider.defaultModel}</strong></span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-app-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <Key className="w-3.5 h-3.5" />
                            {provider.hasApiKey ? (
                              <span className="text-app-success">Key: {provider.apiKeyHint}</span>
                            ) : (
                              <span className="text-app-error font-medium">Kein API Key</span>
                            )}
                          </span>
                          {provider.rateLimitPerMinute && (
                            <span>{provider.rateLimitPerMinute} Req/Min</span>
                          )}
                          {provider.rateLimitPerDay && (
                            <span>{provider.rateLimitPerDay} Req/Tag</span>
                          )}
                          <span>{provider._count.usageLogs} Logs</span>
                          <span>{provider._count.featureMappings} Features</span>
                          {provider.lastUsedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(provider.lastUsedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {provider.monthlyBudgetCents && provider.monthlyBudgetCents > 0 && (
                          <BudgetProgressBar usedCents={usedCents} budgetCents={provider.monthlyBudgetCents} />
                        )}
                        {/* Stability AI v1 deprecation warning */}
                        {provider.slug.includes('stability') && (
                          <div className="mt-2.5 flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong>Stability AI v1 API wird eingestellt.</strong> Bitte auf FAL.ai (FLUX Dev img2img) oder Stability AI v2 migrieren. 
                              {' '}<a href="https://platform.stability.ai/docs/deprecations" target="_blank" rel="noreferrer" className="underline">Mehr erfahren →</a>
                            </span>
                          </div>
                        )}
                        {/* FAL.ai recommended badge */}
                        {provider.slug.includes('fal') && provider.isActive && (
                          <div className="mt-2.5 flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span><strong>Empfohlen</strong> — Face Swap (inswapper), InstantID, FLUX Dev. Konfiguriere Features über <em>Auto-Setup</em>.</span>
                          </div>
                        )}
                        {/* Test result (single or test-all) */}
                        {activeTestResult && (
                          <div className={`mt-2.5 text-xs px-3 py-2 rounded-lg ${
                            activeTestResult.success ? 'bg-app-success/10 text-app-success border border-app-success/20' : 'bg-app-error/10 text-app-error border border-app-error/20'
                          }`}>
                            {activeTestResult.success ? '✓' : '✗'} {activeTestResult.message} ({activeTestResult.durationMs}ms)
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTestProvider(provider.id)}
                        disabled={testing === provider.id || testingAll || !provider.hasApiKey}
                        className="p-2 rounded-lg text-app-muted hover:text-app-info hover:bg-app-info/10 transition disabled:opacity-30"
                        title="Verbindung testen"
                      >
                        {(testing === provider.id || (testingAll && !testAllResults[provider.id])) ? <Loader2 className="w-5 h-5 animate-spin" /> : <TestTube className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => setEditProvider({ ...provider, apiKey: undefined })}
                        className="p-2 rounded-lg text-app-muted hover:text-app-accent hover:bg-app-accent/10 transition"
                        title="Bearbeiten"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="p-2 rounded-lg text-app-muted hover:text-app-error hover:bg-app-error/10 transition"
                        title="Löschen"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </ModernCard>
              );
            })
          )}
        </div>
      )}

      {/* Feature Mappings tab removed — now in /manage/ai-features (Feature Registry) */}

      {/* ═══════════ Tab: Usage & Costs ═══════════ */}
      {activeTab === 'usage' && stats && (
        <div className="space-y-6">
          {/* Per Provider */}
          <div>
            <h3 className="text-lg font-semibold text-app-fg mb-3">Nutzung pro Provider (30 Tage)</h3>
            <ModernCard variant="default" className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-app-border bg-app-surface">
                    <th className="text-left px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Provider</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Requests</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Input Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Output Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Total Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Kosten</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Ø Latenz</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perProvider.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-app-muted">Keine Daten</td></tr>
                  ) : (
                    stats.perProvider.map((row: any) => {
                      const prov = providers.find(p => p.id === row.providerId);
                      return (
                        <tr key={row.providerId} className="border-b border-app-border/50 last:border-0 hover:bg-app-surface/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-app-fg">{prov?.name || row.providerId}</td>
                          <td className="px-4 py-3 text-right">{(row._count ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum?.inputTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum.outputTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-medium">{(row._sum.totalTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{formatCents(row._sum.costCents || 0)}</td>
                          <td className="px-4 py-3 text-right">{Math.round(row._avg.durationMs || 0)}ms</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </ModernCard>
          </div>

          {/* Per Feature */}
          <div>
            <h3 className="text-lg font-semibold text-app-fg mb-3">Nutzung pro Feature (30 Tage)</h3>
            <ModernCard variant="default" className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-app-border bg-app-surface">
                    <th className="text-left px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Feature</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Requests</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Tokens</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Kosten</th>
                    <th className="text-right px-4 py-3 font-medium text-app-muted text-xs uppercase tracking-wider">Ø Latenz</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perFeature.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-app-muted">Keine Daten</td></tr>
                  ) : (
                    stats.perFeature.map((row: any) => {
                      const feat = AI_FEATURES.find(f => f.key === row.feature);
                      return (
                        <tr key={row.feature} className="border-b border-app-border/50 last:border-0 hover:bg-app-surface/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-medium text-app-fg">{feat?.label || row.feature}</span>
                            <span className="text-xs text-app-muted ml-2 font-mono">{row.feature}</span>
                          </td>
                          <td className="px-4 py-3 text-right">{(row._count ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{(row._sum?.totalTokens || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{formatCents(row._sum.costCents || 0)}</td>
                          <td className="px-4 py-3 text-right">{Math.round(row._avg.durationMs || 0)}ms</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              </div>
            </ModernCard>
          </div>

          {/* Daily Chart — Recharts */}
          {stats.daily.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-app-fg mb-3">Tagesverlauf (30 Tage)</h3>
              <ModernCard variant="glass">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.daily.map(d => ({
                    ...d,
                    date: new Date(d.day).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
                    costEur: d.cost / 100,
                  }))}>
                    <defs>
                      <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--app-accent))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--app-accent))" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" strokeOpacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--app-muted))' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--app-muted))' }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--app-surface))',
                        border: '1px solid hsl(var(--app-border))',
                        borderRadius: '12px',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                      labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="requests" name="Requests" stroke="hsl(var(--app-accent))" fill="url(#colorReq)" strokeWidth={2} />
                    <Area type="monotone" dataKey="tokens" name="Tokens" stroke="#8b5cf6" fill="url(#colorTokens)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 text-xs text-app-muted mt-2">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-app-accent inline-block" /> Requests</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-violet-500 inline-block" /> Tokens</span>
                </div>
              </ModernCard>
            </div>
          )}

          {/* Cost Insights */}
          {costInsights.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-app-fg mb-3">Kosten-Insights</h3>
              <ModernCard variant="gradient">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {costInsights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-app-surface/50 border border-app-border/30">
                      <span className="text-lg">{insight.icon}</span>
                      <span className="text-sm text-app-fg">{insight.text}</span>
                    </div>
                  ))}
                </div>
              </ModernCard>
            </div>
          )}

          {/* Error Rate per Provider */}
          {stats.errorRatePerProvider && Object.keys(stats.errorRatePerProvider).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-app-fg mb-3">Fehlerrate pro Provider</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(stats.errorRatePerProvider).map(([provId, rate]) => {
                  const prov = providers.find(p => p.id === provId);
                  const pctVal = parseFloat(rate as string);
                  return (
                    <ModernCard key={provId} variant="default" className="!p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-app-fg">{prov?.name || provId}</span>
                        <Badge variant={pctVal > 10 ? 'error' : pctVal > 5 ? 'warning' : 'success'}>
                          {rate}%
                        </Badge>
                      </div>
                      <div className="h-1.5 rounded-full bg-app-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pctVal > 10 ? 'bg-red-500' : pctVal > 5 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(pctVal, 100)}%` }}
                        />
                      </div>
                    </ModernCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Edit/Create Modal ═══════════ */}
      {editProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditProvider(null)}>
          <div className="bg-app-surface rounded-2xl shadow-strong w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto border border-app-border/50" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h2 className="text-lg font-semibold text-app-fg">
                {editProvider.id ? 'Provider bearbeiten' : 'Neuer Provider'}
              </h2>
              <button onClick={() => setEditProvider(null)} className="p-1 rounded-lg text-app-muted hover:text-app-fg hover:bg-app-border/50 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Name + Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Name</label>
                  <input
                    value={editProvider.name || ''}
                    onChange={e => setEditProvider({ ...editProvider, name: e.target.value })}
                    placeholder="z.B. Groq (Llama 3.1)"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Slug</label>
                  <input
                    value={editProvider.slug || ''}
                    onChange={e => setEditProvider({ ...editProvider, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="z.B. groq"
                    disabled={!!editProvider.id}
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">Provider-Typ</label>
                <select
                  value={editProvider.type || 'LLM'}
                  onChange={e => setEditProvider({ ...editProvider, type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                >
                  {PROVIDER_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-medium text-app-muted mb-1">
                  API Key {editProvider.hasApiKey && editProvider.apiKey === undefined && (
                    <span className="text-success">(gesetzt: {editProvider.apiKeyHint})</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={editProvider.apiKey ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, apiKey: e.target.value })}
                    placeholder={editProvider.hasApiKey ? '••• Nicht geändert — nur bei Neueingabe ausfüllen' : 'sk-...'}
                    className="w-full px-3 py-2 pr-10 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-foreground"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Base URL + Default Model */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Base URL (optional)</label>
                  <input
                    value={editProvider.baseUrl || ''}
                    onChange={e => setEditProvider({ ...editProvider, baseUrl: e.target.value || null })}
                    placeholder="https://api.groq.com/openai/v1"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Default Model</label>
                  {editProvider.slug && MODEL_LIBRARY[editProvider.slug] ? (
                    <select
                      value={editProvider.defaultModel || ''}
                      onChange={e => setEditProvider({ ...editProvider, defaultModel: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                    >
                      <option value="">— Kein Default —</option>
                      {MODEL_LIBRARY[editProvider.slug].map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={editProvider.defaultModel || ''}
                      onChange={e => setEditProvider({ ...editProvider, defaultModel: e.target.value || null })}
                      placeholder="model-name"
                      className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground font-mono"
                    />
                  )}
                </div>
              </div>

              {/* Rate Limits */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Req/Min</label>
                  <input
                    type="number"
                    value={editProvider.rateLimitPerMinute ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, rateLimitPerMinute: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Req/Tag</label>
                  <input
                    type="number"
                    value={editProvider.rateLimitPerDay ?? ''}
                    onChange={e => setEditProvider({ ...editProvider, rateLimitPerDay: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-app-muted mb-1">Budget/Mo (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editProvider.monthlyBudgetCents ? (editProvider.monthlyBudgetCents / 100).toFixed(2) : ''}
                    onChange={e => setEditProvider({ ...editProvider, monthlyBudgetCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                    placeholder="∞"
                    className="w-full px-3 py-2 text-sm border border-app-border rounded-lg bg-transparent text-app-foreground"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-app-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProvider.isActive ?? true}
                    onChange={e => setEditProvider({ ...editProvider, isActive: e.target.checked })}
                    className="rounded"
                  />
                  Aktiv
                </label>
                <label className="flex items-center gap-2 text-sm text-app-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editProvider.isDefault ?? false}
                    onChange={e => setEditProvider({ ...editProvider, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  Default für Typ
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-app-border">
              <button
                onClick={() => setEditProvider(null)}
                className="px-4 py-2 text-sm rounded-xl text-app-muted hover:text-app-fg hover:bg-app-border/30 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveProvider}
                disabled={saving || !editProvider.name || !editProvider.slug}
                className="flex items-center gap-2 px-5 py-2.5 text-sm bg-app-accent text-white rounded-xl hover:bg-app-accent-hover hover:shadow-glow transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editProvider.id ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
