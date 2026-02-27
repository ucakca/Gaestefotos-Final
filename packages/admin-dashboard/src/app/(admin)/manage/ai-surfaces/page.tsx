'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  Sparkles,
  Gamepad2,
  Wand2,
  MessageSquare,
  ScanFace,
  Image,
  Video,
  Monitor,
  Smartphone,
  BookOpen,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import { SkeletonCard } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────

interface SurfaceAssignment {
  id: string;
  feature_key: string;
  surface: string;
  sort_order: number;
  is_enabled: boolean;
  custom_label: string | null;
  custom_emoji: string | null;
  custom_gradient: string | null;
  custom_description: string | null;
  created_at: string;
  updated_at: string;
  registryLabel?: string;
  registryEmoji?: string;
  registryCategory?: string;
  registryEndpoint?: string;
}

interface SurfaceData {
  surfaces: string[];
  assignments: Record<string, SurfaceAssignment[]>;
  totalCount: number;
}

// ─── Surface Metadata ───────────────────────────────────────

const SURFACE_META: Record<string, { label: string; icon: any; color: string; description: string }> = {
  guest_app_games: {
    label: 'Gäste-App: Spiele',
    icon: Gamepad2,
    color: 'text-purple-400',
    description: 'KI-Spiele in der Gäste-App (Kompliment-Spiegel, Wahrsager, Roast etc.)',
  },
  guest_app_effects: {
    label: 'Gäste-App: Effekte',
    icon: Wand2,
    color: 'text-pink-400',
    description: 'Bildeffekte in der Gäste-App (Oldify, Cartoon, Style Transfer etc.)',
  },
  booth_interactive: {
    label: 'Booth: Interaktiv',
    icon: Monitor,
    color: 'text-blue-400',
    description: 'Features für interaktive Photo Booth / Mirror Booth Stationen',
  },
  ki_booth: {
    label: 'KI-Booth',
    icon: Sparkles,
    color: 'text-orange-400',
    description: 'Dedizierte KI-Booth Station (Style Transfer, Face Swap etc.)',
  },
  admin_tools: {
    label: 'Admin / Host-Tools',
    icon: MessageSquare,
    color: 'text-emerald-400',
    description: 'KI-Assistenten für Veranstalter (Chat, Vorschläge, Analyse)',
  },
  guestbook: {
    label: 'Gästebuch',
    icon: BookOpen,
    color: 'text-amber-400',
    description: 'KI-Features im Gästebuch (Vorschläge, Übersetzung etc.)',
  },
};

const CATEGORY_ICONS: Record<string, any> = {
  game: Gamepad2,
  image: Wand2,
  text: MessageSquare,
  recognition: ScanFace,
  video: Video,
};

// ─── Main Page ──────────────────────────────────────────────

export default function AiSurfacesPage() {
  const [data, setData] = useState<SurfaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSurfaces, setExpandedSurfaces] = useState<Set<string>>(new Set(['guest_app_games', 'guest_app_effects']));
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addSurface, setAddSurface] = useState('');
  const [addFeatureKey, setAddFeatureKey] = useState('');
  const [adding, setAdding] = useState(false);

  const [registryFeatures, setRegistryFeatures] = useState<Array<{ key: string; label: string; category: string }>>([]);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get('/admin/ai-surfaces');
      setData(res.data);
    } catch {
      toast.error('Fehler beim Laden der Surface-Zuordnungen');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRegistry = useCallback(async () => {
    try {
      const res = await api.get('/admin/ai-providers/features/registry');
      setRegistryFeatures(res.data.features || res.data.registry || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { loadData(); loadRegistry(); }, [loadData, loadRegistry]);

  const toggleAssignment = async (a: SurfaceAssignment) => {
    setToggling(a.id);
    try {
      await api.put(`/admin/ai-surfaces/${a.id}`, { is_enabled: !a.is_enabled });
      toast.success(`${a.registryLabel || a.feature_key} ${!a.is_enabled ? 'aktiviert' : 'deaktiviert'}`);
      await loadData();
    } catch { toast.error('Fehler beim Umschalten'); }
    finally { setToggling(null); }
  };

  const deleteAssignment = async (a: SurfaceAssignment) => {
    if (!confirm(`"${a.registryLabel || a.feature_key}" aus "${SURFACE_META[a.surface]?.label || a.surface}" entfernen?`)) return;
    setDeleting(a.id);
    try {
      await api.delete(`/admin/ai-surfaces/${a.id}`);
      toast.success('Zuordnung entfernt');
      await loadData();
    } catch { toast.error('Fehler beim Löschen'); }
    finally { setDeleting(null); }
  };

  const addAssignment = async () => {
    if (!addFeatureKey || !addSurface) return;
    setAdding(true);
    try {
      await api.post('/admin/ai-surfaces', {
        feature_key: addFeatureKey,
        surface: addSurface,
        sort_order: (data?.assignments[addSurface]?.length || 0) + 1,
      });
      toast.success('Zuordnung erstellt');
      setShowAddModal(false);
      setAddFeatureKey('');
      await loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally { setAdding(false); }
  };

  const toggleSurface = (surface: string) => {
    setExpandedSurfaces(prev => {
      const next = new Set(prev);
      if (next.has(surface)) next.delete(surface); else next.add(surface);
      return next;
    });
  };

  const filterAssignments = (assignments: SurfaceAssignment[]): SurfaceAssignment[] => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(a =>
      a.feature_key.toLowerCase().includes(q) ||
      (a.registryLabel || '').toLowerCase().includes(q) ||
      (a.registryCategory || '').toLowerCase().includes(q)
    );
  };

  const totalAssignments = data?.totalCount || 0;
  const totalEnabled = Object.values(data?.assignments || {}).flat().filter(a => a.is_enabled).length;
  const surfaceCount = data?.surfaces?.length || 0;

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
              <Layers className="w-7 h-7 text-blue-500" />
              AI Feature Surfaces
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Welche KI-Features auf welcher Oberfläche angezeigt werden
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddModal(true); setAddSurface(data?.surfaces[0] || ''); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Zuordnung
            </button>
            <button
              onClick={() => { setLoading(true); loadData(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-white">{surfaceCount}</div>
            <div className="text-xs text-gray-400 mt-0.5">Surfaces</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-white">{totalAssignments}</div>
            <div className="text-xs text-gray-400 mt-0.5">Zuordnungen</div>
          </ModernCard>
          <ModernCard className="p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{totalEnabled}</div>
            <div className="text-xs text-gray-400 mt-0.5">Aktiv</div>
          </ModernCard>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Feature suchen..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>

        {/* Surface Sections */}
        {(data?.surfaces || []).map(surface => {
          const meta = SURFACE_META[surface] || { label: surface, icon: Layers, color: 'text-gray-400', description: '' };
          const Icon = meta.icon;
          const assignments = filterAssignments(data?.assignments[surface] || []);
          const allAssignments = data?.assignments[surface] || [];
          const enabledCount = allAssignments.filter(a => a.is_enabled).length;
          const isExpanded = expandedSurfaces.has(surface);

          return (
            <ModernCard key={surface} className="overflow-hidden">
              <button
                onClick={() => toggleSurface(surface)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors text-left"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-gray-800">
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{meta.label}</span>
                    <Badge variant="default">{allAssignments.length} Features</Badge>
                    <Badge variant="success">{enabledCount} aktiv</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
                </div>
                <code className="text-xs text-gray-600 font-mono hidden sm:block">{surface}</code>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-800">
                  {assignments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      {search ? 'Keine Treffer' : 'Keine Features zugeordnet'}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-800/60">
                      {assignments.map((a) => {
                        const CatIcon = CATEGORY_ICONS[a.registryCategory || ''] || Sparkles;
                        return (
                          <div key={a.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/30 transition-colors ${!a.is_enabled ? 'opacity-50' : ''}`}>
                            <span className="text-xs text-gray-600 font-mono w-6 text-right shrink-0">{a.sort_order}</span>
                            <div className="w-7 h-7 rounded flex items-center justify-center bg-gray-800 shrink-0">
                              <CatIcon className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {a.registryEmoji && <span className="text-sm">{a.registryEmoji}</span>}
                                <span className="text-sm font-medium text-white">{a.custom_label || a.registryLabel || a.feature_key}</span>
                                {a.custom_label && <Badge variant="info">custom</Badge>}
                              </div>
                              <span className="text-xs text-gray-600 font-mono">{a.feature_key}</span>
                            </div>
                            <Badge variant={a.registryCategory === 'game' ? 'accent' : a.registryCategory === 'image' ? 'warning' : a.registryCategory === 'text' ? 'info' : 'default'}>
                              {a.registryCategory || '?'}
                            </Badge>
                            <button onClick={() => toggleAssignment(a)} disabled={toggling === a.id}
                              className={`p-1.5 rounded-lg transition-colors shrink-0 ${a.is_enabled ? 'text-emerald-400 hover:bg-emerald-500/15' : 'text-gray-500 hover:bg-gray-700'}`}
                              title={a.is_enabled ? 'Deaktivieren' : 'Aktivieren'}>
                              {toggling === a.id ? <Loader2 className="w-5 h-5 animate-spin" /> : a.is_enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <button onClick={() => deleteAssignment(a)} disabled={deleting === a.id}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0" title="Entfernen">
                              {deleting === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="px-4 py-2 border-t border-gray-800/60">
                    <button onClick={() => { setAddSurface(surface); setShowAddModal(true); }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Feature hinzufügen
                    </button>
                  </div>
                </div>
              )}
            </ModernCard>
          );
        })}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                Feature zu Surface zuordnen
              </h3>
              <label className="block text-sm text-gray-400 mb-1">Surface</label>
              <select value={addSurface} onChange={e => setAddSurface(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                {(data?.surfaces || []).map(s => <option key={s} value={s}>{SURFACE_META[s]?.label || s}</option>)}
              </select>
              <label className="block text-sm text-gray-400 mb-1">Feature</label>
              <select value={addFeatureKey} onChange={e => setAddFeatureKey(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
                <option value="">— Feature wählen —</option>
                {registryFeatures.map(f => <option key={f.key} value={f.key}>{f.label || f.key} ({f.category})</option>)}
              </select>
              {addFeatureKey && addSurface && data?.assignments[addSurface]?.some(a => a.feature_key === addFeatureKey) && (
                <div className="text-xs text-amber-400 mb-3">Dieses Feature ist bereits zugeordnet (wird aktualisiert).</div>
              )}
              <div className="flex items-center justify-end gap-2 mt-2">
                <button onClick={() => { setShowAddModal(false); setAddFeatureKey(''); }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  Abbrechen
                </button>
                <button onClick={addAssignment} disabled={!addFeatureKey || !addSurface || adding}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Zuordnen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
