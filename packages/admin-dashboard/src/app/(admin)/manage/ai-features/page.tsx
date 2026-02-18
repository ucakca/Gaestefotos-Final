'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Zap,
  Image,
  MessageSquare,
  Gamepad2,
  Palette,
  Wand2,
  ScanFace,
  Video,
  Pencil,
  RefreshCw,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ScrollText,
  Database,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────

interface AiFeatureInfo {
  feature: string;
  creditCost: number;
  providerType: string;
  hasProvider: boolean;
  providerName: string | null;
  isEnabled: boolean;
}

interface FeatureMapping {
  feature: string;
  providerId: string;
  model: string | null;
  isEnabled: boolean;
  provider: { id: string; slug: string; name: string; type: string };
}

interface AiProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface PromptInfo {
  feature: string;
  name: string;
  category: string;
  isActive: boolean;
  version: number;
  providerId: string | null;
}

// ─── Feature Metadata ───────────────────────────────────────

const FEATURE_META: Record<string, { label: string; icon: any; category: string; description: string }> = {
  chat: { label: 'KI Chat-Assistent', icon: MessageSquare, category: 'text', description: 'FAQ & Event-Hilfe für Hosts' },
  album_suggest: { label: 'Album-Vorschläge', icon: Sparkles, category: 'text', description: 'KI-generierte Album-Namen' },
  description_suggest: { label: 'Event-Beschreibung', icon: Pencil, category: 'text', description: 'Automatische Event-Beschreibungen' },
  invitation_suggest: { label: 'Einladungstext', icon: Pencil, category: 'text', description: 'KI-generierte Einladungstexte' },
  challenge_suggest: { label: 'Challenge-Ideen', icon: Gamepad2, category: 'text', description: 'Kreative Foto-Challenge-Vorschläge' },
  guestbook_suggest: { label: 'Gästebuch-Nachricht', icon: Pencil, category: 'text', description: 'Willkommensnachrichten für Gästebuch' },
  color_scheme: { label: 'Farbschema', icon: Palette, category: 'text', description: 'Event-Farbschemata generieren' },
  caption_suggest: { label: 'Caption Generator', icon: Pencil, category: 'text', description: 'Social-Media-Captions generieren' },
  compliment_mirror: { label: 'Compliment Mirror', icon: Sparkles, category: 'game', description: 'KI-Komplimente für Selfies' },
  fortune_teller: { label: 'AI Fortune Teller', icon: Sparkles, category: 'game', description: 'Witzige Zukunftsvorhersagen' },
  ai_roast: { label: 'AI Roast', icon: Gamepad2, category: 'game', description: 'Liebevoller Comedy-Roast' },
  style_transfer: { label: 'Style Transfer', icon: Wand2, category: 'image', description: 'Foto in Kunststil verwandeln' },
  face_switch: { label: 'Face Switch', icon: ScanFace, category: 'image', description: 'Gesichter in Gruppenfotos tauschen' },
  bg_removal: { label: 'Hintergrund entfernen', icon: Image, category: 'image', description: 'Hintergrund aus Fotos entfernen' },
  ai_oldify: { label: 'Oldify', icon: Wand2, category: 'image', description: 'Alterungs-Effekt auf Fotos' },
  ai_cartoon: { label: 'Cartoon', icon: Wand2, category: 'image', description: 'Foto in Cartoon-Stil' },
  ai_style_pop: { label: 'Style Pop', icon: Wand2, category: 'image', description: 'Foto in Pop-Art-Stil' },
  drawbot: { label: 'Drawbot', icon: Pencil, category: 'image', description: 'Line-Art G-Code für Zeichenroboter' },
  highlight_reel: { label: 'Highlight Reel', icon: Video, category: 'video', description: 'Automatisches Event-Highlight-Video' },
  face_search: { label: 'Face Search', icon: ScanFace, category: 'recognition', description: 'Gesichtserkennung "Finde mein Foto"' },
  ai_categorize: { label: 'AI Kategorisierung', icon: Layers, category: 'text', description: 'Fotos automatisch kategorisieren' },
};

// Sub-features for style_transfer (style names that exist as prompt templates)
const STYLE_TRANSFER_SUBS: Record<string, string> = {
  'style_transfer:oil-painting': 'Ölgemälde',
  'style_transfer:watercolor': 'Aquarell',
  'style_transfer:pop-art': 'Pop Art',
  'style_transfer:cartoon': 'Cartoon',
  'style_transfer:caricature': 'Karikatur',
  'style_transfer:magazine-cover': 'Magazin-Cover',
  'style_transfer:comic-hero': 'Comic Hero',
  'style_transfer:lego': 'Lego',
  'style_transfer:claymation': 'Claymation',
  'style_transfer:neon-portrait': 'Neon Portrait',
  'style_transfer:barbie': 'Barbie/Ken',
  'style_transfer:ghibli': 'Studio Ghibli',
  'style_transfer:headshot': 'AI Headshot',
  'style_transfer:stained-glass': 'Glasmalerei',
  'style_transfer:ukiyo-e': 'Ukiyo-e',
  'style_transfer:sketch': 'Bleistiftzeichnung',
  'style_transfer:vintage': 'Vintage Retro',
  'style_transfer:anime': 'Anime',
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  text: { label: 'Text / LLM', color: 'text-blue-400' },
  game: { label: 'Foto-Spiele', color: 'text-purple-400' },
  image: { label: 'Bildverarbeitung', color: 'text-pink-400' },
  video: { label: 'Video', color: 'text-orange-400' },
  recognition: { label: 'Erkennung', color: 'text-green-400' },
};

// ─── Main Page ──────────────────────────────────────────────

export default function AiFeaturesPage() {
  const [features, setFeatures] = useState<AiFeatureInfo[]>([]);
  const [mappings, setMappings] = useState<FeatureMapping[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [prompts, setPrompts] = useState<PromptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const [featRes, mapRes, provRes, promptRes] = await Promise.all([
        api.get('/admin/ai-providers/features/status'),
        api.get('/admin/ai-providers/features/mappings'),
        api.get('/admin/ai-providers'),
        api.get('/admin/prompt-templates'),
      ]);
      setFeatures(featRes.data.features || []);
      setMappings(mapRes.data.mappings || []);
      setProviders((provRes.data.providers || []).filter((p: AiProvider) => p.isActive));
      setPrompts(promptRes.data.templates || []);
    } catch (err) {
      toast.error('Fehler beim Laden der AI-Features');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleFeature = async (feature: string, currentEnabled: boolean) => {
    setToggling(feature);
    try {
      const mapping = mappings.find(m => m.feature === feature);
      if (mapping) {
        await api.put(`/admin/ai-providers/features/mappings/${feature}`, {
          isEnabled: !currentEnabled,
        });
      } else {
        const featureInfo = features.find(f => f.feature === feature);
        const providerType = featureInfo?.providerType || 'LLM';
        const provider = providers.find(p => p.type === providerType);
        if (!provider) {
          toast.error(`Kein aktiver ${providerType} Provider vorhanden`);
          return;
        }
        await api.put(`/admin/ai-providers/features/mappings/${feature}`, {
          providerId: provider.id,
          isEnabled: !currentEnabled,
        });
      }
      await loadData();
      toast.success(`${FEATURE_META[feature]?.label || feature} ${!currentEnabled ? 'aktiviert' : 'deaktiviert'}`);
    } catch {
      toast.error('Fehler beim Umschalten');
    } finally {
      setToggling(null);
    }
  };

  // Group features by category
  const grouped = features.reduce<Record<string, AiFeatureInfo[]>>((acc, f) => {
    const cat = FEATURE_META[f.feature]?.category || 'text';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const filteredCategories = Object.entries(grouped)
    .filter(([cat]) => categoryFilter === 'all' || cat === categoryFilter)
    .map(([cat, feats]) => ({
      cat,
      feats: feats.filter(f => {
        if (!search) return true;
        const meta = FEATURE_META[f.feature];
        const label = meta?.label || f.feature;
        return label.toLowerCase().includes(search.toLowerCase()) ||
               f.feature.toLowerCase().includes(search.toLowerCase());
      }),
    }))
    .filter(({ feats }) => feats.length > 0);

  // Stats
  const totalEnabled = features.filter(f => f.isEnabled).length;
  const totalWithProvider = features.filter(f => f.hasProvider).length;
  const totalFeatures = features.length;
  const totalPrompts = prompts.length;
  const styleCount = Object.keys(STYLE_TRANSFER_SUBS).length;

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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Brain className="w-7 h-7 text-purple-500" />
              Feature Registry
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Alle KI-Features, Sub-Features, Provider & Prompt-Status auf einen Blick
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/manage/prompt-templates"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ScrollText className="w-4 h-4" />
              Prompt Studio
            </Link>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-white">{totalEnabled}/{totalFeatures}</div>
            <div className="text-xs text-gray-400 mt-0.5">Features aktiv</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-white">{totalWithProvider}/{totalFeatures}</div>
            <div className="text-xs text-gray-400 mt-0.5">Provider zugewiesen</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{totalPrompts}</div>
            <div className="text-xs text-gray-400 mt-0.5">Prompts in DB</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-orange-400">{styleCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Style-Transfer-Stile</div>
          </ModernCard>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Feature suchen..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                categoryFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Alle
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature List by Category */}
        {filteredCategories.map(({ cat, feats }) => {
          const catInfo = CATEGORY_LABELS[cat] || { label: cat, color: 'text-gray-400' };
          return (
            <div key={cat}>
              <h2 className={`text-sm font-semibold ${catInfo.color} uppercase tracking-wider mb-3`}>
                {catInfo.label}
                <span className="text-gray-600 ml-2">({feats.length})</span>
              </h2>
              <div className="space-y-2">
                {feats.map((f) => (
                  <FeatureRow
                    key={f.feature}
                    feature={f}
                    mapping={mappings.find(m => m.feature === f.feature)}
                    providers={providers}
                    prompts={prompts}
                    toggling={toggling === f.feature}
                    onToggle={() => toggleFeature(f.feature, f.isEnabled)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Keine Features gefunden
          </div>
        )}
      </div>
    </PageTransition>
  );
}

// ─── Feature Row Component ──────────────────────────────────

function FeatureRow({
  feature,
  mapping,
  providers,
  prompts,
  toggling,
  onToggle,
}: {
  feature: AiFeatureInfo;
  mapping?: FeatureMapping;
  providers: AiProvider[];
  prompts: PromptInfo[];
  toggling: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = FEATURE_META[feature.feature] || {
    label: feature.feature,
    icon: Sparkles,
    category: 'text',
    description: '',
  };
  const Icon = meta.icon;

  const hasSubFeatures = feature.feature === 'style_transfer';
  const subFeatures = hasSubFeatures ? STYLE_TRANSFER_SUBS : {};
  const subCount = Object.keys(subFeatures).length;

  // Check if this feature has a DB prompt
  const hasPrompt = prompts.some(p => p.feature === feature.feature);
  // For style_transfer, count how many sub-prompts exist in DB
  const subPromptsInDb = hasSubFeatures
    ? Object.keys(subFeatures).filter(sf => prompts.some(p => p.feature === sf)).length
    : 0;

  return (
    <div>
      <ModernCard className="p-3 hover:border-purple-500/20 transition-colors">
        <div className="flex items-center gap-3">
          {/* Expand button for sub-features */}
          {hasSubFeatures ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 text-gray-500 hover:text-white transition-colors"
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Icon */}
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            feature.isEnabled ? 'bg-purple-500/15 text-purple-400' : 'bg-gray-800 text-gray-500'
          }`}>
            <Icon className="w-4.5 h-4.5" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{meta.label}</span>
              {hasSubFeatures && (
                <Badge variant="default">
                  <Layers className="w-3 h-3 mr-1" />
                  {subCount} Stile
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{meta.description}</p>
          </div>

          {/* Prompt Status */}
          <div className="hidden md:flex items-center gap-1.5 min-w-[100px]">
            {hasSubFeatures ? (
              <Link href="/manage/prompt-templates?category=STYLE" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                <Database className="w-3 h-3" />
                {subPromptsInDb}/{subCount} Prompts
              </Link>
            ) : hasPrompt ? (
              <Link href={`/manage/prompt-templates`} className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                <Database className="w-3 h-3" />
                Prompt in DB
              </Link>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Database className="w-3 h-3" />
                Nur Fallback
              </span>
            )}
          </div>

          {/* Provider */}
          <div className="hidden sm:flex items-center gap-2 min-w-[130px]">
            {feature.hasProvider ? (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {feature.providerName}
              </Badge>
            ) : (
              <Badge variant="warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Kein Provider
              </Badge>
            )}
          </div>

          {/* Credits */}
          <div className="hidden lg:flex items-center gap-1 min-w-[70px] text-xs">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span className="text-gray-400">
              {feature.creditCost === 0 ? 'Free' : `${feature.creditCost}`}
            </span>
          </div>

          {/* Type Badge */}
          <div className="hidden xl:block min-w-[70px]">
            <Badge variant={
              feature.providerType === 'LLM' ? 'info' :
              feature.providerType === 'IMAGE_GEN' ? 'accent' :
              feature.providerType === 'VIDEO_GEN' ? 'warning' :
              'default'
            }>
              {feature.providerType}
            </Badge>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggle}
            disabled={toggling}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
              feature.isEnabled
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : feature.isEnabled ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </ModernCard>

      {/* Sub-Features (Style Transfer Styles) */}
      {expanded && hasSubFeatures && (
        <div className="ml-10 mt-1 space-y-1">
          {Object.entries(subFeatures).map(([subKey, subLabel]) => {
            const subPrompt = prompts.find(p => p.feature === subKey);
            return (
              <div
                key={subKey}
                className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm"
              >
                <Wand2 className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="text-gray-300 flex-1">{subLabel}</span>
                <span className="text-xs font-mono text-gray-600 hidden sm:block">{subKey}</span>
                {subPrompt ? (
                  <Link
                    href="/manage/prompt-templates"
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <Database className="w-3 h-3" />
                    v{subPrompt.version}
                  </Link>
                ) : (
                  <span className="text-xs text-gray-600">Fallback</span>
                )}
                <Link
                  href="/manage/prompt-templates"
                  className="p-1 text-gray-500 hover:text-purple-400 transition-colors"
                  title="Prompt bearbeiten"
                >
                  <Pencil className="w-3 h-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
