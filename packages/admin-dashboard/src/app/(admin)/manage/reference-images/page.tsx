'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Upload,
  Trash2,
  CheckCircle2,
  Settings,
  Eye,
  EyeOff,
  Info,
  Search,
  Calendar,
  Save,
  X,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

interface EventListItem {
  id: string;
  name: string;
  date?: string;
  status?: string;
}

interface ReferenceImageConfig {
  referenceImageUrl: string | null;
  referenceImageMode: string;
  referenceImagePosition: string;
  referenceImageOpacity: number;
  referenceImageScale: number;
}

const MODES = [
  { value: 'overlay', label: 'Overlay', desc: 'Logo wird als Watermark auf AI-Ergebnisse gelegt' },
  { value: 'prompt', label: 'Prompt', desc: 'Brand-Beschreibung wird in den AI-Prompt injiziert' },
  { value: 'both', label: 'Beides', desc: 'Overlay + Prompt-Injection kombiniert' },
];

const POSITIONS = [
  { value: 'top-left', label: 'Oben Links' },
  { value: 'top-right', label: 'Oben Rechts' },
  { value: 'bottom-left', label: 'Unten Links' },
  { value: 'bottom-right', label: 'Unten Rechts' },
  { value: 'center', label: 'Zentriert' },
];

export default function ReferenceImagesPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [config, setConfig] = useState<ReferenceImageConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  // Settings form
  const [mode, setMode] = useState('overlay');
  const [position, setPosition] = useState('bottom-right');
  const [opacity, setOpacity] = useState(0.8);
  const [scale, setScale] = useState(0.15);

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const r = await api.get('/events', { params: { limit: 200 } });
      const list = (r.data?.events || r.data || []).map((e: any) => ({
        id: e.id, name: e.name || e.title || e.id, date: e.date, status: e.status,
      }));
      setEvents(list);
    } catch {
      toast.error('Events konnten nicht geladen werden');
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadConfig = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const r = await api.get(`/events/${selectedEventId}/reference-image`);
      const c = r.data;
      setConfig(c);
      setMode(c?.referenceImageMode || 'overlay');
      setPosition(c?.referenceImagePosition || 'bottom-right');
      setOpacity(c?.referenceImageOpacity ?? 0.8);
      setScale(c?.referenceImageScale ?? 0.15);
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (selectedEventId) loadConfig(); }, [selectedEventId, loadConfig]);

  const handleUpload = async () => {
    if (!selectedEventId || !uploadUrl) return;
    setUploading(true);
    try {
      await api.post(`/events/${selectedEventId}/reference-image`, { imageUrl: uploadUrl });
      toast.success('Reference Image hochgeladen');
      setUploadUrl('');
      loadConfig();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    try {
      await api.patch(`/events/${selectedEventId}/reference-image`, {
        mode, position, opacity, scale,
      });
      toast.success('Einstellungen gespeichert');
      loadConfig();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEventId) return;
    if (!confirm('Reference Image entfernen? AI-Ergebnisse werden nicht mehr gebrandet.')) return;
    setDeleting(true);
    try {
      await api.delete(`/events/${selectedEventId}/reference-image`);
      toast.success('Reference Image entfernt');
      setConfig(null);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Fehler');
    } finally {
      setDeleting(false);
    }
  };

  const filteredEvents = events.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search)
  );

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <ImageIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Reference Image Anchoring</h1>
              <p className="text-sm text-gray-400">Brand-Logo auf AI-Ergebnisse legen · Pro Event konfigurierbar</p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <ModernCard className="p-4 border border-emerald-500/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Corporate Branding für AI-Outputs</p>
              <p className="text-xs text-gray-400 mt-1">
                Lade ein Brand-Logo oder Referenzbild hoch, und es wird automatisch auf alle AI-generierten Bilder
                (Style Transfer, Style Effects, Face Swap) als Watermark angewendet. Ideal für Corporate Events.
              </p>
            </div>
          </div>
        </ModernCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Selector */}
          <div className="lg:col-span-1 space-y-4">
            <ModernCard className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Event auswählen
              </h3>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Event suchen…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white"
                />
              </div>
              {loadingEvents ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">Keine Events</p>
                  ) : filteredEvents.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEventId(e.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedEventId === e.id
                          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{e.id.slice(0, 12)}…</div>
                    </button>
                  ))}
                </div>
              )}
            </ModernCard>
          </div>

          {/* Config Panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedEventId ? (
              <ModernCard className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Wähle ein Event aus der Liste</p>
              </ModernCard>
            ) : loading ? (
              <ModernCard className="p-12 text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              </ModernCard>
            ) : (
              <>
                {/* Current Image */}
                <ModernCard className="p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    Reference Image
                    {config?.referenceImageUrl && <Badge variant="success">Aktiv</Badge>}
                  </h3>
                  {config?.referenceImageUrl ? (
                    <div className="flex items-start gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={config.referenceImageUrl}
                        alt="Reference"
                        className="w-32 h-32 object-contain rounded-xl border border-white/10 bg-white/5 p-2"
                        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.2'; }}
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-gray-400 break-all">{config.referenceImageUrl.slice(0, 80)}…</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="info">{mode}</Badge>
                          <Badge variant="default">{position}</Badge>
                          <Badge variant="default">Opacity: {Math.round(opacity * 100)}%</Badge>
                          <Badge variant="default">Scale: {Math.round(scale * 100)}%</Badge>
                        </div>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs text-red-300 transition-colors"
                        >
                          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          Entfernen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                      <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">Kein Reference Image konfiguriert</p>
                    </div>
                  )}
                </ModernCard>

                {/* Upload */}
                <ModernCard className="p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    {config?.referenceImageUrl ? 'Neues Bild hochladen' : 'Reference Image hochladen'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={uploadUrl}
                      onChange={e => setUploadUrl(e.target.value)}
                      placeholder="https://... (Bild-URL, PNG/JPG empfohlen)"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                    />
                    <button
                      onClick={handleUpload}
                      disabled={uploading || !uploadUrl}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Hochladen
                    </button>
                  </div>
                </ModernCard>

                {/* Settings */}
                {config?.referenceImageUrl && (
                  <ModernCard className="p-5">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-emerald-400" />
                      Overlay-Einstellungen
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Mode */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Modus</label>
                        <div className="space-y-1.5">
                          {MODES.map(m => (
                            <button
                              key={m.value}
                              onClick={() => setMode(m.value)}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                                mode === m.value
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              <span className="font-medium">{m.label}</span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Position */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">Position</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {POSITIONS.map(p => (
                            <button
                              key={p.value}
                              onClick={() => setPosition(p.value)}
                              className={`px-3 py-2 rounded-lg text-xs transition-colors border ${
                                position === p.value
                                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opacity */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">
                          Transparenz: {Math.round(opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={opacity}
                          onChange={e => setOpacity(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>10%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Scale */}
                      <div>
                        <label className="text-xs text-gray-400 mb-2 block">
                          Größe: {Math.round(scale * 100)}% des Bildes
                        </label>
                        <input
                          type="range"
                          min="0.05"
                          max="0.5"
                          step="0.05"
                          value={scale}
                          onChange={e => setScale(parseFloat(e.target.value))}
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>5%</span>
                          <span>50%</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Einstellungen speichern
                    </button>
                  </ModernCard>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
