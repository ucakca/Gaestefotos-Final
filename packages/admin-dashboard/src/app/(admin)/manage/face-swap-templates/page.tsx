'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  ScanFace,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Tag,
  Image as ImageIcon,
  RefreshCw,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface FaceSwapTemplate {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl?: string;
  tags: string[];
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  source: string;
  licenseType?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  superhero: '🦸 Superheld',
  wedding: '💍 Hochzeit',
  profession: '💼 Berufe',
  fun: '🎭 Fun',
  seasonal: '🎄 Saisonal',
  sport: '⚽ Sport',
};

const SOURCE_COLORS: Record<string, string> = {
  unsplash: 'bg-blue-500/20 text-blue-300',
  envato: 'bg-green-500/20 text-green-300',
  ai: 'bg-purple-500/20 text-purple-300',
  custom: 'bg-yellow-500/20 text-yellow-300',
};

export default function FaceSwapTemplatesPage() {
  const [templates, setTemplates] = useState<FaceSwapTemplate[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', category: 'fun', imageUrl: '', thumbnailUrl: '',
    tags: '', isActive: true, sortOrder: 0, source: 'custom', licenseType: 'royalty_free',
  });

  const loadTemplates = async (cat?: string) => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (cat) params.category = cat;
      const r = await api.get('/face-swap/templates', { params });
      setTemplates(r.data?.templates || []);
      setTotal(r.data?.total || 0);
      if (!cat) setCategories(r.data?.categories || []);
    } catch {
      toast.error('Templates konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(selectedCategory || undefined); }, [selectedCategory]);

  const filteredTemplates = templates.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (Array.isArray(t.tags) ? t.tags : []).some((tag: string) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => setForm({ title: '', category: 'fun', imageUrl: '', thumbnailUrl: '', tags: '', isActive: true, sortOrder: 0, source: 'custom', licenseType: 'royalty_free' });

  const startEdit = (t: FaceSwapTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title, category: t.category, imageUrl: t.imageUrl,
      thumbnailUrl: t.thumbnailUrl || '', tags: (Array.isArray(t.tags) ? t.tags : []).join(', '),
      isActive: t.isActive, sortOrder: t.sortOrder, source: t.source, licenseType: t.licenseType || 'royalty_free',
    });
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.imageUrl) { toast.error('Titel und Bild-URL sind erforderlich'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        thumbnailUrl: form.thumbnailUrl || undefined,
      };
      if (editingId) {
        await api.patch(`/face-swap/templates/${editingId}`, payload);
        toast.success('Template aktualisiert ✓');
      } else {
        await api.post('/face-swap/templates', payload);
        toast.success('Template erstellt ✓');
      }
      setShowAddForm(false);
      setEditingId(null);
      resetForm();
      loadTemplates(selectedCategory || undefined);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: FaceSwapTemplate) => {
    try {
      await api.patch(`/face-swap/templates/${t.id}`, { isActive: !t.isActive });
      toast.success(t.isActive ? 'Deaktiviert' : 'Aktiviert');
      loadTemplates(selectedCategory || undefined);
    } catch {
      toast.error('Fehler');
    }
  };

  const handleDelete = async (t: FaceSwapTemplate) => {
    const msg = t.isDefault
      ? `"${t.title}" ist ein Standard-Template. Trotzdem löschen?`
      : `"${t.title}" löschen?`;
    if (!confirm(msg)) return;
    setDeleting(t.id);
    try {
      await api.delete(`/face-swap/templates/${t.id}`);
      toast.success('Template gelöscht');
      loadTemplates(selectedCategory || undefined);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <ScanFace className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Face Swap Templates</h1>
              <p className="text-sm text-gray-400">{total} Templates · {categories.length} Kategorien</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => loadTemplates(selectedCategory || undefined)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); resetForm(); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Template hinzufügen
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <ModernCard className="p-5 space-y-4 border border-purple-500/20">
            <h2 className="text-base font-semibold text-white">
              {editingId ? 'Template bearbeiten' : 'Neues Template'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Titel *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Astronaut" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kategorie *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white bg-gray-900">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-gray-900">{v}</option>)}
                  <option value="other" className="bg-gray-900">🔖 Sonstiges</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Bild-URL * (öffentlich zugänglich, mind. 400px)</label>
                <input value={form.imageUrl} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://images.unsplash.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Thumbnail-URL (optional, klein 200px)</label>
                <input value={form.thumbnailUrl} onChange={e => setForm(f => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="https://... (leer = Bild-URL wird verwendet)" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tags (kommagetrennt)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="astronaut, space, nasa" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Quelle</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white bg-gray-900">
                  <option value="custom" className="bg-gray-900">Custom</option>
                  <option value="unsplash" className="bg-gray-900">Unsplash</option>
                  <option value="envato" className="bg-gray-900">Envato Elements</option>
                  <option value="ai" className="bg-gray-900">AI generiert (FLUX)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Reihenfolge</label>
                <input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            {form.imageUrl && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Vorschau</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="preview" className="w-24 h-24 object-cover rounded-lg border border-white/10" onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }} />
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingId ? 'Speichern' : 'Erstellen'}
              </button>
              <button onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-400 transition-colors">
                Abbrechen
              </button>
            </div>
          </ModernCard>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Template suchen…"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
            />
          </div>
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-2 rounded-lg text-xs transition-colors border ${!selectedCategory ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
          >
            Alle ({total})
          </button>
          {categories.map(c => (
            <button
              key={c.name}
              onClick={() => setSelectedCategory(selectedCategory === c.name ? '' : c.name)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors border ${selectedCategory === c.name ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
            >
              {CATEGORY_LABELS[c.name] || c.name} ({c.count})
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <ModernCard className="p-12 text-center">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Keine Templates gefunden</p>
          </ModernCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredTemplates.map(t => (
              <div
                key={t.id}
                className={`group relative rounded-xl overflow-hidden border transition-all ${t.isActive ? 'border-white/10' : 'border-red-500/20 opacity-60'}`}
              >
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.thumbnailUrl || t.imageUrl}
                  alt={t.title}
                  className="w-full aspect-square object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'; }}
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  {t.isDefault && <span className="px-1.5 py-0.5 bg-blue-500/80 rounded text-[10px] text-white">Default</span>}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${SOURCE_COLORS[t.source] || 'bg-gray-500/80 text-white'}`}>{t.source}</span>
                </div>

                {/* Usage count */}
                {t.usageCount > 0 && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-gray-300">
                    {t.usageCount}×
                  </div>
                )}

                {/* Title + actions */}
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-medium text-white truncate">{t.title}</p>
                  <p className="text-[10px] text-gray-400">{CATEGORY_LABELS[t.category] || t.category}</p>

                  {/* Action buttons (always visible) */}
                  <div className="flex gap-1 mt-1.5">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit3 className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(t)}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                      title={t.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    >
                      {t.isActive ? <ToggleRight className="w-3 h-3 text-green-400" /> : <ToggleLeft className="w-3 h-3 text-gray-400" />}
                    </button>
                    <a
                      href={t.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                      title="Bild öffnen"
                    >
                      <ExternalLink className="w-3 h-3 text-white" />
                    </a>
                    <button
                      onClick={() => handleDelete(t)}
                      disabled={deleting === t.id}
                      className="p-1 bg-red-500/30 hover:bg-red-500/50 rounded transition-colors"
                      title="Löschen"
                    >
                      {deleting === t.id ? <Loader2 className="w-3 h-3 animate-spin text-red-300" /> : <Trash2 className="w-3 h-3 text-red-300" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
