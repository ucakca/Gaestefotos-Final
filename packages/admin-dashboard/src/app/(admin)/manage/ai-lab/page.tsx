'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
  FlaskConical,
  Loader2,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  RefreshCw,
  Play,
  ScanFace,
  Palette,
  Sparkles,
  Wand2,
  ChevronDown,
  Upload,
  Camera,
} from 'lucide-react';
import { ModernCard } from '@/components/ui/ModernCard';
import { PageTransition } from '@/components/ui/PageTransition';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  slug: string;
}

interface Photo {
  id: string;
  url: string;
  storagePath: string;
  status: string;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  imageUrl?: string;
  data?: any;
}

// ─── AI Feature Groups ───────────────────────────────────────

const STYLE_EFFECTS = [
  { key: 'anime', label: 'Anime' },
  { key: 'watercolor', label: 'Watercolor' },
  { key: 'oil_painting', label: 'Ölgemälde' },
  { key: 'sketch', label: 'Skizze' },
  { key: 'neon_noir', label: 'Neon Noir' },
  { key: 'renaissance', label: 'Renaissance' },
  { key: 'comic_book', label: 'Comic' },
  { key: 'pixel_art', label: 'Pixel Art' },
  { key: 'ai_cartoon', label: 'Cartoon' },
  { key: 'ai_oldify', label: 'Oldify' },
  { key: 'ai_style_pop', label: 'Pop Art' },
  { key: 'trading_card', label: 'Trading Card' },
];

const LLM_GAMES = [
  { key: 'compliment_mirror', label: 'Kompliment Spiegel' },
  { key: 'fortune_teller', label: 'Wahrsager' },
  { key: 'ai_roast', label: 'AI Roast' },
  { key: 'celebrity_lookalike', label: 'Celebrity Lookalike' },
  { key: 'ai_meme', label: 'Meme Generator' },
  { key: 'ai_superlatives', label: 'Superlative' },
];

// ─── Component ───────────────────────────────────────────────

interface FaceSwapTemplate {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl?: string;
}

export default function AiLabPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [uploadedPhotoId, setUploadedPhotoId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [faceSwapTemplates, setFaceSwapTemplates] = useState<FaceSwapTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Load face swap templates
  useEffect(() => {
    api.get('/face-swap/templates?limit=50')
      .then(r => {
        const tpls = r.data?.templates || [];
        setFaceSwapTemplates(tpls);
        if (tpls.length > 0) setSelectedTemplateId(tpls[0].id);
      })
      .catch(() => {});
  }, []);

  // Load events
  useEffect(() => {
    api.get('/admin/events?limit=50&orderBy=createdAt&dir=desc')
      .then(r => {
        setEvents(r.data?.events || []);
        if (r.data?.events?.length > 0) {
          setSelectedEventId(r.data.events[0].id);
        }
      })
      .catch(() => toast.error('Events konnten nicht geladen werden'))
      .finally(() => setLoadingEvents(false));
  }, []);

  // Load photos when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    setLoadingPhotos(true);
    setPhotos([]);
    setSelectedPhotoId('');
    api.get(`/events/${selectedEventId}/photos?limit=20&status=APPROVED`)
      .then(r => {
        const ps = r.data?.photos || [];
        setPhotos(ps);
        if (ps.length > 0) setSelectedPhotoId(ps[0].id);
      })
      .catch(() => toast.error('Fotos konnten nicht geladen werden'))
      .finally(() => setLoadingPhotos(false));
  }, [selectedEventId]);

  const activePhotoId = uploadedPhotoId || selectedPhotoId;
  const activePhoto = photos.find(p => p.id === activePhotoId);

  // ── Upload test photo ──
  const handleUpload = async (file: File) => {
    if (!selectedEventId) { toast.error('Bitte erst Event auswählen'); return; }
    setUploading(true);
    const form = new FormData();
    form.append('photo', file);
    form.append('eventId', selectedEventId);
    try {
      const r = await api.post('/booth/setup', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const pid = r.data?.photoId;
      if (pid) {
        setUploadedPhotoId(pid);
        toast.success('Foto hochgeladen ✓');
        // Reload photos
        const r2 = await api.get(`/events/${selectedEventId}/photos?limit=20&status=APPROVED`);
        setPhotos(r2.data?.photos || []);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
    }
  };

  // ── Run style effect ──
  const runStyleEffect = async (effect: string) => {
    if (!activePhotoId || !selectedEventId) { toast.error('Bitte Foto auswählen'); return; }
    const key = `style_${effect}`;
    setTesting(key);
    setResults(r => ({ ...r, [key]: { success: false, message: 'Läuft…' } }));
    try {
      const res = await api.post('/booth-games/style-effect', {
        photoId: activePhotoId,
        eventId: selectedEventId,
        effect,
      });
      setResults(r => ({
        ...r,
        [key]: {
          success: true,
          imageUrl: res.data?.outputUrl || res.data?.url,
          message: `${effect} erfolgreich`,
          data: res.data,
        },
      }));
      toast.success(`${effect} ✓`);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Fehler';
      setResults(r => ({ ...r, [key]: { success: false, error: msg } }));
      toast.error(`${effect}: ${msg}`);
    } finally {
      setTesting(null);
    }
  };

  const selectedTemplate = faceSwapTemplates.find(t => t.id === selectedTemplateId);

  // ── Run face swap onto template ──
  const runFaceSwitch = async () => {
    if (!activePhotoId || !selectedEventId) { toast.error('Bitte Foto auswählen'); return; }
    if (!selectedTemplateId && !selectedTemplate) { toast.error('Bitte Template auswählen'); return; }
    const key = 'face_switch';
    setTesting(key);
    setResults(r => ({ ...r, [key]: { success: false, message: 'Läuft… (30-60s)' } }));
    try {
      const res = await api.post('/booth-games/face-swap-template', {
        photoId: activePhotoId,
        eventId: selectedEventId,
        templateId: selectedTemplateId,
      });
      setResults(r => ({
        ...r,
        [key]: {
          success: true,
          imageUrl: res.data?.outputUrl,
          message: 'Face Swap Template erfolgreich',
          data: res.data,
        },
      }));
      toast.success('Face Swap Template ✓');
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Fehler';
      setResults(r => ({ ...r, [key]: { success: false, error: msg } }));
      toast.error(`Face Swap: ${msg}`);
    } finally {
      setTesting(null);
    }
  };

  // ── Run LLM game ──
  const runLlmGame = async (feature: string) => {
    if (!activePhotoId || !selectedEventId) { toast.error('Bitte Foto auswählen'); return; }
    const key = `llm_${feature}`;
    setTesting(key);
    setResults(r => ({ ...r, [key]: { success: false, message: 'Läuft…' } }));
    const endpoints: Record<string, string> = {
      compliment_mirror: '/booth-games/compliment',
      fortune_teller: '/booth-games/fortune-teller',
      ai_roast: '/booth-games/roast',
      celebrity_lookalike: '/booth-games/celebrity-lookalike',
      ai_meme: '/booth-games/meme',
      ai_superlatives: '/booth-games/superlatives',
    };
    const endpoint = endpoints[feature] || `/booth-games/${feature.replace(/_/g, '-')}`;
    try {
      const res = await api.post(endpoint, {
        photoId: activePhotoId,
        eventId: selectedEventId,
        guestName: 'Test Admin',
      });
      setResults(r => ({
        ...r,
        [key]: {
          success: true,
          message: res.data?.text || res.data?.result || res.data?.caption || JSON.stringify(res.data).slice(0, 200),
          data: res.data,
        },
      }));
      toast.success(`${feature} ✓`);
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Fehler';
      setResults(r => ({ ...r, [key]: { success: false, error: msg } }));
      toast.error(`${feature}: ${msg}`);
    } finally {
      setTesting(null);
    }
  };

  // ── Provider health check ──
  const runProviderTest = async (feature: string) => {
    const key = `provider_${feature}`;
    setTesting(key);
    try {
      const res = await api.get(`/admin/ai-providers/features/status`);
      const featureStatus = res.data?.features?.find((f: any) => f.key === feature);
      setResults(r => ({
        ...r,
        [key]: {
          success: !!featureStatus?.hasProvider,
          message: featureStatus
            ? `Provider: ${featureStatus.providerName || 'kein'} | Enabled: ${featureStatus.isEnabled}`
            : 'Feature nicht gefunden',
          data: featureStatus,
        },
      }));
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: { success: false, error: e.message } }));
    } finally {
      setTesting(null);
    }
  };

  const ResultBadge = ({ testKey }: { testKey: string }) => {
    const r = results[testKey];
    if (!r) return null;
    if (testing === testKey) return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    if (r.success) return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl">
            <FlaskConical className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Test Lab</h1>
            <p className="text-sm text-gray-400">Teste alle AI-Features direkt ohne Gast-UI</p>
          </div>
        </div>

        {/* Step 1: Select Event + Photo */}
        <ModernCard className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</span>
            Event & Foto auswählen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Event select */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Event</label>
              {loadingEvents ? (
                <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ) : (
                <div className="relative">
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none pr-8"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id} className="bg-gray-900">
                        {ev.title} ({ev.slug})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Photo select */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Foto ({photos.length} verfügbar)</label>
              {loadingPhotos ? (
                <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ) : (
                <div className="relative">
                  <select
                    value={activePhotoId}
                    onChange={e => { setSelectedPhotoId(e.target.value); setUploadedPhotoId(''); }}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none pr-8"
                    disabled={photos.length === 0}
                  >
                    {photos.length === 0 && <option value="" className="bg-gray-900">Keine Fotos im Event</option>}
                    {photos.map(p => (
                      <option key={p.id} value={p.id} className="bg-gray-900">
                        {p.id.slice(0, 8)}… ({new Date(p.createdAt).toLocaleDateString('de')})
                        {uploadedPhotoId === p.id ? ' ← Hochgeladen' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Photo preview + upload */}
          <div className="flex items-start gap-4">
            {activePhotoId && (
              <div className="shrink-0">
                <p className="text-xs text-gray-400 mb-1">Vorschau</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/cdn/${activePhotoId}?w=200`}
                  alt="Test photo"
                  className="w-24 h-24 object-cover rounded-lg border border-white/10"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'; }}
                />
              </div>
            )}
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-2">Oder eigenes Testfoto hochladen</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !selectedEventId}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Lädt hoch…' : 'Foto hochladen'}
              </button>
              {activePhotoId && (
                <p className="text-xs text-gray-500 mt-1">Aktive Foto-ID: <span className="font-mono text-gray-400">{activePhotoId}</span></p>
              )}
            </div>
          </div>
        </ModernCard>

        {/* Step 2: Face Switch Test */}
        <ModernCard className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center font-bold">2</span>
            <ScanFace className="w-4 h-4 text-purple-400" />
            Face Swap Template
          </h2>
          <p className="text-xs text-gray-400">
            Setzt das Gast-Gesicht auf ein Template-Bild. Provider: Replicate/FAL.ai inswapper
          </p>
          {faceSwapTemplates.length === 0 ? (
            <p className="text-xs text-yellow-400">Keine Templates geladen — öffne /manage/face-swap-templates</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Template auswählen ({faceSwapTemplates.length} verfügbar)</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  {faceSwapTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`relative rounded-lg overflow-hidden border transition-all ${
                        selectedTemplateId === t.id ? 'border-purple-500 ring-1 ring-purple-500' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.thumbnailUrl || t.imageUrl} alt={t.title} className="w-full aspect-square object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[9px] text-white truncate">{t.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {selectedTemplate && (
                <p className="text-xs text-gray-400">Ausgewählt: <span className="text-white">{selectedTemplate.title}</span> ({selectedTemplate.category})</p>
              )}
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => runFaceSwitch()}
              disabled={!activePhotoId || testing === 'face_switch'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 transition-colors disabled:opacity-50"
            >
              {testing === 'face_switch' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Face Switch testen
            </button>
            <button
              onClick={() => runProviderTest('face_switch')}
              disabled={testing === 'provider_face_switch'}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-400 transition-colors"
            >
              {testing === 'provider_face_switch' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Provider prüfen
            </button>
            <ResultBadge testKey="face_switch" />
          </div>
          {results.face_switch && (
            <TestResultCard result={results.face_switch} />
          )}
          {results.provider_face_switch && (
            <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-2">
              {results.provider_face_switch.message}
            </div>
          )}
        </ModernCard>

        {/* Step 3: Style Effects */}
        <ModernCard className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-bold">3</span>
            <Palette className="w-4 h-4 text-green-400" />
            Style Effects
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {STYLE_EFFECTS.map(({ key, label }) => {
              const testKey = `style_${key}`;
              const result = results[testKey];
              return (
                <button
                  key={key}
                  onClick={() => runStyleEffect(key)}
                  disabled={!activePhotoId || testing !== null}
                  className={`relative flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-xs transition-colors disabled:opacity-50 ${
                    result?.success
                      ? 'bg-green-500/10 border-green-500/30 text-green-300'
                      : result?.error
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {testing === testKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : result?.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : result?.error ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          {/* Show first result image */}
          {Object.entries(results)
            .filter(([k, v]) => k.startsWith('style_') && v.imageUrl)
            .slice(-1)
            .map(([k, v]) => (
              <TestResultCard key={k} result={v} />
            ))}
        </ModernCard>

        {/* Step 4: LLM Games */}
        <ModernCard className="p-5 space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center font-bold">4</span>
            <Sparkles className="w-4 h-4 text-yellow-400" />
            LLM Games (Text-AI)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LLM_GAMES.map(({ key, label }) => {
              const testKey = `llm_${key}`;
              const result = results[testKey];
              return (
                <button
                  key={key}
                  onClick={() => runLlmGame(key)}
                  disabled={!activePhotoId || testing !== null}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors disabled:opacity-50 ${
                    result?.success
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                      : result?.error
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {testing === testKey ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : result?.success ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : result?.error ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          {/* Show LLM results */}
          {Object.entries(results)
            .filter(([k, v]) => k.startsWith('llm_') && (v.success || v.error))
            .slice(-3)
            .map(([k, v]) => (
              <div key={k} className={`rounded-lg p-3 text-xs ${v.success ? 'bg-yellow-500/5 border border-yellow-500/20 text-yellow-200' : 'bg-red-500/5 border border-red-500/20 text-red-300'}`}>
                <span className="font-semibold">{k.replace('llm_', '')}: </span>
                {v.message || v.error}
              </div>
            ))}
        </ModernCard>

        {/* Summary Panel */}
        {Object.keys(results).length > 0 && (
          <ModernCard className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Test-Zusammenfassung</h2>
              <button
                onClick={() => setResults({})}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Alle löschen
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Getestet', value: Object.keys(results).length, color: 'text-blue-400' },
                { label: 'Erfolgreich', value: Object.values(results).filter(r => r.success).length, color: 'text-green-400' },
                { label: 'Fehler', value: Object.values(results).filter(r => r.error).length, color: 'text-red-400' },
                { label: 'Mit Bild', value: Object.values(results).filter(r => r.imageUrl).length, color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-lg p-3 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </ModernCard>
        )}
      </div>
    </PageTransition>
  );
}

// ─── Result Image Card ────────────────────────────────────────

function TestResultCard({ result }: { result: TestResult }) {
  if (!result) return null;
  return (
    <div className={`rounded-lg overflow-hidden border ${result.success ? 'border-green-500/20' : 'border-red-500/20'}`}>
      {result.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={result.imageUrl}
          alt="AI Result"
          className="w-full max-h-64 object-contain bg-black/30"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className={`px-3 py-2 text-xs ${result.success ? 'bg-green-500/5 text-green-300' : 'bg-red-500/5 text-red-300'}`}>
        {result.success ? (
          <span>✓ {result.message}</span>
        ) : (
          <span>✗ {result.error}</span>
        )}
      </div>
    </div>
  );
}
