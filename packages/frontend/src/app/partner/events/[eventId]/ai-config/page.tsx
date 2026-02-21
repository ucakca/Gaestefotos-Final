'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, CheckCircle2, Loader2, Sparkles, Zap,
  Brain, MessageSquare, Tag, FileText, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Send, AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

interface AiConfig {
  disabledFeatures: string[];
  welcomeMessage: string | null;
  energyEnabled: boolean;
  energyStartBalance: number;
  energyCooldownSeconds: number;
  customPromptContext: string | null;
  eventKeywords: string[];
  eventTypeHint: string | null;
  energyCostLlmGame: number;
  energyCostImageEffect: number;
  energyCostStyleTransfer: number;
  energyCostFaceSwap: number;
  energyCostGif: number;
  energyCostTradingCard: number;
}

interface BriefingData {
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'FINALIZED';
  eventType: string | null;
  eventName: string | null;
  eventDate: string | null;
  guestCount: number | null;
  logoUrl: string | null;
  primaryColor: string | null;
  footerText: string | null;
  mood: string | null;
  theme: string | null;
  keywords: string[];
  disabledFeatures: string[];
  customPromptRequest: string | null;
  specialRequests: string | null;
}

const AI_FEATURES = [
  { id: 'style_transfer', label: 'Style Transfer', emoji: '🎨' },
  { id: 'face_swap', label: 'Face Swap', emoji: '😜' },
  { id: 'bg_removal', label: 'Hintergrund entfernen', emoji: '✂️' },
  { id: 'llm_game', label: 'KI-Spiele', emoji: '🎲' },
  { id: 'gif_creation', label: 'GIF-Erstellung', emoji: '🎞️' },
  { id: 'trading_card', label: 'Trading Cards', emoji: '🃏' },
  { id: 'ai_oldify', label: 'Alter Filter', emoji: '👴' },
  { id: 'ai_cartoon', label: 'Cartoon Filter', emoji: '🎭' },
  { id: 'time_machine', label: 'Time Machine', emoji: '⏰' },
];

const EVENT_TYPES = [
  { value: 'wedding', label: 'Hochzeit', emoji: '💍' },
  { value: 'birthday', label: 'Geburtstag', emoji: '🎂' },
  { value: 'corporate', label: 'Firmen-Event', emoji: '🏢' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'gala', label: 'Gala / Ball', emoji: '🥂' },
  { value: 'conference', label: 'Konferenz', emoji: '🎤' },
  { value: 'festival', label: 'Festival', emoji: '🎪' },
  { value: 'other', label: 'Sonstiges', emoji: '✨' },
];

const DEFAULTS: AiConfig = {
  disabledFeatures: [], welcomeMessage: '', energyEnabled: true,
  energyStartBalance: 10, energyCooldownSeconds: 60, customPromptContext: '',
  eventKeywords: [], eventTypeHint: '', energyCostLlmGame: 1,
  energyCostImageEffect: 2, energyCostStyleTransfer: 2, energyCostFaceSwap: 3,
  energyCostGif: 3, energyCostTradingCard: 2,
};

export default function PartnerAiConfigPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  const [config, setConfig] = useState<AiConfig>(DEFAULTS);
  const [briefing, setBriefing] = useState<Partial<BriefingData>>({});
  const [eventTitle, setEventTitle] = useState('Event');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'ai' | 'briefing'>('ai');
  const [kwInput, setKwInput] = useState('');
  const [energyOpen, setEnergyOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cfgRes, brfRes, evRes] = await Promise.allSettled([
        api.get(`/partner/events/${eventId}/ai-config`),
        api.get(`/partner/events/${eventId}/briefing`),
        api.get(`/events/${eventId}`),
      ]);
      if (cfgRes.status === 'fulfilled') {
        const c = cfgRes.value.data.config ?? {};
        const merged = { ...DEFAULTS, ...c };
        setConfig(merged);
        setKwInput((merged.eventKeywords ?? []).join(', '));
      }
      if (brfRes.status === 'fulfilled' && brfRes.value.data.briefing)
        setBriefing(brfRes.value.data.briefing);
      if (evRes.status === 'fulfilled')
        setEventTitle(evRes.value.data.event?.title || 'Event');
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const saveAi = async () => {
    setSaving(true); setError(null);
    try {
      const keywords = kwInput.split(',').map((k) => k.trim()).filter(Boolean);
      await api.put(`/partner/events/${eventId}/ai-config`, { ...config, eventKeywords: keywords, welcomeMessage: config.welcomeMessage || null, customPromptContext: config.customPromptContext || null, eventTypeHint: config.eventTypeHint || null });
      setConfig((p) => ({ ...p, eventKeywords: keywords }));
      flash();
    } catch (e: any) { setError(e.response?.data?.error || 'Fehler'); }
    finally { setSaving(false); }
  };

  const saveBriefing = async () => {
    setSaving(true); setError(null);
    try {
      const res = await api.put(`/partner/events/${eventId}/briefing`, briefing);
      setBriefing(res.data.briefing); flash();
    } catch (e: any) { setError(e.response?.data?.error || 'Fehler'); }
    finally { setSaving(false); }
  };

  const finalize = async () => {
    setFinalizing(true); setError(null);
    try {
      await saveBriefing();
      const res = await api.post(`/partner/events/${eventId}/briefing/finalize`);
      setBriefing(res.data.briefing); flash();
    } catch (e: any) { setError(e.response?.data?.error || 'Fehler'); }
    finally { setFinalizing(false); }
  };

  const toggleFeature = (id: string) =>
    setConfig((p) => ({
      ...p,
      disabledFeatures: p.disabledFeatures.includes(id)
        ? p.disabledFeatures.filter((f) => f !== id)
        : [...p.disabledFeatures, id],
    }));

  const setBrf = (patch: Partial<BriefingData>) => setBriefing((p) => ({ ...p, ...patch }));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-muted/50">
        {/* Header */}
        <header className="bg-card border-b px-4 lg:px-8 py-4 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> KI-Konfiguration
                </h1>
                <p className="text-xs text-muted-foreground truncate max-w-52">{eventTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert</span>}
              {error && <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5" /> {error}</span>}
              <Button size="sm" onClick={tab === 'ai' ? saveAi : saveBriefing} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}Speichern
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
          {/* Tabs */}
          <div className="flex bg-card border rounded-xl p-1 gap-1">
            {([['ai', 'KI-Einstellungen', Brain], ['briefing', 'Event-Briefing', FileText]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {/* ── AI CONFIG ── */}
          {tab === 'ai' && (
            <div className="space-y-5">
              {/* Context */}
              <div className="bg-card rounded-xl border p-5 space-y-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-500" /> KI-Kontext</h2>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Event-Typ</label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVENT_TYPES.map((et) => (
                      <button key={et.value} onClick={() => setConfig((p) => ({ ...p, eventTypeHint: et.value }))}
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-colors ${config.eventTypeHint === et.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}`}>
                        <span className="text-lg">{et.emoji}</span><span>{et.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Willkommens-Nachricht</label>
                  <input type="text" value={config.welcomeMessage || ''} onChange={(e) => setConfig((p) => ({ ...p, welcomeMessage: e.target.value }))} placeholder="z.B. Willkommen zur Hochzeit von Anna & Max!" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Keywords (kommagetrennt)</label>
                  <input type="text" value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="z.B. Hochzeit, Liebe, Sommer" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Eigener Prompt-Kontext</label>
                  <textarea rows={3} value={config.customPromptContext || ''} onChange={(e) => setConfig((p) => ({ ...p, customPromptContext: e.target.value }))} placeholder="Optionaler Text für KI-Prompts (z.B. Event-Beschreibung, Firmeninfos)" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="bg-card rounded-xl border p-5">
                <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4"><ToggleRight className="w-4 h-4 text-indigo-500" /> Features aktivieren / deaktivieren</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {AI_FEATURES.map((f) => {
                    const on = !config.disabledFeatures.includes(f.id);
                    return (
                      <button key={f.id} onClick={() => toggleFeature(f.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${on ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-border bg-muted/30 opacity-60'}`}>
                        <span className="flex items-center gap-2 text-sm font-medium text-foreground"><span className="text-base">{f.emoji}</span>{f.label}</span>
                        {on ? <ToggleRight className="w-5 h-5 text-emerald-600 shrink-0" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Energy */}
              <div className="bg-card rounded-xl border overflow-hidden">
                <button onClick={() => setEnergyOpen((v) => !v)} className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
                  <h2 className="font-semibold text-foreground flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Energy-System{!config.energyEnabled && <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground ml-1">deaktiviert</span>}</h2>
                  {energyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {energyOpen && (
                  <div className="px-5 pb-5 space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-medium text-foreground">Energy aktiviert</p><p className="text-xs text-muted-foreground">Gäste verbrauchen Energy für KI-Features</p></div>
                      <button onClick={() => setConfig((p) => ({ ...p, energyEnabled: !p.energyEnabled }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${config.energyEnabled ? 'bg-emerald-500' : 'bg-muted'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.energyEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[['energyStartBalance', 'Start-Balance', 1, 100], ['energyCooldownSeconds', 'Cooldown (Sek)', 0, 3600]] .map(([k, l, min, max]) => (
                        <div key={k as string}><label className="text-xs font-medium text-muted-foreground mb-1 block">{l}</label>
                          <input type="number" min={min as number} max={max as number} value={(config as any)[k as string]} onChange={(e) => setConfig((p) => ({ ...p, [k as string]: Number(e.target.value) }))} disabled={!config.energyEnabled} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none disabled:opacity-40" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Feature-Kosten</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[['energyCostLlmGame','KI-Spiel'],['energyCostImageEffect','Bildeffekt'],['energyCostStyleTransfer','Style Transfer'],['energyCostFaceSwap','Face Swap'],['energyCostGif','GIF'],['energyCostTradingCard','Trading Card']].map(([k, l]) => (
                          <div key={k} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                            <span className="text-xs text-muted-foreground">{l}</span>
                            <input type="number" min={0} max={20} value={(config as any)[k]} onChange={(e) => setConfig((p) => ({ ...p, [k]: Number(e.target.value) }))} disabled={!config.energyEnabled} className="w-12 text-right bg-transparent text-sm font-medium focus:outline-none disabled:opacity-40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BRIEFING ── */}
          {tab === 'briefing' && (
            <div className="space-y-5">
              {briefing.status === 'FINALIZED' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Briefing finalisiert — KI-Konfiguration wurde angewendet
                </div>
              )}

              <div className="bg-card rounded-xl border p-5 space-y-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-indigo-500" /> Event-Informationen</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event-Name</label>
                    <input type="text" value={briefing.eventName || ''} onChange={(e) => setBrf({ eventName: e.target.value })} placeholder="Name des Events" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Gästezahl</label>
                    <input type="number" value={briefing.guestCount || ''} onChange={(e) => setBrf({ guestCount: Number(e.target.value) || null })} placeholder="z.B. 150" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event-Datum</label>
                    <input type="date" value={briefing.eventDate ? briefing.eventDate.slice(0, 10) : ''} onChange={(e) => setBrf({ eventDate: e.target.value })} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Event-Typ</label>
                    <select value={briefing.eventType || ''} onChange={(e) => setBrf({ eventType: e.target.value })} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      <option value="">Bitte wählen…</option>
                      {EVENT_TYPES.map((et) => <option key={et.value} value={et.value}>{et.emoji} {et.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Logo-URL</label>
                    <input type="url" value={briefing.logoUrl || ''} onChange={(e) => setBrf({ logoUrl: e.target.value })} placeholder="https://…" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                  <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Primärfarbe</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={briefing.primaryColor || '#6366f1'} onChange={(e) => setBrf({ primaryColor: e.target.value })} className="h-9 w-12 rounded cursor-pointer border" />
                      <span className="text-sm font-mono text-foreground/70">{briefing.primaryColor || '#6366f1'}</span>
                    </div>
                  </div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Footer-Text</label>
                  <input type="text" value={briefing.footerText || ''} onChange={(e) => setBrf({ footerText: e.target.value })} placeholder="z.B. © Anna & Max 2026" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>

              <div className="bg-card rounded-xl border p-5 space-y-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> KI-Anpassung</h2>
                <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Stimmung</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[['elegant','Elegant','🥂'],['fun','Lustig','😄'],['romantic','Romantisch','💕'],['wild','Wild & Party','🔥'],['chill','Entspannt','🌿'],['professional','Professionell','💼']].map(([v, l, e]) => (
                      <button key={v} onClick={() => setBrf({ mood: briefing.mood === v ? null : v })}
                        className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs transition-colors ${briefing.mood === v ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}`}>
                        <span>{e}</span><span>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Besondere KI-Wünsche</label>
                  <textarea rows={3} value={briefing.customPromptRequest || ''} onChange={(e) => setBrf({ customPromptRequest: e.target.value })} placeholder="z.B. Immer auf Deutsch antworten, keine Witze über die Braut" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sonderwünsche</label>
                  <textarea rows={2} value={briefing.specialRequests || ''} onChange={(e) => setBrf({ specialRequests: e.target.value })} placeholder="Weitere Anmerkungen für unser Team" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                </div>
              </div>

              {briefing.status !== 'FINALIZED' && (
                <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Briefing finalisieren</p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-0.5">Übernimmt alle Briefing-Daten direkt in die KI-Konfiguration</p>
                  </div>
                  <button onClick={finalize} disabled={finalizing}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
                    {finalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Finalisieren
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
