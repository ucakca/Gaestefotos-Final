'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Save, Send, CheckCircle2, Loader2,
  Palette, Music, Sparkles, Users, Monitor, MessageSquare,
  FileText, Clock,
} from 'lucide-react';
import api from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────

interface BriefingData {
  id: string;
  eventId: string;
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
  devices: string[];
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
}

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

const MOODS = [
  { value: 'elegant', label: 'Elegant & Klassisch', emoji: '🥂' },
  { value: 'fun', label: 'Lustig & Locker', emoji: '😄' },
  { value: 'romantic', label: 'Romantisch', emoji: '💕' },
  { value: 'wild', label: 'Wild & Party', emoji: '🔥' },
  { value: 'chill', label: 'Entspannt & Chill', emoji: '🌿' },
  { value: 'professional', label: 'Professionell', emoji: '💼' },
];

const DEVICE_OPTIONS = [
  { value: 'guest_app', label: 'Gäste-App (Handy)', emoji: '📱' },
  { value: 'photo_booth', label: 'Photo Booth', emoji: '📸' },
  { value: 'mirror_booth', label: 'Mirror Booth', emoji: '🪞' },
  { value: 'ki_booth', label: 'KI Booth', emoji: '🤖' },
  { value: 'live_wall', label: 'Live Wall / Beamer', emoji: '🖥️' },
];

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-700', icon: FileText },
  SUBMITTED: { label: 'Eingereicht', color: 'bg-blue-100 text-blue-700', icon: Send },
  REVIEWED: { label: 'Geprüft', color: 'bg-amber-100 text-amber-700', icon: CheckCircle2 },
  FINALIZED: { label: 'Finalisiert', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

// ─── Component ──────────────────────────────────────────────

export default function BriefingPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    eventType: '',
    eventName: '',
    eventDate: '',
    guestCount: '',
    primaryColor: '#6366f1',
    footerText: '',
    mood: '',
    theme: '',
    keywords: '',
    customPromptRequest: '',
    devices: [] as string[],
    specialRequests: '',
  });

  // Load briefing
  useEffect(() => {
    if (!eventId) return;
    (async () => {
      try {
        const { data } = await api.get(`/events/${eventId}/briefing`);
        const b = data.briefing as BriefingData;
        setBriefing(b);
        setForm({
          eventType: b.eventType || '',
          eventName: b.eventName || '',
          eventDate: b.eventDate ? b.eventDate.split('T')[0] : '',
          guestCount: b.guestCount ? String(b.guestCount) : '',
          primaryColor: b.primaryColor || '#6366f1',
          footerText: b.footerText || '',
          mood: b.mood || '',
          theme: b.theme || '',
          keywords: (b.keywords || []).join(', '),
          customPromptRequest: b.customPromptRequest || '',
          devices: b.devices || [],
          specialRequests: b.specialRequests || '',
        });
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Briefing konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = {
        eventType: form.eventType || null,
        eventName: form.eventName || null,
        eventDate: form.eventDate || null,
        guestCount: form.guestCount ? Number(form.guestCount) : null,
        primaryColor: form.primaryColor || null,
        footerText: form.footerText || null,
        mood: form.mood || null,
        theme: form.theme || null,
        keywords: form.keywords ? form.keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
        customPromptRequest: form.customPromptRequest || null,
        devices: form.devices,
        specialRequests: form.specialRequests || null,
      };
      const { data } = await api.put(`/events/${eventId}/briefing`, payload);
      setBriefing(data.briefing);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }, [eventId, form]);

  // Submit
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await handleSave();
      const { data } = await api.post(`/events/${eventId}/briefing/submit`);
      setBriefing(data.briefing);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Einreichen fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  }, [eventId, handleSave]);

  const toggleDevice = (device: string) => {
    setForm(prev => ({
      ...prev,
      devices: prev.devices.includes(device)
        ? prev.devices.filter(d => d !== device)
        : [...prev.devices, device],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = STATUS_LABELS[briefing?.status || 'DRAFT'];
  const isFinalized = briefing?.status === 'FINALIZED';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Event-Briefing</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gespeichert
              </motion.span>
            )}
            <button
              onClick={handleSave}
              disabled={saving || isFinalized}
              className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">OK</button>
          </div>
        )}

        {/* Section 1: Event-Basics */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Event-Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Event-Name</label>
              <input
                type="text"
                value={form.eventName}
                onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))}
                disabled={isFinalized}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                placeholder="z.B. Hochzeit Anna & Max"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <input
                type="date"
                value={form.eventDate}
                onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
                disabled={isFinalized}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gästeanzahl</label>
              <input
                type="number"
                value={form.guestCount}
                onChange={e => setForm(p => ({ ...p, guestCount: e.target.value }))}
                disabled={isFinalized}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
                placeholder="z.B. 120"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Event-Typ</label>
            <div className="grid grid-cols-4 gap-2">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => !isFinalized && setForm(p => ({ ...p, eventType: t.value }))}
                  disabled={isFinalized}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                    form.eventType === t.value
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border hover:border-primary/30'
                  } disabled:opacity-50`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Stimmung */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Music className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Stimmung & Stil</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Stimmung</label>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => !isFinalized && setForm(p => ({ ...p, mood: m.value }))}
                  disabled={isFinalized}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                    form.mood === m.value
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border hover:border-primary/30'
                  } disabled:opacity-50`}
                >
                  <span className="text-lg">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Keywords / Hashtags</label>
            <input
              type="text"
              value={form.keywords}
              onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))}
              disabled={isFinalized}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              placeholder="z.B. AnnaUndMax2025, Liebe, Party"
            />
            <p className="text-xs text-muted-foreground mt-1">Komma-getrennt — werden für KI-Captions und Texte verwendet</p>
          </div>
        </section>

        {/* Section 3: Branding */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Branding</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Hauptfarbe</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                  disabled={isFinalized}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer disabled:opacity-50"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={e => setForm(p => ({ ...p, primaryColor: e.target.value }))}
                  disabled={isFinalized}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-mono disabled:opacity-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Footer-Text</label>
              <input
                type="text"
                value={form.footerText}
                onChange={e => setForm(p => ({ ...p, footerText: e.target.value }))}
                disabled={isFinalized}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm disabled:opacity-50"
                placeholder="z.B. Powered by gästefotos.com"
              />
            </div>
          </div>
        </section>

        {/* Section 4: Geräte */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Monitor className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Geräte & Stationen</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEVICE_OPTIONS.map(d => (
              <button
                key={d.value}
                onClick={() => !isFinalized && toggleDevice(d.value)}
                disabled={isFinalized}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                  form.devices.includes(d.value)
                    ? 'border-primary bg-primary/5 text-primary shadow-sm'
                    : 'border-border hover:border-primary/30 text-muted-foreground'
                } disabled:opacity-50`}
              >
                <span className="text-xl">{d.emoji}</span>
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {/* Section 5: KI-Wünsche */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">KI-Anpassungen</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Wünsche für KI-Texte</label>
            <textarea
              value={form.customPromptRequest}
              onChange={e => setForm(p => ({ ...p, customPromptRequest: e.target.value }))}
              disabled={isFinalized}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              placeholder="z.B. Bitte duze die Gäste, verwende unseren Insider-Witz 'Aloha Beaches', halte Roasts familienfreundlich..."
            />
            <p className="text-xs text-muted-foreground mt-1">Wird für alle KI-generierten Texte (Spiele, Captions, Reden) berücksichtigt</p>
          </div>
        </section>

        {/* Section 6: Sonderwünsche */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Sonstiges</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Besondere Wünsche / Hinweise</label>
            <textarea
              value={form.specialRequests}
              onChange={e => setForm(p => ({ ...p, specialRequests: e.target.value }))}
              disabled={isFinalized}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50"
              placeholder="z.B. Bitte keine Fotos vom Brautvater, wir haben einen Überraschungsgast um 22:00..."
            />
          </div>
        </section>

        {/* Submit Button */}
        {!isFinalized && (
          <div className="pt-4 pb-8">
            <button
              onClick={handleSubmit}
              disabled={submitting || briefing?.status === 'SUBMITTED'}
              className="w-full py-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : briefing?.status === 'SUBMITTED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Briefing wurde eingereicht
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Briefing einreichen
                </>
              )}
            </button>
            {briefing?.status === 'DRAFT' && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Nach dem Einreichen wird dein Briefing von unserem Team geprüft und angewendet.
              </p>
            )}
          </div>
        )}

        {isFinalized && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-800">Briefing finalisiert!</p>
            <p className="text-sm text-green-700 mt-1">Die Konfiguration wurde auf dein Event angewendet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
