'use client';

import { useState, useEffect } from 'react';
import {
  Palette,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Save,
  X,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface EventTheme {
  id: string;
  slug: string;
  name: string;
  eventType: string;
  season: string | null;
  locationStyle: string | null;
  colors: Record<string, string>;
  animations: Record<string, any>;
  fonts: Record<string, string>;
  wallLayout: string;
  previewImage: string | null;
  description: string | null;
  tags: string[];
  usageCount: number;
  isPremium: boolean;
  isPublic: boolean;
  isAiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ThemeStats {
  totalThemes: number;
  totalUsage: number;
  byEventType: { eventType: string; _count: number; _sum: { usageCount: number | null } }[];
  topThemes: { id: string; name: string; slug: string; eventType: string; usageCount: number; isPremium: boolean }[];
}

const EVENT_TYPES = ['wedding', 'party', 'business', 'family', 'milestone', 'custom'];

export default function EventThemesAdminPage() {
  const [themes, setThemes] = useState<EventTheme[]>([]);
  const [stats, setStats] = useState<ThemeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [editingTheme, setEditingTheme] = useState<Partial<EventTheme> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const loadThemes = async () => {
    setLoading(true);
    try {
      const params: any = { isPublic: undefined };
      if (filter) params.eventType = filter;
      const { data } = await api.get('/event-themes', { params });
      setThemes(data.themes || []);
    } catch (err: any) {
      toast.error('Fehler beim Laden der Themes');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/event-themes/stats/overview');
      setStats(data);
    } catch {
      // stats are optional
    }
  };

  useEffect(() => {
    loadThemes();
    loadStats();
  }, [filter]);

  const handleSave = async () => {
    if (!editingTheme) return;
    setSaving(true);
    try {
      if (isCreating) {
        await api.post('/event-themes', editingTheme);
        toast.success('Theme erstellt');
      } else {
        const { id, slug, createdAt, updatedAt, ...data } = editingTheme as EventTheme;
        await api.put(`/event-themes/${id}`, data);
        toast.success('Theme aktualisiert');
      }
      setEditingTheme(null);
      setIsCreating(false);
      loadThemes();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Theme "${name}" wirklich löschen?`)) return;
    try {
      const { data } = await api.delete(`/event-themes/${id}`);
      toast.success(`Theme gelöscht (${data.eventsAffected} Events betroffen)`);
      loadThemes();
      loadStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTheme({
      slug: '',
      name: '',
      eventType: 'wedding',
      season: null,
      colors: { primary: '#374151', secondary: '#9CA3AF', accent: '#6366F1', background: '#F9FAFB', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280' },
      animations: { entrance: { type: 'fadeIn', duration: 300, easing: 'easeOut' }, hover: { type: 'lift', duration: 200, easing: 'easeInOut' }, ambient: null },
      fonts: { heading: 'Inter', body: 'Inter', accent: 'Inter' },
      wallLayout: 'masonry',
      description: '',
      tags: [],
      isPremium: false,
      isPublic: true,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Palette className="w-6 h-6 text-purple-500" />
          <div>
            <h1 className="text-2xl font-bold">Event Themes</h1>
            <p className="text-sm text-gray-500">{themes.length} Themes · {stats?.totalUsage || 0} mal verwendet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={loadThemes}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Neues Theme
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <p className="text-xs text-app-muted uppercase">Themes gesamt</p>
              <p className="text-2xl font-bold">{stats.totalThemes}</p>
            </div>
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <p className="text-xs text-app-muted uppercase">Verwendungen</p>
              <p className="text-2xl font-bold">{stats.totalUsage}</p>
            </div>
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <p className="text-xs text-app-muted uppercase">Premium</p>
              <p className="text-2xl font-bold">{themes.filter(t => t.isPremium).length}</p>
            </div>
            <div className="bg-app-card border border-app-border rounded-xl p-4">
              <p className="text-xs text-app-muted uppercase">KI-generiert</p>
              <p className="text-2xl font-bold">{themes.filter(t => t.isAiGenerated).length}</p>
            </div>
          </div>

          {/* Event-Type Distribution */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <p className="text-xs text-app-muted uppercase mb-3">Verwendung nach Event-Typ</p>
            <div className="space-y-2">
              {stats.byEventType.map((entry) => {
                const usage = entry._sum?.usageCount || 0;
                const maxUsage = Math.max(...stats.byEventType.map(e => e._sum?.usageCount || 0), 1);
                return (
                  <div key={entry.eventType} className="flex items-center gap-3">
                    <span className="text-xs font-medium capitalize w-20 text-gray-600">{entry.eventType}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${Math.max((usage / maxUsage) * 100, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{usage}x · {entry._count} Themes</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Themes Ranking */}
          <div className="bg-app-card border border-app-border rounded-xl p-4">
            <p className="text-xs text-app-muted uppercase mb-3">Top Themes Ranking</p>
            <div className="space-y-2">
              {stats.topThemes.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 py-1.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-100 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">{t.name}</span>
                    <span className="text-xs text-gray-400 capitalize">{t.eventType}{t.isPremium ? ' · Premium' : ''}</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-600">{t.usageCount}x</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('')}
          className={`px-3 py-1.5 text-sm rounded-lg border ${!filter ? 'bg-purple-100 border-purple-300 text-purple-700' : 'hover:bg-gray-50'}`}
        >
          Alle
        </button>
        {EVENT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 text-sm rounded-lg border capitalize ${filter === type ? 'bg-purple-100 border-purple-300 text-purple-700' : 'hover:bg-gray-50'}`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Theme List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Laden...</div>
      ) : themes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Keine Themes gefunden</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color Bar */}
              <div className="flex h-2">
                <div className="flex-1" style={{ backgroundColor: theme.colors.primary }} />
                <div className="flex-1" style={{ backgroundColor: theme.colors.secondary }} />
                <div className="flex-1" style={{ backgroundColor: theme.colors.accent }} />
              </div>

              {/* Preview */}
              <div className="p-4" style={{ backgroundColor: theme.colors.background }}>
                <div className="flex gap-1.5 mb-2">
                  {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.surface].map((c, i) => (
                    <div key={i} className="w-6 h-6 rounded-md border border-gray-200" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-sm font-semibold" style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}>
                  {theme.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
                  {theme.description?.slice(0, 60) || 'Keine Beschreibung'}
                </p>
              </div>

              {/* Meta */}
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="capitalize font-medium">{theme.eventType}</span>
                  <span>·</span>
                  <span>{theme.usageCount}x</span>
                  {theme.isPremium && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                  {theme.isAiGenerated && <Sparkles className="w-3 h-3 text-purple-500" />}
                  {!theme.isPublic && <EyeOff className="w-3 h-3 text-gray-400" />}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingTheme(theme); setIsCreating(false); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(theme.id, theme.name)}
                    className="p-1.5 rounded-lg hover:bg-red-50"
                    title="Löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-app-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-app-card border-b border-app-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold">{isCreating ? 'Neues Theme' : 'Theme bearbeiten'}</h2>
              <button onClick={() => { setEditingTheme(null); setIsCreating(false); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                {isCreating && (
                  <div>
                    <label className="text-xs font-medium text-app-muted mb-1 block">Slug</label>
                    <input
                      type="text"
                      value={editingTheme.slug || ''}
                      onChange={(e) => setEditingTheme({ ...editingTheme, slug: e.target.value })}
                      className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-card text-app-fg"
                      placeholder="wedding-elegant-ivory"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-app-muted mb-1 block">Name</label>
                  <input
                    type="text"
                    value={editingTheme.name || ''}
                    onChange={(e) => setEditingTheme({ ...editingTheme, name: e.target.value })}
                    className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-card text-app-fg"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-app-muted mb-1 block">Event-Typ</label>
                  <select
                    value={editingTheme.eventType || 'custom'}
                    onChange={(e) => setEditingTheme({ ...editingTheme, eventType: e.target.value })}
                    className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-card text-app-fg"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-app-muted mb-1 block">Wall Layout</label>
                  <select
                    value={editingTheme.wallLayout || 'masonry'}
                    onChange={(e) => setEditingTheme({ ...editingTheme, wallLayout: e.target.value })}
                    className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-card text-app-fg"
                  >
                    <option value="masonry">Masonry</option>
                    <option value="grid">Grid</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-app-muted mb-1 block">Beschreibung</label>
                  <input
                    type="text"
                    value={editingTheme.description || ''}
                    onChange={(e) => setEditingTheme({ ...editingTheme, description: e.target.value })}
                    className="w-full border border-app-border rounded-lg px-3 py-2 text-sm bg-app-card text-app-fg"
                  />
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Farben</label>
                <div className="grid grid-cols-4 gap-3">
                  {['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'textMuted'].map((key) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{key}</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={(editingTheme.colors as any)?.[key] || '#000000'}
                          onChange={(e) => setEditingTheme({
                            ...editingTheme,
                            colors: { ...(editingTheme.colors as any), [key]: e.target.value },
                          })}
                          className="w-8 h-8 rounded border cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-gray-400">
                          {(editingTheme.colors as any)?.[key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonts */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Fonts</label>
                <div className="grid grid-cols-3 gap-3">
                  {['heading', 'body', 'accent'].map((key) => (
                    <div key={key}>
                      <label className="text-[10px] text-gray-400 block mb-0.5">{key}</label>
                      <input
                        type="text"
                        value={(editingTheme.fonts as any)?.[key] || ''}
                        onChange={(e) => setEditingTheme({
                          ...editingTheme,
                          fonts: { ...(editingTheme.fonts as any), [key]: e.target.value },
                        })}
                        className="w-full border rounded-lg px-2 py-1.5 text-xs"
                        placeholder="Google Font Name"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Flags */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingTheme.isPremium || false}
                    onChange={(e) => setEditingTheme({ ...editingTheme, isPremium: e.target.checked })}
                  />
                  Premium
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editingTheme.isPublic !== false}
                    onChange={(e) => setEditingTheme({ ...editingTheme, isPublic: e.target.checked })}
                  />
                  Öffentlich
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-app-card border-t border-app-border px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setEditingTheme(null); setIsCreating(false); }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
