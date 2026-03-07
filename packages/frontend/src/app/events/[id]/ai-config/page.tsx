'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, CheckCircle2, Loader2, Sparkles, Zap,
  Brain, MessageSquare, Tag, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, AlertCircle, Image as ImageIcon,
  Gamepad2, Wand2, Eye, EyeOff, RefreshCw, Info,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import ProtectedRoute from '@/components/ProtectedRoute';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiConfig {
  disabledFeatures: string[];
  boothPreset: Record<string, string[]> | null;
  welcomeMessage: string | null;
  energyEnabled: boolean;
  energyStartBalance: number;
  energyRewardFirstUpload: number;
  energyRewardGuestbook: number;
  energyRewardChallenge: number;
  energyRewardSurvey: number;
  energyRewardSocialShare: number;
  energyCostLlmGame: number;
  energyCostImageEffect: number;
  energyCostStyleTransfer: number;
  energyCostFaceSwap: number;
  energyCostGif: number;
  energyCostVideo: number;
  energyCostTradingCard: number;
  energyCooldownSeconds: number;
  customPromptContext: string | null;
  eventKeywords: string[];
  eventTypeHint: string | null;
  referenceImageUrl: string | null;
  referenceImageMode: string | null;
  referenceImagePosition: string | null;
  referenceImageOpacity: number | null;
  referenceImageScale: number | null;
}

interface AiFeatureAccess {
  key: string;
  label: string;
  description: string;
  allowed: boolean;
  reason?: 'package' | 'event_config' | 'device';
  creditCost: number;
  category: string;
  packageCategory: string;
  emoji?: string;
  gradient?: string;
  guestDescription?: string;
  uiGroup?: string;
  sortOrder?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const ENERGY_COSTS: [string, string][] = [
  ['energyCostLlmGame', 'KI-Spiel'],
  ['energyCostImageEffect', 'Bildeffekt'],
  ['energyCostStyleTransfer', 'Style Transfer'],
  ['energyCostFaceSwap', 'Face Swap'],
  ['energyCostGif', 'GIF / Morph'],
  ['energyCostVideo', 'AI Video'],
  ['energyCostTradingCard', 'Trading Card'],
];

const ENERGY_REWARDS: [string, string][] = [
  ['energyRewardFirstUpload', 'Erstes Foto'],
  ['energyRewardGuestbook', 'Gästebuch-Eintrag'],
  ['energyRewardChallenge', 'Challenge erfüllt'],
  ['energyRewardSurvey', 'Umfrage'],
  ['energyRewardSocialShare', 'Social Share'],
];

const REF_IMAGE_POSITIONS = [
  { value: 'top-left', label: 'Oben links' },
  { value: 'top-right', label: 'Oben rechts' },
  { value: 'bottom-left', label: 'Unten links' },
  { value: 'bottom-right', label: 'Unten rechts' },
  { value: 'center', label: 'Zentriert' },
];

const FEATURE_GROUP_META: Record<string, { label: string; icon: any; color: string }> = {
  game: { label: 'KI-Spiele', icon: Gamepad2, color: 'text-pink-500' },
  effect: { label: 'Bild-Effekte', icon: Wand2, color: 'text-indigo-500' },
  host_tool: { label: 'Host-Tools', icon: Brain, color: 'text-emerald-500' },
  system: { label: 'System', icon: Sparkles, color: 'text-gray-400' },
};

const DEFAULTS: AiConfig = {
  disabledFeatures: [], boothPreset: null, welcomeMessage: null,
  energyEnabled: true, energyStartBalance: 10,
  energyRewardFirstUpload: 5, energyRewardGuestbook: 3, energyRewardChallenge: 3,
  energyRewardSurvey: 2, energyRewardSocialShare: 2,
  energyCostLlmGame: 1, energyCostImageEffect: 2, energyCostStyleTransfer: 2,
  energyCostFaceSwap: 3, energyCostGif: 3, energyCostVideo: 5, energyCostTradingCard: 2,
  energyCooldownSeconds: 60, customPromptContext: null, eventKeywords: [],
  eventTypeHint: null, referenceImageUrl: null, referenceImageMode: 'overlay',
  referenceImagePosition: 'bottom-right', referenceImageOpacity: 0.8,
  referenceImageScale: 0.15,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function HostAiConfigPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const [config, setConfig] = useState<AiConfig>(DEFAULTS);
  const [features, setFeatures] = useState<AiFeatureAccess[]>([]);
  const [eventTitle, setEventTitle] = useState('Event');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kwInput, setKwInput] = useState('');
  const [energyOpen, setEnergyOpen] = useState(false);
  const [brandingOpen, setBrandingOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const [cfgRes, featRes, evRes] = await Promise.allSettled([
        api.get(`/events/${eventId}/ai-config`),
        api.get(`/events/${eventId}/ai-features?device=guest_app`),
        api.get(`/events/${eventId}`),
      ]);
      if (cfgRes.status === 'fulfilled') {
        const c = cfgRes.value.data.config ?? {};
        const merged = { ...DEFAULTS, ...c };
        setConfig(merged);
        setKwInput((merged.eventKeywords ?? []).join(', '));
      }
      if (featRes.status === 'fulfilled') {
        const f = featRes.value.data.features ?? featRes.value.data ?? [];
        if (Array.isArray(f)) setFeatures(f);
      }
      if (evRes.status === 'fulfilled')
        setEventTitle(evRes.value.data.event?.title || evRes.value.data.title || 'Event');
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const saveConfig = async () => {
    setSaving(true); setError(null);
    try {
      const keywords = kwInput.split(',').map(k => k.trim()).filter(Boolean);
      await api.put(`/events/${eventId}/ai-config`, {
        ...config,
        eventKeywords: keywords,
        welcomeMessage: config.welcomeMessage || null,
        customPromptContext: config.customPromptContext || null,
        eventTypeHint: config.eventTypeHint || null,
        referenceImageUrl: config.referenceImageUrl || null,
      });
      setConfig(p => ({ ...p, eventKeywords: keywords }));
      flash();
    } catch (e: any) { setError(e.response?.data?.error || 'Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  const toggleFeature = (key: string) =>
    setConfig(p => ({
      ...p,
      disabledFeatures: p.disabledFeatures.includes(key)
        ? p.disabledFeatures.filter(f => f !== key)
        : [...p.disabledFeatures, key],
    }));

  const enableAll = () => setConfig(p => ({ ...p, disabledFeatures: [] }));
  const disableAll = (keys: string[]) => setConfig(p => ({ ...p, disabledFeatures: [...new Set([...p.disabledFeatures, ...keys])] }));

  // Group features by uiGroup
  const grouped = features.reduce<Record<string, AiFeatureAccess[]>>((acc, f) => {
    const g = f.uiGroup || 'system';
    if (!acc[g]) acc[g] = [];
    acc[g].push(f);
    return acc;
  }, {});
  const groupOrder = ['game', 'effect', 'host_tool', 'system'];
  const visibleGroups = groupOrder.filter(g => grouped[g]?.length);
  const filteredGroups = activeGroup === 'all' ? visibleGroups : visibleGroups.filter(g => g === activeGroup);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  const disabledCount = config.disabledFeatures.length;
  const totalGuest = features.filter(f => f.uiGroup === 'game' || f.uiGroup === 'effect').length;
  const enabledGuest = totalGuest - features.filter(f => (f.uiGroup === 'game' || f.uiGroup === 'effect') && config.disabledFeatures.includes(f.key)).length;

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
                  <Sparkles className="w-4 h-4 text-indigo-500" /> KI-Konfigurator
                </h1>
                <p className="text-xs text-muted-foreground truncate max-w-52">{eventTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert</span>}
              {error && <span className="flex items-center gap-1 text-xs text-destructive truncate max-w-40"><AlertCircle className="w-3.5 h-3.5" /> {error}</span>}
              <Button size="sm" onClick={saveConfig} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}Speichern
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 space-y-5">
          {/* Stats Bar */}
          <div className="flex items-center gap-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" />
              <span><strong className="text-foreground">{enabledGuest}</strong> von {totalGuest} Features aktiv</span>
            </div>
            {disabledCount > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <EyeOff className="w-3.5 h-3.5" />
                <span>{disabledCount} deaktiviert</span>
              </div>
            )}
          </div>

          {/* ── KI-Kontext ── */}
          <div className="bg-card rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" /> KI-Kontext
            </h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Event-Typ</label>
              <div className="grid grid-cols-4 gap-2">
                {EVENT_TYPES.map(et => (
                  <button key={et.value} onClick={() => setConfig(p => ({ ...p, eventTypeHint: p.eventTypeHint === et.value ? null : et.value }))}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs transition-colors ${config.eventTypeHint === et.value ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'border-border hover:border-indigo-300 text-muted-foreground hover:text-foreground'}`}>
                    <span className="text-lg">{et.emoji}</span><span>{et.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Willkommens-Nachricht</label>
              <input type="text" value={config.welcomeMessage || ''} onChange={e => setConfig(p => ({ ...p, welcomeMessage: e.target.value }))} placeholder="z.B. Willkommen zur Hochzeit von Anna & Max!" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Keywords (kommagetrennt)</label>
              <input type="text" value={kwInput} onChange={e => setKwInput(e.target.value)} placeholder="z.B. Hochzeit, Liebe, Sommer, Strand" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Eigener Prompt-Kontext</label>
              <textarea rows={3} value={config.customPromptContext || ''} onChange={e => setConfig(p => ({ ...p, customPromptContext: e.target.value }))} placeholder="Optionaler Text, der in alle KI-Prompts eingefügt wird (z.B. Event-Beschreibung, Firmeninfos, Tonalität)" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
            </div>
          </div>

          {/* ── Feature Toggles ── */}
          <div className="bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ToggleRight className="w-4 h-4 text-indigo-500" /> Features aktivieren / deaktivieren
              </h2>
              <div className="flex gap-1.5">
                <button onClick={enableAll} className="text-[11px] px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">Alle an</button>
                <button onClick={() => disableAll(features.filter(f => f.uiGroup === 'game' || f.uiGroup === 'effect').map(f => f.key))} className="text-[11px] px-2 py-1 rounded-md bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors">Alle aus</button>
              </div>
            </div>

            {/* Group filter tabs */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
              <button onClick={() => setActiveGroup('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeGroup === 'all' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                Alle ({features.length})
              </button>
              {visibleGroups.map(g => {
                const meta = FEATURE_GROUP_META[g] || { label: g, color: 'text-gray-400' };
                return (
                  <button key={g} onClick={() => setActiveGroup(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeGroup === g ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
                    {meta.label} ({grouped[g]?.length || 0})
                  </button>
                );
              })}
            </div>

            {/* Feature list */}
            {filteredGroups.map(g => {
              const meta = FEATURE_GROUP_META[g] || { label: g, icon: Sparkles, color: 'text-gray-400' };
              const Icon = meta.icon;
              const items = (grouped[g] || []).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

              return (
                <div key={g} className="mb-4 last:mb-0">
                  {filteredGroups.length > 1 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{meta.label}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map(f => {
                      const disabled = config.disabledFeatures.includes(f.key);
                      const blockedByPackage = f.reason === 'package';
                      const on = !disabled && !blockedByPackage;
                      return (
                        <button key={f.key} onClick={() => !blockedByPackage && toggleFeature(f.key)}
                          disabled={blockedByPackage}
                          title={blockedByPackage ? 'Nicht in deinem Paket enthalten — Upgrade nötig' : f.description}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all group ${
                            blockedByPackage
                              ? 'border-border bg-muted/20 opacity-40 cursor-not-allowed'
                              : on
                                ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 hover:shadow-sm'
                                : 'border-border bg-muted/30 opacity-60 hover:opacity-80'
                          }`}>
                          <span className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
                            <span className="text-base shrink-0">{f.emoji || '✨'}</span>
                            <span className="truncate">{f.label}</span>
                            {f.creditCost > 0 && <span className="text-[10px] text-muted-foreground shrink-0">{f.creditCost}⚡</span>}
                          </span>
                          {blockedByPackage ? (
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground shrink-0">Upgrade</span>
                          ) : on ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Energy System ── */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <button onClick={() => setEnergyOpen(v => !v)} className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Energy-System
                {!config.energyEnabled && <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground ml-1">deaktiviert</span>}
              </h2>
              {energyOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {energyOpen && (
              <div className="px-5 pb-5 space-y-4 border-t pt-4">
                {/* Enable toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Energy aktiviert</p>
                    <p className="text-xs text-muted-foreground">Gäste verbrauchen Energy für KI-Features</p>
                  </div>
                  <button onClick={() => setConfig(p => ({ ...p, energyEnabled: !p.energyEnabled }))}
                    className={`w-11 h-6 rounded-full transition-colors relative ${config.energyEnabled ? 'bg-emerald-500' : 'bg-muted'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.energyEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">Wenn deaktiviert, können Gäste alle freigeschalteten Features ohne Limit nutzen.</p>
                </div>

                {/* Balance & Cooldown */}
                <div className="grid grid-cols-2 gap-3">
                  {([['energyStartBalance', 'Start-Balance', 1, 100], ['energyCooldownSeconds', 'Cooldown (Sek)', 0, 3600]] as [string, string, number, number][]).map(([k, l, min, max]) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">{l}</label>
                      <input type="number" min={min} max={max} value={(config as any)[k]} onChange={e => setConfig(p => ({ ...p, [k]: Number(e.target.value) }))} disabled={!config.energyEnabled} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none disabled:opacity-40" />
                    </div>
                  ))}
                </div>

                {/* Costs */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Feature-Kosten (Energy pro Nutzung)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ENERGY_COSTS.map(([k, l]) => (
                      <div key={k} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-muted-foreground">{l}</span>
                        <input type="number" min={0} max={20} value={(config as any)[k]} onChange={e => setConfig(p => ({ ...p, [k]: Number(e.target.value) }))} disabled={!config.energyEnabled} className="w-12 text-right bg-transparent text-sm font-medium focus:outline-none disabled:opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewards */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Energy-Belohnungen</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ENERGY_REWARDS.map(([k, l]) => (
                      <div key={k} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-muted-foreground">{l}</span>
                        <input type="number" min={0} max={50} value={(config as any)[k]} onChange={e => setConfig(p => ({ ...p, [k]: Number(e.target.value) }))} disabled={!config.energyEnabled} className="w-12 text-right bg-transparent text-sm font-medium focus:outline-none disabled:opacity-40" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Branding / Reference Image ── */}
          <div className="bg-card rounded-xl border overflow-hidden">
            <button onClick={() => setBrandingOpen(v => !v)} className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-violet-500" /> Branding / Logo auf KI-Ausgaben
              </h2>
              {brandingOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {brandingOpen && (
              <div className="px-5 pb-5 space-y-4 border-t pt-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">Logo / Referenzbild URL</label>
                  <input type="url" value={config.referenceImageUrl || ''} onChange={e => setConfig(p => ({ ...p, referenceImageUrl: e.target.value }))} placeholder="https://example.com/logo.png" className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>

                {config.referenceImageUrl && (
                  <>
                    <div className="flex items-center gap-4">
                      <img src={config.referenceImageUrl} alt="Preview" className="w-16 h-16 rounded-lg object-contain border bg-white" onError={e => (e.currentTarget.style.display = 'none')} />
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                          <select value={config.referenceImagePosition || 'bottom-right'} onChange={e => setConfig(p => ({ ...p, referenceImagePosition: e.target.value }))} className="w-full rounded-lg border bg-muted/50 px-2 py-1.5 text-xs">
                            {REF_IMAGE_POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Deckkraft ({Math.round((config.referenceImageOpacity ?? 0.8) * 100)}%)</label>
                        <input type="range" min={0} max={1} step={0.05} value={config.referenceImageOpacity ?? 0.8} onChange={e => setConfig(p => ({ ...p, referenceImageOpacity: Number(e.target.value) }))} className="w-full accent-violet-500" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Größe ({Math.round((config.referenceImageScale ?? 0.15) * 100)}%)</label>
                        <input type="range" min={0.05} max={0.5} step={0.01} value={config.referenceImageScale ?? 0.15} onChange={e => setConfig(p => ({ ...p, referenceImageScale: Number(e.target.value) }))} className="w-full accent-violet-500" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
