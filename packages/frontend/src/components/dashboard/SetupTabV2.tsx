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
  Save,
  Loader2,
  Check,
  X,
  Type,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { Event as EventType } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import { TitleContent, isTitleValid } from '@/components/setup-wizard/content';
import DateLocationContent from '@/components/setup-wizard/content/DateLocationContent';
import { CoHostsSection } from '@/components/dashboard/CoHostsSection';

type SetupSheet = 'title' | 'date-location' | 'design' | 'qr' | null;

interface SetupTabV2Props {
  event: EventType;
  eventId: string;
  onEventUpdate?: () => void;
}

export default function SetupTabV2({ event, eventId, onEventUpdate }: SetupTabV2Props) {
  const { showToast } = useToastStore();
  const [activeSheet, setActiveSheet] = useState<SetupSheet>(null);
  
  // Local state for editing
  const [title, setTitle] = useState(event.title || '');
  const [dateTime, setDateTime] = useState<Date | null>(
    event.dateTime ? new Date(event.dateTime) : null
  );
  const [location, setLocation] = useState((event as any).location || '');
  const [saving, setSaving] = useState(false);

  // Reset state when event changes
  useEffect(() => {
    setTitle(event.title || '');
    setDateTime(event.dateTime ? new Date(event.dateTime) : null);
    setLocation((event as any).location || '');
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
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
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
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </h3>
        </div>
        <SetupRow icon={Palette} label="Galerie-Design" link={`/events/${eventId}/design`} />
        <SetupRow icon={QrCode} label="QR-Code Designer" link={`/events/${eventId}/qr-styler`} />
        <SetupRow icon={Mail} label="Einladungen" link={`/events/${eventId}/invitations`} />
      </div>

      {/* Features Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </h3>
        </div>
        <SetupRow icon={Trophy} label="Challenges" link={`/events/${eventId}/challenges`} />
        <SetupRow icon={Users} label="Gästeliste" link={`/events/${eventId}/guests`} />
        <SetupRow icon={BookOpen} label="Kategorien" link={`/events/${eventId}/categories`} />
      </div>

      {/* Settings Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </h3>
        </div>
        <SetupRow icon={Wifi} label="WLAN für Gäste" link={`/events/${eventId}/wifi`} />
        <SetupRow icon={Eye} label="Erweiterte Optionen" link={`/events/${eventId}/edit`} />
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
            />
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
        <Icon className={`w-5 h-5 flex-shrink-0 ${danger ? 'text-red-500' : 'text-stone-400'}`} />
        <div className="flex-1 min-w-0">
          <span className={`block ${danger ? 'text-red-600' : 'text-stone-700'}`}>{label}</span>
          {value && (
            <span className="block text-xs text-stone-400 truncate">{value}</span>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-stone-400 flex-shrink-0" />
    </>
  );

  const className = "flex items-center justify-between w-full px-4 py-4 border-b border-stone-100 last:border-0 text-left hover:bg-stone-50 transition-colors";

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-500" />
          </button>
          <h3 className="font-semibold text-stone-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-white">
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
