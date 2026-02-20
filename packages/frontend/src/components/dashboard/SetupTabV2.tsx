'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar,
  MapPin,
  Palette,
  QrCode,
  Mail,
  Trophy,
  Users,
  BookOpen,
  Settings,
  Wifi,
  Eye,
  Info,
  Sparkles,
  PartyPopper,
  Save,
  Loader2,
  Check,
  X,
  Type,
  Image as ImageIcon,
  ExternalLink,
  Lock,
  Zap,
  Hash,
  Video,
  Download,
  ScanFace,
  Monitor,
  Grid3X3,
  Gamepad2,
  Shield,
  UserPlus,
  LayoutGrid,
  BarChart3,
  Layers,
  Contact,
  Upload,
} from 'lucide-react';
import { usePackageFeatures, FeatureKey, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';
import { Event as EventType } from '@gaestefotos/shared';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import type { EventTheme } from '@/types/theme';
import { TitleContent, isTitleValid } from '@/components/setup-wizard/content';
import DateLocationContent from '@/components/setup-wizard/content/DateLocationContent';
import { CoHostsSection } from '@/components/dashboard/CoHostsSection';

type SetupSheet = 'title' | 'date-location' | 'design' | 'qr' | 'advanced' | 'theme' | null;

interface SetupTabV2Props {
  event: EventType;
  eventId: string;
  onEventUpdate?: () => void;
}

const FEATURE_CARDS: { key: FeatureKey; icon: any; color: string; gradient: string }[] = [
  { key: 'videoUpload', icon: Video, color: 'text-purple-500', gradient: 'bg-purple-500/10' },
  { key: 'guestbook', icon: BookOpen, color: 'text-success', gradient: 'bg-emerald-500/10' },
  { key: 'liveWall', icon: Monitor, color: 'text-blue-500', gradient: 'bg-blue-500/10' },
  { key: 'faceSearch', icon: ScanFace, color: 'text-cyan-500', gradient: 'bg-cyan-500/10' },
  { key: 'boothGames', icon: Gamepad2, color: 'text-orange-500', gradient: 'bg-orange-500/10' },
  { key: 'zipDownload', icon: Download, color: 'text-indigo-500', gradient: 'bg-indigo-500/10' },
  { key: 'mosaicWall', icon: Grid3X3, color: 'text-pink-500', gradient: 'bg-pink-500/10' },
  { key: 'coHosts', icon: UserPlus, color: 'text-teal-500', gradient: 'bg-teal-500/10' },
  { key: 'passwordProtect', icon: Shield, color: 'text-amber-500', gradient: 'bg-amber-500/10' },
  { key: 'adFree', icon: Zap, color: 'text-warning', gradient: 'bg-yellow-500/10' },
];

export default function SetupTabV2({ event, eventId, onEventUpdate }: SetupTabV2Props) {
  const { showToast } = useToastStore();
  const [activeSheet, setActiveSheet] = useState<SetupSheet>(null);
  const { features, packageName, tier, isFree } = usePackageFeatures(eventId);
  
  // Local state for editing
  const [title, setTitle] = useState(event.title || '');
  const [dateTime, setDateTime] = useState<Date | null>(
    event.dateTime ? new Date(event.dateTime) : null
  );
  const [location, setLocation] = useState((event as any).location || '');
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState(event.slug || '');
  const [featuresConfig, setFeaturesConfig] = useState<any>((event as any).featuresConfig || {});
  const [themes, setThemes] = useState<EventTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>((event as any).themeId || null);
  const [customColors, setCustomColors] = useState<Record<string, string>>(
    ((event as any).customThemeData as any)?.colors || {}
  );
  const [showCustomColors, setShowCustomColors] = useState(false);

  // Reset state when event changes
  useEffect(() => {
    setTitle(event.title || '');
    setDateTime(event.dateTime ? new Date(event.dateTime) : null);
    setLocation((event as any).location || '');
    setSlug(event.slug || '');
    setFeaturesConfig((event as any).featuresConfig || {});
    setSelectedThemeId((event as any).themeId || null);
    setCustomColors(((event as any).customThemeData as any)?.colors || {});
  }, [event]);

  const loadThemes = async () => {
    if (themes.length > 0) return;
    setThemesLoading(true);
    try {
      const { data } = await api.get('/event-themes');
      setThemes(data.themes || []);
    } catch { /* ignore */ } finally {
      setThemesLoading(false);
    }
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const hasCustom = Object.keys(customColors).length > 0;
      await api.put(`/events/${eventId}`, {
        themeId: selectedThemeId,
        customThemeData: hasCustom ? { colors: customColors } : null,
      });
      showToast('Theme gespeichert', 'success');
      onEventUpdate?.();
      setActiveSheet(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!isTitleValid(title)) return;
    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, { title });
      showToast('Titel gespeichert', 'success');
      onEventUpdate?.();
      setActiveSheet(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDateLocation = async () => {
    setSaving(true);
    try {
      await api.put(`/events/${eventId}`, { 
        dateTime: dateTime?.toISOString() || null,
        location: location || null,
      });
      showToast('Datum & Ort gespeichert', 'success');
      onEventUpdate?.();
      setActiveSheet(null);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4 space-y-4"
    >
      {/* Event-Info Section - Now with inline editing */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-background">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Info className="w-4 h-4" />
            Event-Info
          </h3>
        </div>
        <SetupRow 
          icon={Type} 
          label="Event-Titel" 
          value={event.title}
          onClick={() => setActiveSheet('title')}
        />
        <SetupRow 
          icon={Calendar} 
          label="Datum & Ort" 
          value={event.dateTime 
            ? new Date(event.dateTime).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'Nicht festgelegt'
          }
          onClick={() => setActiveSheet('date-location')}
        />
      </div>

      {/* Design Section */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-background">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </h3>
        </div>
        <SetupRow 
          icon={Palette} 
          label="Event Theme" 
          value={(event as any)?.theme?.name || 'Kein Theme'}
          onClick={() => { setActiveSheet('theme'); loadThemes(); }}
        />
        <SetupRow icon={Palette} label="Galerie-Design" link={`/events/${eventId}/design?wizard=1`} />
        <SetupRow icon={QrCode} label="QR-Code Designer" link={`/events/${eventId}/qr-styler`} />
        <SetupRow icon={Mail} label="Einladungen" link={`/events/${eventId}/invitations`} />
      </div>

      {/* Features Section — Progressive Disclosure Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">
            {packageName}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FEATURE_CARDS.map(({ key, icon: FIcon, color, gradient }) => {
            const enabled = features[key];
            const desc = FEATURE_DESCRIPTIONS[key];
            return (
              <div
                key={key}
                className={`relative rounded-2xl border p-3 transition-all ${
                  enabled
                    ? `border-border ${gradient} shadow-sm hover:shadow-md`
                    : 'border-dashed border-border/60 bg-background/50 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${enabled ? 'bg-card/80' : 'bg-card'}`}>
                    <FIcon className={`w-4 h-4 ${enabled ? color : 'text-muted-foreground'}`} />
                  </div>
                  {enabled ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/15 px-1.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Aktiv
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-border/30 px-1.5 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Upgrade
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{desc.name}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{desc.description}</p>
                {!enabled && (
                  <div className="mt-2">
                    <span className="text-[10px] text-warning font-medium flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Im nächsten Paket
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Feature Links */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-background">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Feature-Verwaltung
          </h3>
        </div>
        <SetupRow icon={Trophy} label="Foto-Spiele" link={`/events/${eventId}/challenges`} />
        <SetupRow icon={PartyPopper} label="Foto-Spaß" value={featuresConfig.enableFotoSpass !== false ? 'Aktiv' : 'Deaktiviert'} onClick={() => {
          const newVal = featuresConfig.enableFotoSpass === false;
          const updated = { ...featuresConfig, enableFotoSpass: newVal };
          setFeaturesConfig(updated);
          api.put(`/events/${eventId}`, { featuresConfig: updated })
            .then(() => { showToast(newVal ? 'Foto-Spaß aktiviert' : 'Foto-Spaß deaktiviert', 'success'); onEventUpdate?.(); })
            .catch(() => showToast('Fehler beim Speichern', 'error'));
        }} />
        <SetupRow icon={Users} label="Gästeliste" link={`/events/${eventId}/guests`} />
        <SetupRow icon={BookOpen} label="Kategorien" link={`/events/${eventId}/categories`} />
        <SetupRow icon={Layers} label="Duplikate erkennen" link={`/events/${eventId}/duplicates`} />
        <SetupRow icon={BarChart3} label="Statistiken" link={`/events/${eventId}/statistics`} />
        <SetupRow icon={Video} label="Videos verwalten" link={`/events/${eventId}/videos`} />
        <SetupRow icon={Contact} label="Leads & Kontakte" link={`/events/${eventId}/leads`} />
      </div>

      {/* Settings Section */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-background">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </h3>
        </div>
        <SetupRow icon={Wifi} label="WLAN für Gäste" link={`/events/${eventId}/wifi`} />
        <SetupRow
          icon={Shield}
          label="Kommentar-Moderation"
          value={featuresConfig.moderateComments === true ? 'Aktiv' : 'Deaktiviert'}
          onClick={() => {
            const newVal = !featuresConfig.moderateComments;
            const updated = { ...featuresConfig, moderateComments: newVal };
            setFeaturesConfig(updated);
            api.put(`/events/${eventId}`, { featuresConfig: updated })
              .then(() => { showToast(newVal ? 'Kommentare werden moderiert' : 'Kommentare auto-freigegeben', 'success'); onEventUpdate?.(); })
              .catch(() => showToast('Fehler', 'error'));
          }}
        />
        <SetupRow
          icon={Upload}
          label="Max. Uploads pro Gast"
          value={featuresConfig.maxUploadsPerGuest ? `${featuresConfig.maxUploadsPerGuest} Fotos` : 'Unbegrenzt'}
          onClick={() => {
            const current = featuresConfig.maxUploadsPerGuest || 0;
            const options = [0, 5, 10, 20, 50];
            const nextIdx = (options.indexOf(current) + 1) % options.length;
            const newVal = options[nextIdx];
            const updated = { ...featuresConfig, maxUploadsPerGuest: newVal || undefined };
            setFeaturesConfig(updated);
            api.put(`/events/${eventId}`, { featuresConfig: updated })
              .then(() => { showToast(newVal ? `Max. ${newVal} Fotos pro Gast` : 'Upload-Limit aufgehoben', 'success'); onEventUpdate?.(); })
              .catch(() => showToast('Fehler', 'error'));
          }}
        />
        <SetupRow
          icon={Mail}
          label="E-Mail-Benachrichtigungen"
          value={featuresConfig.disableEmailNotifications === true ? 'Deaktiviert' : 'Aktiv'}
          onClick={() => {
            const newVal = !featuresConfig.disableEmailNotifications;
            const updated = { ...featuresConfig, disableEmailNotifications: newVal };
            setFeaturesConfig(updated);
            api.put(`/events/${eventId}`, { featuresConfig: updated })
              .then(() => { showToast(newVal ? 'Benachrichtigungen deaktiviert' : 'Benachrichtigungen aktiviert', 'success'); onEventUpdate?.(); })
              .catch(() => showToast('Fehler', 'error'));
          }}
        />
        <SetupRow
          icon={Hash}
          label="Custom Hashtag"
          value={featuresConfig.customHashtag || 'Nicht gesetzt'}
          onClick={() => {
            const val = window.prompt('Custom Hashtag (z.B. #MeineHochzeit):', featuresConfig.customHashtag || '');
            if (val === null) return;
            const updated = { ...featuresConfig, customHashtag: val.trim() || undefined };
            setFeaturesConfig(updated);
            api.put(`/events/${eventId}`, { featuresConfig: updated })
              .then(() => { showToast(val.trim() ? `Hashtag gesetzt: ${val.trim()}` : 'Hashtag entfernt', 'success'); onEventUpdate?.(); })
              .catch(() => showToast('Fehler', 'error'));
          }}
        />
        <SetupRow icon={Eye} label="Erweiterte Optionen" onClick={() => setActiveSheet('advanced')} />
      </div>

      {/* Co-Hosts Section */}
      <CoHostsSection
        eventId={eventId}
        onCopy={async (text, msg) => {
          await navigator.clipboard.writeText(text);
          showToast(msg || 'Kopiert', 'success');
        }}
        onShare={async (url, title) => {
          if (navigator.share) {
            await navigator.share({ url, title });
          } else {
            await navigator.clipboard.writeText(url);
            showToast('Link kopiert', 'success');
          }
        }}
        onToast={showToast}
      />

      {/* === BOTTOM SHEETS === */}
      
      {/* Title Sheet */}
      <AnimatePresence>
        {activeSheet === 'title' && (
          <SetupSheet
            title="Event-Titel"
            onClose={() => setActiveSheet(null)}
            onSave={handleSaveTitle}
            saving={saving}
            isValid={isTitleValid(title)}
          >
            <TitleContent
              title={title}
              eventType="custom"
              onTitleChange={setTitle}
              showHeader={false}
            />
          </SetupSheet>
        )}
      </AnimatePresence>

      {/* Date/Location Sheet */}
      <AnimatePresence>
        {activeSheet === 'date-location' && (
          <SetupSheet
            title="Datum & Ort"
            onClose={() => setActiveSheet(null)}
            onSave={handleSaveDateLocation}
            saving={saving}
            isValid={true}
          >
            <DateLocationContent
              dateTime={dateTime}
              location={location}
              onDateTimeChange={setDateTime}
              onLocationChange={setLocation}
              showHeader={false}
              showTip={true}
              dateLocked={!!event.dateTime && new Date(event.dateTime) < new Date()}
            />
          </SetupSheet>
        )}
      </AnimatePresence>
      {/* Advanced Options Sheet */}
      <AnimatePresence>
        {activeSheet === 'advanced' && (
          <SetupSheet
            title="Erweiterte Optionen"
            onClose={() => setActiveSheet(null)}
            onSave={async () => {
              setSaving(true);
              try {
                await api.put(`/events/${eventId}`, {
                  slug,
                  featuresConfig,
                });
                showToast('Einstellungen gespeichert', 'success');
                onEventUpdate?.();
                setActiveSheet(null);
              } catch (err: any) {
                showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
              } finally {
                setSaving(false);
              }
            }}
            saving={saving}
            isValid={!!slug.trim()}
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1 text-foreground">URL-Slug</label>
                <Input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="px-4 py-3"
                />
                <p className="mt-1 text-xs text-muted-foreground">Bestimmt die URL deiner Galerie</p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Features</h4>
                {[
                  { key: 'allowUploads', label: 'Foto-Uploads erlauben' },
                  { key: 'allowDownloads', label: 'Downloads erlauben' },
                  { key: 'moderationRequired', label: 'Moderation erforderlich' },
                  { key: 'mysteryMode', label: 'Mystery Mode (Fotos erst später sichtbar)' },
                  { key: 'showGuestlist', label: 'Gästeliste anzeigen' },
                  { key: 'enableFotoSpass', label: 'Foto-Spaß (Master-Toggle für alle KI-Features)' },
                  { key: 'enableStyleTransfer', label: '↳ KI Foto-Stile (Ölgemälde, Cartoon, etc.)' },
                  { key: 'enableAiGames', label: '↳ KI Foto-Spiele (Roast, Fortune Teller, etc.)' },
                  { key: 'enableAiEffects', label: '↳ KI Effekte (Oldify, Face Switch, etc.)' },
                  { key: 'enableCaptions', label: '↳ KI Captions (Instagram-Texte generieren)' },
                  { key: 'faceSearch', label: 'Gesichtserkennung (Finde mein Foto)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!featuresConfig[key]}
                      onClick={() => setFeaturesConfig((prev: any) => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        featuresConfig[key] ? 'bg-primary' : 'bg-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-card transition-transform ${
                          featuresConfig[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Upload-Zeitfenster</h4>
                <p className="text-xs text-muted-foreground">Wie viele Tage vor und nach dem Event dürfen Gäste Fotos hochladen?</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={featuresConfig.uploadToleranceDays ?? 1}
                    onChange={(e) => setFeaturesConfig((prev: any) => ({ ...prev, uploadToleranceDays: parseInt(e.target.value) || 1 }))}
                    className="w-20 px-3 py-2 text-center"
                  />
                  <span className="text-sm text-muted-foreground">Tag(e) Toleranz (±)</span>
                </div>
                <p className="text-xs text-muted-foreground">Hosts & Co-Hosts können immer hochladen. 0 = nur am Event-Tag.</p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Branding (Premium)</h4>
                <p className="text-xs text-muted-foreground">Nur für werbefreie Pakete: Eigenes Hashtag und Logo auf geteilten Fotos.</p>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Custom Hashtag</label>
                  <Input
                    type="text"
                    value={featuresConfig.customHashtag || ''}
                    onChange={(e) => setFeaturesConfig((prev: any) => ({ ...prev, customHashtag: e.target.value || undefined }))}
                    placeholder="#meinEvent"
                    className="px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Erscheint auf heruntergeladenen Fotos statt #gästefotos</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Overlay-Logo URL</label>
                  <Input
                    type="url"
                    value={featuresConfig.customOverlayLogoUrl || ''}
                    onChange={(e) => setFeaturesConfig((prev: any) => ({ ...prev, customOverlayLogoUrl: e.target.value || undefined }))}
                    placeholder="https://..."
                    className="px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Eigenes Logo statt gästefotos.com auf geteilten Fotos</p>
                </div>
              </div>
            </div>
          </SetupSheet>
        )}
      </AnimatePresence>

      {/* Theme Picker Sheet */}
      <AnimatePresence>
        {activeSheet === 'theme' && (
          <SetupSheet
            title="Event Theme wählen"
            onClose={() => setActiveSheet(null)}
            onSave={handleSaveTheme}
            saving={saving}
            isValid={true}
          >
            {themesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* No theme option */}
                <button
                  type="button"
                  onClick={() => setSelectedThemeId(null)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedThemeId === null
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">Kein Theme</div>
                    <div className="text-xs text-muted-foreground">Standard-Design verwenden</div>
                  </div>
                  {selectedThemeId === null && <Check className="w-4 h-4 text-primary ml-auto" />}
                </button>

                {/* Live Preview */}
                {selectedThemeId && (() => {
                  const preview = themes.find(t => t.id === selectedThemeId);
                  if (!preview) return null;
                  const pc = preview.colors;
                  return (
                    <div className="rounded-xl overflow-hidden border border-border mb-3">
                      <div className="p-4 text-center" style={{ background: `linear-gradient(135deg, ${pc.primary}, ${pc.secondary}, ${pc.accent})` }}>
                        <div className="text-white text-xs font-medium opacity-80 mb-1">Vorschau</div>
                        <div className="text-white font-bold text-lg" style={{ fontFamily: `"${preview.fonts.heading}", serif` }}>
                          {event.title || 'Event'}
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between text-xs" style={{ backgroundColor: pc.background, color: pc.text }}>
                        <span style={{ fontFamily: `"${preview.fonts.body}", sans-serif` }}>{preview.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: `${pc.accent}20`, color: pc.accent }}>
                          {preview.wallLayout}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Custom Color Overrides */}
                {selectedThemeId && (
                  <div className="border border-border rounded-xl overflow-hidden mb-3">
                    <button
                      type="button"
                      onClick={() => setShowCustomColors(!showCustomColors)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" />
                        Farben anpassen
                      </span>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCustomColors ? 'rotate-180' : ''}`} />
                    </button>
                    {showCustomColors && (
                      <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border">
                        {[
                          { key: 'primary', label: 'Primär' },
                          { key: 'secondary', label: 'Sekundär' },
                          { key: 'accent', label: 'Akzent' },
                          { key: 'background', label: 'Hintergrund' },
                          { key: 'text', label: 'Text' },
                        ].map(({ key, label }) => {
                          const baseTheme = themes.find(t => t.id === selectedThemeId);
                          const baseColor = (baseTheme?.colors as any)?.[key] || '#888';
                          const current = customColors[key] || baseColor;
                          return (
                            <div key={key} className="flex items-center gap-2">
                              <input
                                type="color"
                                value={current}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === baseColor) {
                                    const next = { ...customColors };
                                    delete next[key];
                                    setCustomColors(next);
                                  } else {
                                    setCustomColors(prev => ({ ...prev, [key]: val }));
                                  }
                                }}
                                className="w-7 h-7 rounded-md border border-border cursor-pointer"
                              />
                              <span className="text-xs text-foreground flex-1">{label}</span>
                              {customColors[key] && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...customColors };
                                    delete next[key];
                                    setCustomColors(next);
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedThemeId(t.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedThemeId === t.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex gap-0.5 shrink-0">
                      {[t.colors.primary, t.colors.secondary, t.colors.accent].map((c, i) => (
                        <div key={i} className="w-6 h-6 rounded-md border border-black/10" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.eventType} · {t.fonts.heading}</div>
                    </div>
                    {selectedThemeId === t.id && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </SetupSheet>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// === HELPER COMPONENTS ===

function SetupRow({ 
  icon: Icon, 
  label, 
  value,
  link, 
  onClick,
  danger 
}: {
  icon: any;
  label: string;
  value?: string;
  link?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Icon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <span className={`block ${danger ? 'text-destructive' : 'text-foreground'}`}>{label}</span>
          {value && (
            <span className="block text-xs text-muted-foreground truncate">{value}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </>
  );

  const className = "flex items-center justify-between w-full px-4 py-4 border-b border-border/50 last:border-0 text-left hover:bg-background transition-colors";

  if (link) {
    return (
      <Link href={link} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function SetupSheet({
  title,
  children,
  onClose,
  onSave,
  saving,
  isValid,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  isValid: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card">
          <Button
            onClick={onSave}
            disabled={!isValid || saving}
            className="w-full justify-center gap-2 bg-warning hover:opacity-90 text-warning-foreground disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
