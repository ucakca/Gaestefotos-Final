'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ChevronRight,
  ChevronLeft,
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
  Video,
  Download,
  ScanFace,
  Monitor,
  Grid3X3,
  Gamepad2,
  Shield,
  UserPlus,
  LayoutGrid,
} from 'lucide-react';
import { usePackageFeatures, FeatureKey, FEATURE_DESCRIPTIONS } from '@/hooks/usePackageFeatures';
import { Event as EventType } from '@gaestefotos/shared';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { TitleContent, isTitleValid } from '@/components/setup-wizard/content';
import DateLocationContent from '@/components/setup-wizard/content/DateLocationContent';
import { CoHostsSection } from '@/components/dashboard/CoHostsSection';

type SetupSheet = 'title' | 'date-location' | 'design' | 'qr' | 'advanced' | null;

interface SetupTabV2Props {
  event: EventType;
  eventId: string;
  onEventUpdate?: () => void;
}

const FEATURE_CARDS: { key: FeatureKey; icon: any; color: string; gradient: string }[] = [
  { key: 'videoUpload', icon: Video, color: 'text-purple-500', gradient: 'from-purple-50 to-purple-100' },
  { key: 'guestbook', icon: BookOpen, color: 'text-green-500', gradient: 'from-green-50 to-green-100' },
  { key: 'liveWall', icon: Monitor, color: 'text-blue-500', gradient: 'from-blue-50 to-blue-100' },
  { key: 'faceSearch', icon: ScanFace, color: 'text-cyan-500', gradient: 'from-cyan-50 to-cyan-100' },
  { key: 'boothGames', icon: Gamepad2, color: 'text-orange-500', gradient: 'from-orange-50 to-orange-100' },
  { key: 'zipDownload', icon: Download, color: 'text-indigo-500', gradient: 'from-indigo-50 to-indigo-100' },
  { key: 'mosaicWall', icon: Grid3X3, color: 'text-pink-500', gradient: 'from-pink-50 to-pink-100' },
  { key: 'coHosts', icon: UserPlus, color: 'text-teal-500', gradient: 'from-teal-50 to-teal-100' },
  { key: 'passwordProtect', icon: Shield, color: 'text-amber-500', gradient: 'from-amber-50 to-amber-100' },
  { key: 'adFree', icon: Zap, color: 'text-yellow-500', gradient: 'from-yellow-50 to-yellow-100' },
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

  // Reset state when event changes
  useEffect(() => {
    setTitle(event.title || '');
    setDateTime(event.dateTime ? new Date(event.dateTime) : null);
    setLocation((event as any).location || '');
    setSlug(event.slug || '');
    setFeaturesConfig((event as any).featuresConfig || {});
  }, [event]);

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
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
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
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </h3>
        </div>
        <SetupRow icon={Palette} label="Galerie-Design" link={`/events/${eventId}/design?wizard=1`} />
        <SetupRow icon={QrCode} label="QR-Code Designer" link={`/events/${eventId}/qr-styler`} />
        <SetupRow icon={Mail} label="Einladungen" link={`/events/${eventId}/invitations`} />
      </div>

      {/* Features Section — Progressive Disclosure Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700">
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
                    ? `border-app-border bg-gradient-to-br ${gradient} shadow-sm hover:shadow-md`
                    : 'border-dashed border-app-border/60 bg-app-bg/50 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${enabled ? 'bg-white/80' : 'bg-app-card'}`}>
                    <FIcon className={`w-4 h-4 ${enabled ? color : 'text-app-muted'}`} />
                  </div>
                  {enabled ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Aktiv
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-app-muted bg-app-border/30 px-1.5 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" /> Upgrade
                    </span>
                  )}
                </div>
                <h4 className={`text-sm font-semibold ${enabled ? 'text-app-fg' : 'text-app-muted'}`}>{desc.name}</h4>
                <p className="text-[11px] text-app-muted mt-0.5 line-clamp-2">{desc.description}</p>
                {!enabled && (
                  <div className="mt-2">
                    <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
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
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
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
      </div>

      {/* Settings Section */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </h3>
        </div>
        <SetupRow icon={Wifi} label="WLAN für Gäste" link={`/events/${eventId}/wifi`} />
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
                <label className="block text-sm font-medium mb-1 text-app-fg">URL-Slug</label>
                <Input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="px-4 py-3"
                />
                <p className="mt-1 text-xs text-app-muted">Bestimmt die URL deiner Galerie</p>
              </div>

              <div className="border-t border-app-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-app-fg">Features</h4>
                {[
                  { key: 'allowUploads', label: 'Foto-Uploads erlauben' },
                  { key: 'allowDownloads', label: 'Downloads erlauben' },
                  { key: 'moderationRequired', label: 'Moderation erforderlich' },
                  { key: 'mysteryMode', label: 'Mystery Mode (Fotos erst später sichtbar)' },
                  { key: 'showGuestlist', label: 'Gästeliste anzeigen' },
                  { key: 'enableFotoSpass', label: 'Foto-Spaß (Spiele & Challenges für Gäste)' },
                  { key: 'faceSearch', label: 'Gesichtserkennung (Finde mein Foto)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-app-fg">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!featuresConfig[key]}
                      onClick={() => setFeaturesConfig((prev: any) => ({ ...prev, [key]: !prev[key] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        featuresConfig[key] ? 'bg-app-accent' : 'bg-app-border'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                          featuresConfig[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>

              <div className="border-t border-app-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-app-fg">Branding (Premium)</h4>
                <p className="text-xs text-app-muted">Nur für werbefreie Pakete: Eigenes Hashtag und Logo auf geteilten Fotos.</p>
                <div>
                  <label className="block text-sm font-medium mb-1 text-app-fg">Custom Hashtag</label>
                  <Input
                    type="text"
                    value={featuresConfig.customHashtag || ''}
                    onChange={(e) => setFeaturesConfig((prev: any) => ({ ...prev, customHashtag: e.target.value || undefined }))}
                    placeholder="#meinEvent"
                    className="px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-app-muted">Erscheint auf heruntergeladenen Fotos statt #gästefotos</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-app-fg">Overlay-Logo URL</label>
                  <Input
                    type="url"
                    value={featuresConfig.customOverlayLogoUrl || ''}
                    onChange={(e) => setFeaturesConfig((prev: any) => ({ ...prev, customOverlayLogoUrl: e.target.value || undefined }))}
                    placeholder="https://..."
                    className="px-4 py-3"
                  />
                  <p className="mt-1 text-xs text-app-muted">Eigenes Logo statt gästefotos.com auf geteilten Fotos</p>
                </div>
              </div>
            </div>
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
        <Icon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-red-500' : 'text-app-muted'}`} />
        <div className="flex-1 min-w-0">
          <span className={`block ${danger ? 'text-red-600' : 'text-app-fg'}`}>{label}</span>
          {value && (
            <span className="block text-xs text-app-muted truncate">{value}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-app-muted flex-shrink-0" />
    </>
  );

  const className = "flex items-center justify-between w-full px-4 py-4 border-b border-app-border/50 last:border-0 text-left hover:bg-app-bg transition-colors";

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
            className="w-full justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50"
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
