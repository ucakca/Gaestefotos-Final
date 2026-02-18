'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  ScrollText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Save,
  X,
  RotateCcw,
  History,
  Eye,
  Sparkles,
  MessageSquare,
  Palette,
  Gamepad2,
  Settings2,
  ChevronDown,
  ChevronRight,
  Search,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Database,
  Play,
  Plug,
  Bot,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────

interface PromptTemplate {
  id: string;
  feature: string;
  name: string;
  description: string | null;
  category: PromptCategory;
  systemPrompt: string | null;
  userPromptTpl: string | null;
  negativePrompt: string | null;
  temperature: number | null;
  maxTokens: number | null;
  strength: number | null;
  providerId: string | null;
  model: string | null;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  eventId: string | null;
  variables: any;
  tags: any;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AiProvider {
  id: string;
  slug: string;
  name: string;
  type: string;
  isActive: boolean;
  defaultModel: string | null;
  models: Array<{ id: string; name: string }> | null;
}

type PromptCategory = 'SYSTEM' | 'STYLE' | 'GAME' | 'SUGGEST' | 'CUSTOM';

// ─── Constants ──────────────────────────────────────────────

const CATEGORIES: { value: PromptCategory; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'SYSTEM', label: 'System', icon: Settings2, color: 'text-blue-400' },
  { value: 'SUGGEST', label: 'Vorschläge', icon: Sparkles, color: 'text-purple-400' },
  { value: 'GAME', label: 'Spiele', icon: Gamepad2, color: 'text-green-400' },
  { value: 'STYLE', label: 'Styles', icon: Palette, color: 'text-orange-400' },
  { value: 'CUSTOM', label: 'Custom', icon: MessageSquare, color: 'text-pink-400' },
];

const FEATURE_LABELS: Record<string, string> = {
  chat: 'KI Chat-Assistent',
  album_suggest: 'Album-Vorschläge',
  description_suggest: 'Event-Beschreibung',
  invitation_suggest: 'Einladungstext',
  challenge_suggest: 'Challenge-Ideen',
  guestbook_suggest: 'Gästebuch-Nachricht',
  color_scheme: 'Farbschema-Generator',
  caption_suggest: 'Caption Generator',
  compliment_mirror: 'Compliment Mirror',
  fortune_teller: 'AI Fortune Teller',
  ai_roast: 'AI Roast',
  ai_oldify: 'Oldify-Effekt',
  ai_cartoon: 'Cartoon-Effekt',
  ai_style_pop: 'Style Pop-Effekt',
  'style_transfer:oil-painting': 'Style: Ölgemälde',
  'style_transfer:watercolor': 'Style: Aquarell',
  'style_transfer:pop-art': 'Style: Pop Art',
  'style_transfer:cartoon': 'Style: Cartoon',
  'style_transfer:caricature': 'Style: Karikatur',
  'style_transfer:magazine-cover': 'Style: Magazin-Cover',
  'style_transfer:comic-hero': 'Style: Comic Hero',
  'style_transfer:lego': 'Style: Lego',
  'style_transfer:claymation': 'Style: Claymation',
  'style_transfer:neon-portrait': 'Style: Neon Portrait',
  'style_transfer:barbie': 'Style: Barbie/Ken',
  'style_transfer:ghibli': 'Style: Studio Ghibli',
  'style_transfer:headshot': 'Style: AI Headshot',
  'style_transfer:stained-glass': 'Style: Glasmalerei',
  'style_transfer:ukiyo-e': 'Style: Ukiyo-e',
  'style_transfer:sketch': 'Style: Bleistiftzeichnung',
  'style_transfer:vintage': 'Style: Vintage Retro',
  'style_transfer:anime': 'Style: Anime',
};

// ─── Component ──────────────────────────────────────────────

export default function PromptTemplatesPage() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<PromptCategory | 'ALL'>('ALL');
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [historyFeature, setHistoryFeature] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<PromptTemplate[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form state
  const [form, setForm] = useState({
    feature: '',
    name: '',
    description: '',
    category: 'CUSTOM' as PromptCategory,
    systemPrompt: '',
    userPromptTpl: '',
    negativePrompt: '',
    temperature: '',
    maxTokens: '',
    strength: '',
    providerId: '',
    model: '',
    eventId: '',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const [tplRes, provRes] = await Promise.all([
        api.get('/admin/prompt-templates'),
        api.get('/admin/ai-providers'),
      ]);
      setTemplates(tplRes.data.templates || []);
      setProviders((provRes.data.providers || []).filter((p: AiProvider) => p.isActive));
    } catch (err) {
      toast.error('Fehler beim Laden der Templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ─── Filter ───────────────────────────────────────────────

  const filtered = templates.filter((t) => {
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.feature.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter((t) => t.category === cat.value);
    if (items.length > 0) acc.push({ ...cat, items });
    return acc;
  }, [] as (typeof CATEGORIES[number] & { items: PromptTemplate[] })[]);

  // ─── Actions ──────────────────────────────────────────────

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/admin/prompt-templates/seed');
      toast.success(`${res.data.created} Default-Templates erstellt`);
      fetchTemplates();
    } catch (err) {
      toast.error('Fehler beim Seeding');
    } finally {
      setSeeding(false);
    }
  };

  const openEditor = (template?: PromptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setIsCreating(false);
      setForm({
        feature: template.feature,
        name: template.name,
        description: template.description || '',
        category: template.category,
        systemPrompt: template.systemPrompt || '',
        userPromptTpl: template.userPromptTpl || '',
        negativePrompt: template.negativePrompt || '',
        temperature: template.temperature?.toString() || '',
        maxTokens: template.maxTokens?.toString() || '',
        strength: template.strength?.toString() || '',
        providerId: template.providerId || '',
        model: template.model || '',
        eventId: template.eventId || '',
      });
    } else {
      setEditingTemplate(null);
      setIsCreating(true);
      setForm({
        feature: '',
        name: '',
        description: '',
        category: 'CUSTOM',
        systemPrompt: '',
        userPromptTpl: '',
        negativePrompt: '',
        temperature: '',
        maxTokens: '',
        strength: '',
        providerId: '',
        model: '',
        eventId: '',
      });
    }
  };

  const closeEditor = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!form.feature || !form.name) {
      toast.error('Feature und Name sind Pflichtfelder');
      return;
    }
    setSaving(true);
    try {
      await api.post('/admin/prompt-templates', {
        feature: form.feature,
        name: form.name,
        description: form.description || null,
        category: form.category,
        systemPrompt: form.systemPrompt || null,
        userPromptTpl: form.userPromptTpl || null,
        negativePrompt: form.negativePrompt || null,
        temperature: form.temperature ? parseFloat(form.temperature) : null,
        maxTokens: form.maxTokens ? parseInt(form.maxTokens) : null,
        strength: form.strength ? parseFloat(form.strength) : null,
        providerId: form.providerId || null,
        model: form.model || null,
        eventId: form.eventId || null,
      });
      toast.success(editingTemplate ? 'Neue Version gespeichert' : 'Template erstellt');
      closeEditor();
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Template wirklich löschen?')) return;
    try {
      await api.delete(`/admin/prompt-templates/${id}`);
      toast.success('Template gelöscht');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/admin/prompt-templates/restore/${id}`);
      toast.success('Version wiederhergestellt');
      setHistoryFeature(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Wiederherstellen');
    }
  };

  const showHistory = async (feature: string) => {
    setHistoryFeature(feature);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/admin/prompt-templates/history/${encodeURIComponent(feature)}`);
      setHistoryItems(res.data.history || []);
    } catch (err) {
      toast.error('Fehler beim Laden der Historie');
    } finally {
      setLoadingHistory(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ScrollText className="w-7 h-7 text-purple-400" />
              Prompt Templates
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Verwalte alle KI-Prompts zentral — editierbar, versioniert, mit Fallback
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Defaults seeden
            </button>
            <button
              onClick={() => openEditor()}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neues Template
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Feature, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                filterCategory === 'ALL'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Alle
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilterCategory(cat.value)}
                className={`px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-1 ${
                  filterCategory === cat.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <cat.icon className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-4 grid-cols-1">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && templates.length === 0 && (
          <ModernCard className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Keine Prompt Templates</h3>
            <p className="text-gray-400 text-sm mb-4">
              Klicke auf &quot;Defaults seeden&quot; um die Standard-Prompts in die Datenbank zu laden.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Defaults seeden
            </button>
          </ModernCard>
        )}

        {/* Template Groups */}
        {!loading &&
          grouped.map((group) => (
            <div key={group.value} className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <group.icon className={`w-4 h-4 ${group.color}`} />
                {group.label}
                <span className="text-gray-600">({group.items.length})</span>
              </h2>
              <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                {group.items.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => openEditor(template)}
                    onDelete={() => handleDelete(template.id)}
                    onHistory={() => showHistory(template.feature)}
                  />
                ))}
              </div>
            </div>
          ))}

        {/* Editor Modal */}
        {(editingTemplate || isCreating) && (
          <EditorModal
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onClose={closeEditor}
            saving={saving}
            isNew={isCreating}
            templateName={editingTemplate?.name}
            providers={providers}
          />
        )}

        {/* History Modal */}
        {historyFeature && (
          <HistoryModal
            feature={historyFeature}
            items={historyItems}
            loading={loadingHistory}
            onClose={() => setHistoryFeature(null)}
            onRestore={handleRestore}
          />
        )}
      </div>
    </PageTransition>
  );
}

// ─── Sub-Components ─────────────────────────────────────────

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onHistory,
}: {
  template: PromptTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const featureLabel = FEATURE_LABELS[template.feature] || template.feature;

  return (
    <ModernCard className="p-4 hover:border-purple-500/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white truncate">{template.name}</h3>
            <Badge variant={template.isActive ? 'success' : 'default'}>
              {template.isActive ? 'Aktiv' : 'Inaktiv'}
            </Badge>
            {template.isDefault && (
              <Badge variant="info">Default</Badge>
            )}
            <Badge variant="default">v{template.version}</Badge>
          </div>
          <p className="text-xs text-gray-500 font-mono mb-1">{template.feature}</p>
          {template.description && (
            <p className="text-sm text-gray-400 truncate">{template.description}</p>
          )}
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            {template.temperature !== null && (
              <span>Temp: {template.temperature}</span>
            )}
            {template.maxTokens !== null && (
              <span>Max: {template.maxTokens} Tokens</span>
            )}
            {template.strength !== null && (
              <span>Strength: {template.strength}</span>
            )}
            {template.eventId && (
              <span className="text-yellow-500">Event-spezifisch</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            title="Prompt anzeigen"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onHistory}
            className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
            title="Versionshistorie"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-purple-400 transition-colors"
            title="Bearbeiten"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {!template.isDefault && (
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Prompt Preview */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          {template.systemPrompt && (
            <PromptBlock label="System Prompt" content={template.systemPrompt} />
          )}
          {template.userPromptTpl && (
            <PromptBlock label="User Prompt Template" content={template.userPromptTpl} />
          )}
          {template.negativePrompt && (
            <PromptBlock label="Negative Prompt" content={template.negativePrompt} />
          )}
        </div>
      )}
    </ModernCard>
  );
}

function PromptBlock({ label, content }: { label: string; content: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Kopiert!');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <Copy className="w-3 h-3" />
        </button>
      </div>
      <pre className="text-xs text-gray-300 bg-gray-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
        {content}
      </pre>
    </div>
  );
}

// ─── Editor Modal ───────────────────────────────────────────

function EditorModal({
  form,
  setForm,
  onSave,
  onClose,
  saving,
  isNew,
  templateName,
  providers,
}: {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  isNew: boolean;
  templateName?: string;
  providers: AiProvider[];
}) {
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<{
    response: string;
    model: string;
    provider: { name: string };
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    durationMs: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const selectedProvider = providers.find((p) => p.id === form.providerId);
  const providerModels = selectedProvider?.models || [];

  const handlePreview = async () => {
    if (!form.systemPrompt && !form.userPromptTpl) {
      toast.error('System Prompt oder User Prompt ist erforderlich');
      return;
    }
    setPreviewing(true);
    setPreviewResult(null);
    setPreviewError(null);
    try {
      const userPrompt = (form.userPromptTpl || '')
        .replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => `[${key}]`);
      const res = await api.post('/admin/prompt-templates/preview', {
        systemPrompt: form.systemPrompt || undefined,
        userPrompt: userPrompt || undefined,
        providerId: form.providerId || undefined,
        model: form.model || undefined,
        temperature: form.temperature ? parseFloat(form.temperature) : undefined,
        maxTokens: form.maxTokens ? parseInt(form.maxTokens) : undefined,
      });
      setPreviewResult(res.data);
    } catch (err: any) {
      setPreviewError(err.response?.data?.error || err.message || 'Preview fehlgeschlagen');
    } finally {
      setPreviewing(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-400" />
            {isNew ? 'Neues Prompt Template' : `Bearbeiten: ${templateName}`}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Row 1: Feature + Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Feature ID *</label>
              <input
                type="text"
                value={form.feature}
                onChange={(e) => setForm({ ...form, feature: e.target.value })}
                placeholder="z.B. compliment_mirror"
                className={inputClass}
                disabled={!isNew}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="z.B. Compliment Mirror"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 2: Category + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Beschreibung</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
                className={inputClass}
              />
            </div>
          </div>

          {/* Row 3: Provider + Model */}
          <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-2 mb-3">
              <Plug className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">AI Provider Zuordnung</span>
              <span className="text-xs text-gray-500">(leer = Feature-Mapping entscheidet)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider</label>
                <select
                  value={form.providerId}
                  onChange={(e) => setForm({ ...form, providerId: e.target.value, model: '' })}
                  className={inputClass}
                >
                  <option value="">-- Feature-Mapping --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Modell</label>
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={inputClass}
                  disabled={!form.providerId}
                >
                  <option value="">-- Provider-Default --</option>
                  {selectedProvider?.defaultModel && (
                    <option value={selectedProvider.defaultModel}>
                      {selectedProvider.defaultModel} (Default)
                    </option>
                  )}
                  {providerModels.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">System Prompt (LLM)</label>
            <textarea
              value={form.systemPrompt}
              onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
              placeholder="Instruktionen für die KI..."
              rows={6}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>

          {/* User Prompt Template */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              User Prompt Template
              <span className="text-gray-600 ml-2">{'Variablen: {{variable}}'}</span>
            </label>
            <textarea
              value={form.userPromptTpl}
              onChange={(e) => setForm({ ...form, userPromptTpl: e.target.value })}
              placeholder="z.B. Generiere 5 Album-Namen für {{eventType}}..."
              rows={3}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>

          {/* Negative Prompt */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Negative Prompt (Image-Gen)</label>
            <textarea
              value={form.negativePrompt}
              onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
              placeholder="Was NICHT generiert werden soll..."
              rows={2}
              className={`${inputClass} font-mono resize-y`}
            />
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Temperature (0-2)</label>
              <input type="number" step="0.05" min="0" max="2" value={form.temperature}
                onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                placeholder="0.7" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Tokens</label>
              <input type="number" min="1" value={form.maxTokens}
                onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
                placeholder="300" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Strength (Image, 0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                placeholder="0.65" className={inputClass} />
            </div>
          </div>

          {/* Event ID */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Event-ID (leer = global)</label>
            <input type="text" value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              placeholder="Leer lassen für globale Templates" className={inputClass} />
          </div>

          {/* ─── Live Preview Section ─── */}
          <div className="p-4 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-lg border border-purple-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Live Preview</span>
                <span className="text-xs text-gray-500">Testet den Prompt gegen die AI</span>
              </div>
              <button
                onClick={handlePreview}
                disabled={previewing || (!form.systemPrompt && !form.userPromptTpl)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {previewing ? 'Wird ausgeführt...' : 'Preview starten'}
              </button>
            </div>

            {previewError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {previewError}
              </div>
            )}

            {previewResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Bot className="w-3 h-3" />
                    {previewResult.provider.name}
                  </span>
                  <span>Modell: {previewResult.model}</span>
                  <span>{previewResult.durationMs}ms</span>
                  <span>{previewResult.usage.totalTokens} Tokens</span>
                </div>
                <pre className="p-3 bg-gray-900 rounded-lg text-sm text-gray-200 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-700">
                  {previewResult.response}
                </pre>
              </div>
            )}

            {!previewResult && !previewError && !previewing && (
              <p className="text-xs text-gray-500 italic">
                Klicke &quot;Preview starten&quot; um den Prompt zu testen. Variablen werden als [variableName] ersetzt.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Erstellen' : 'Neue Version speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Modal ──────────────────────────────────────────

function HistoryModal({
  feature,
  items,
  loading,
  onClose,
  onRestore,
}: {
  feature: string;
  items: PromptTemplate[];
  loading: boolean;
  onClose: () => void;
  onRestore: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Versionshistorie: {FEATURE_LABELS[feature] || feature}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">Keine Versionen gefunden</p>
          )}

          {items.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${
                item.isActive
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-gray-700 bg-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">v{item.version}</span>
                  {item.isActive && (
                    <Badge variant="success">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aktiv
                    </Badge>
                  )}
                  {item.isDefault && (
                    <Badge variant="info">Default</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleString('de-DE')}
                  </span>
                  {!item.isActive && (
                    <button
                      onClick={() => onRestore(item.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Wiederherstellen
                    </button>
                  )}
                </div>
              </div>
              {item.systemPrompt && (
                <p className="text-xs text-gray-400 mt-2 line-clamp-2 font-mono">
                  {item.systemPrompt.substring(0, 150)}...
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
