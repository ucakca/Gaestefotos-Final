'use client';

import logger from '@/lib/logger';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api, { buildApiUrl } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { Event as EventType } from '@gaestefotos/shared';
import {
  Camera,
  Users,
  Clock,
  Settings,
  Share2,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  Home,
  Image as ImageIcon,
  BookOpen,
  Sparkles,
  Eye,
  Play,
  QrCode,
  Calendar,
  MapPin,
  CheckCircle2,
  Video,
  Star,
  Palette,
  Info,
  ScanFace,
  Rocket,
  Trophy,
  Mail,
  Copy,
  Loader2,
  UserPlus,
  Lock,
  Package,
  Zap,
  Plus,
  Upload,
  LayoutGrid,
  Gamepad2,
  FileText,
  Activity,
  Film,
  Wifi,
  TrendingUp,
  Download,
} from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { useRealtimePhotos } from '@/hooks/useRealtimePhotos';
import { AIFloatingButton } from '@/components/ai-chat';

import SetupTabV2 from '@/components/dashboard/SetupTabV2';
import GalleryTabV2 from '@/components/dashboard/GalleryTabV2';
import GuestbookTabV2 from '@/components/dashboard/GuestbookTabV2';
import HashtagWidget from '@/components/host-dashboard/HashtagWidget';
import { usePackageFeatures } from '@/hooks/usePackageFeatures';
import type { PackageInfo } from '@/hooks/usePackageFeatures';

type TabType = 'overview' | 'gallery' | 'guestbook' | 'setup';
type GalleryFilter = 'all' | 'photos' | 'videos' | 'albums' | 'guests' | 'challenges' | 'top' | 'pending' | 'trash' | 'hidden';

interface PhotoStats {
  total: number;
  photos: number;
  videos: number;
  approved: number;
  pending: number;
  rejected: number;
}

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  link?: string;
}

export default function EventDashboardV3Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { showToast } = useToastStore();
  
  const [eventId, setEventId] = React.useState<string | null>(null);
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showQRModal, setShowQRModal] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoStats, setPhotoStats] = useState<PhotoStats>({ total: 0, photos: 0, videos: 0, approved: 0, pending: 0, rejected: 0 });
  const [guestbookCount, setGuestbookCount] = useState(0);
  const [challengesCompleted, setChallengesCompleted] = useState(0);
  const [usage, setUsage] = useState<any | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Admin Notes
  const { user: authUser } = useAuthStore();
  const isAdmin = authUser?.role === 'ADMIN';
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [adminNotesSaving, setAdminNotesSaving] = useState(false);
  
  // Share Link
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  
  // Invitations
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  
  // Co-Hosts
  const [cohosts, setCohosts] = useState<any[]>([]);
  const [cohostsLoading, setCohostsLoading] = useState(false);
  const [mintingCohostInvite, setMintingCohostInvite] = useState(false);
  const [lastCohostInviteUrl, setLastCohostInviteUrl] = useState<string | null>(null);
  
  // Direct edit sheets from overview
  const [activeSheet, setActiveSheet] = useState<'title' | 'date-location' | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDateTime, setEditDateTime] = useState<Date | null>(null);
  const [editLocation, setEditLocation] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);

  // Package features (loaded via separate API)
  const { packageInfo, features: pkgFeatures, packageName: pkgName, tier: pkgTier, loading: pkgLoading } = usePackageFeatures(eventId);

  // Load event ID from params
  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, [params]);

  // Load event data
  useEffect(() => {
    if (eventId) loadEvent();
  }, [eventId]);

  // Load stats when event is loaded
  useEffect(() => {
    if (event) {
      loadStats();
      loadUsage();
      loadInvitations();
      loadCohosts();
    }
  }, [event]);

  // Load adminNotes from event
  useEffect(() => {
    if (event && isAdmin) {
      setAdminNotes((event as any).adminNotes || '');
    }
  }, [event, isAdmin]);

  const saveAdminNotes = async () => {
    if (!eventId) return;
    setAdminNotesSaving(true);
    try {
      await api.patch(`/events/${eventId}/admin-notes`, { adminNotes });
      showToast('Admin-Notizen gespeichert', 'success');
    } catch {
      showToast('Fehler beim Speichern', 'error');
    } finally {
      setAdminNotesSaving(false);
    }
  };

  // Realtime updates
  useRealtimePhotos({
    eventId: eventId || '',
    onRefreshNeeded: () => {
      loadStats();
    },
  });

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Event konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load unified media (photos + videos)
      const { data } = await api.get(`/events/${eventId}/media?status=all`);
      const loadedMedia = data.media || [];
      setPhotos(loadedMedia);
      
      const stats = data.stats || {};
      setPhotoStats({
        total: stats.total || loadedMedia.length,
        photos: stats.photos || loadedMedia.filter((m: any) => m.type === 'PHOTO').length,
        videos: stats.videos || loadedMedia.filter((m: any) => m.type === 'VIDEO').length,
        approved: stats.approved || 0,
        pending: stats.pending || 0,
        rejected: stats.rejected || 0,
      });
      
      // Count unique guests
      const uniqueGuests = new Set(loadedMedia.map((m: any) => m.uploadedBy || m.guestId).filter(Boolean));
      setGuestCount(uniqueGuests.size);
      
      // Load guestbook entries
      try {
        const guestbookRes = await api.get(`/events/${eventId}/guestbook`);
        setGuestbookCount(guestbookRes.data?.entries?.length || 0);
      } catch { setGuestbookCount(0); }
      
      // Load challenges - count unique participants (not total completions)
      try {
        const challengesRes = await api.get(`/events/${eventId}/challenges`);
        const challenges = challengesRes.data?.challenges || [];
        const uniqueParticipants = new Set<string>();
        challenges.forEach((c: any) => {
          (c.completions || []).forEach((comp: any) => {
            const key = comp.guestId || comp.uploaderName || 'anon';
            uniqueParticipants.add(key);
          });
        });
        setChallengesCompleted(uniqueParticipants.size);
      } catch { setChallengesCompleted(0); }
    } catch (err: any) {
      logger.error('Failed to load stats:', err);
    }
  };

  const loadUsage = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/usage`);
      setUsage(data);
    } catch (err: any) {
      logger.error('Failed to load usage:', err);
    }
  };

  const toggleEventActive = async () => {
    if (!event) return;
    const currentlyActive = (event as any).isActive !== false;
    try {
      await api.put(`/events/${eventId}`, { isActive: !currentlyActive });
      await loadEvent();
      showToast(currentlyActive ? 'Event deaktiviert' : 'Event aktiviert', 'success');
    } catch (err: any) {
      showToast('Fehler beim Ändern des Status', 'error');
    }
  };

  const copyToClipboard = async (text: string, message = 'Kopiert!') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(message);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      showToast('Kopieren fehlgeschlagen', 'error');
    }
  };

  // Generate Share Link
  const handleGenerateShareLink = async () => {
    try {
      setShareLoading(true);
      const { data } = await api.post(`/events/${eventId}/invite-token`);
      const url = data?.shareUrl;
      if (typeof url === 'string' && url.length > 0) {
        setShareUrl(url);
        await copyToClipboard(url, 'Share-Link kopiert!');
      }
    } catch (err: any) {
      showToast('Fehler beim Erzeugen des Share-Links', 'error');
    } finally {
      setShareLoading(false);
    }
  };

  // Load Invitations
  const loadInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const { data } = await api.get(`/events/${eventId}/invitations`);
      setInvitations(Array.isArray(data?.invitations) ? data.invitations : []);
    } catch (err: any) {
      logger.error('Failed to load invitations:', err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  // Load Co-Hosts
  const loadCohosts = async () => {
    try {
      setCohostsLoading(true);
      const { data } = await api.get(`/events/${eventId}/cohosts`);
      setCohosts(Array.isArray(data?.cohosts) ? data.cohosts : []);
    } catch (err: any) {
      logger.error('Failed to load cohosts:', err);
    } finally {
      setCohostsLoading(false);
    }
  };

  // Mint Co-Host Invite
  const mintCohostInvite = async () => {
    try {
      setMintingCohostInvite(true);
      const { data } = await api.post(`/events/${eventId}/cohosts/invite-token`);
      const shareUrl = data?.shareUrl || null;
      setLastCohostInviteUrl(shareUrl);
      if (shareUrl) {
        await copyToClipboard(shareUrl, 'Co-Host Invite-Link kopiert!');
      }
      showToast('Invite-Link erstellt', 'success');
    } catch (err: any) {
      showToast('Fehler beim Erstellen des Invite-Links', 'error');
    } finally {
      setMintingCohostInvite(false);
    }
  };

  // Calculate onboarding steps
  const getOnboardingSteps = (): OnboardingStep[] => {
    if (!event) return [];
    
    const designConfig = (event.designConfig as any) || {};
    const qrConfig = ((event as any).qrConfig) || {};
    
    // Check if user came from wizard (created=true in URL)
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const justCreated = searchParams?.get('created') === 'true';
    
    const titleCompleted = Boolean(event.title && event.title !== 'Neues Event');
    const dateCompleted = Boolean(event.dateTime);
    const designCompleted = Boolean(designConfig.profileImage || designConfig.coverImage || (event as any).profileImageUrl || (event as any).coverImageUrl);
    // QR is completed if config exists or user just finished wizard
    const qrCompleted = Boolean(qrConfig.templateSlug || justCreated);
    // Share is completed if user just finished wizard
    const shareCompleted = justCreated;
    
    // Find first incomplete step
    const steps = [
      { id: 'title', completed: titleCompleted },
      { id: 'date', completed: dateCompleted },
      { id: 'design', completed: designCompleted },
      { id: 'qr', completed: qrCompleted },
      { id: 'share', completed: shareCompleted },
    ];
    const firstIncomplete = steps.find(s => !s.completed)?.id || null;
    
    return [
      {
        id: 'title',
        label: 'Event-Titel festlegen',
        completed: titleCompleted,
        current: firstIncomplete === 'title',
        link: `/events/${eventId}/edit`,
      },
      {
        id: 'date',
        label: 'Datum & Ort hinzufügen',
        completed: dateCompleted,
        current: firstIncomplete === 'date',
        link: `/events/${eventId}/edit`,
      },
      {
        id: 'design',
        label: 'Design anpassen',
        completed: designCompleted,
        current: firstIncomplete === 'design',
        link: `/events/${eventId}/design?wizard=1`,
      },
      {
        id: 'qr',
        label: 'QR-Code erstellen',
        completed: qrCompleted,
        current: firstIncomplete === 'qr',
        link: `/events/${eventId}/qr-styler`,
      },
      {
        id: 'share',
        label: 'Event teilen',
        completed: shareCompleted,
        current: firstIncomplete === 'share',
      },
    ];
  };

  const onboardingSteps = getOnboardingSteps();
  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const storageUsed = usage?.used || 0;

  if (loading) {
    return <FullPageLoader label="Lade Dashboard..." />;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">Event nicht gefunden</h2>
          <p className="text-muted-foreground mb-4">{error || 'Das Event konnte nicht geladen werden.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    );
  }

  const designConfig = (event.designConfig as any) || {};
  const eventDate = event.dateTime 
    ? new Date(event.dateTime).toLocaleDateString('de-DE', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    : null;

  const tabs = [
    { id: 'overview' as TabType, label: 'Übersicht', icon: Home },
    { id: 'gallery' as TabType, label: 'Galerie', icon: ImageIcon },
    { id: 'guestbook' as TabType, label: 'Gästebuch', icon: BookOpen },
    { id: 'setup' as TabType, label: 'Setup', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 -ml-2 rounded-lg hover:bg-background transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-foreground truncate">{event.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`w-2 h-2 rounded-full ${(event as any).isActive !== false ? 'bg-success/100' : 'bg-destructive/100'}`} />
                <span>{(event as any).isActive !== false ? 'Live' : 'Gesperrt'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href={event?.slug ? `/e3/${event.slug}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-background transition-colors"
              title="Gästevorschau öffnen"
            >
              <Eye className="w-5 h-5 text-muted-foreground" />
            </a>
            <button 
              onClick={() => setShowQRModal(true)}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab
              key="overview"
              event={event}
              eventDate={eventDate}
              designConfig={designConfig}
              stats={{
                photos: photoStats.photos,
                videos: photoStats.videos,
                guestbook: guestbookCount,
                challenges: challengesCompleted,
                pending: photoStats.pending,
                guests: guestCount,
                visitors: (event as any)?.visitCount || 0,
              }}
              storageUsed={storageUsed}
              storageLimit={usage?.limit || 0}
              recentPhotos={photos.filter((p: any) => p.status === 'APPROVED').slice(0, 6)}
              onStatClick={(filter) => {
                setGalleryFilter(filter);
                setActiveTab('gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onboardingSteps={onboardingSteps}
              completedSteps={completedSteps}
              totalSteps={totalSteps}
              progressPercent={progressPercent}
              onToggleActive={toggleEventActive}
              onCopy={copyToClipboard}
              onGenerateShareLink={handleGenerateShareLink}
              shareUrl={shareUrl}
              shareLoading={shareLoading}
              invitations={invitations}
              cohosts={cohosts}
              onMintCohostInvite={mintCohostInvite}
              mintingCohostInvite={mintingCohostInvite}
              eventId={eventId || ''}
              packageInfo={packageInfo}
              onGoToSetup={() => {
                setActiveTab('setup');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onGoToGuestbook={() => {
                setActiveTab('guestbook');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenSheet={(sheetId) => {
                if (sheetId === 'title') {
                  setEditTitle(event.title || '');
                } else {
                  setEditDateTime(event.dateTime ? new Date(event.dateTime) : null);
                  setEditLocation((event as any).location || '');
                }
                setActiveSheet(sheetId);
              }}
            />
          )}
          {/* Admin-only: Internal Notes */}
          {activeTab === 'overview' && isAdmin && (
            <div className="mx-4 mb-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Admin-Notizen (intern)</span>
              </div>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Interne Notizen zu diesem Event (nur für Admins sichtbar)..."
                rows={3}
                className="w-full text-sm bg-white dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button
                onClick={saveAdminNotes}
                disabled={adminNotesSaving}
                className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white transition-colors"
              >
                {adminNotesSaving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          )}

          {activeTab === 'gallery' && (
            <GalleryTabV2
              key="gallery"
              photos={photos}
              filter={galleryFilter}
              onFilterChange={setGalleryFilter}
              pendingCount={photoStats.pending}
              eventId={eventId || ''}
              onPhotosChanged={loadStats}
            />
          )}
          {activeTab === 'guestbook' && (
            <GuestbookTabV2
              key="guestbook"
              eventId={eventId || ''}
              hostMessage={(event as any)?.guestbookHostMessage}
            />
          )}
          {activeTab === 'setup' && (
            <SetupTabV2 key="setup" event={event} eventId={eventId || ''} onEventUpdate={loadEvent} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'text-blue-600' 
                  : 'text-muted-foreground hover:text-muted-foreground'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-4">QR-Code</h3>
                <div className="bg-white rounded-xl p-6 mb-4">
                  <QRCodeSVG
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/e3/${event?.slug || ''}`}
                    size={192}
                    level="M"
                    className="mx-auto"
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-1 font-mono break-all select-all">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/e3/{event?.slug}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Scanne diesen Code um Fotos hochzuladen
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/events/${eventId}/qr-styler`}
                    className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors text-center"
                  >
                    QR Designer
                  </Link>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="py-2 px-4 bg-background text-foreground rounded-lg font-medium hover:bg-border transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Feedback Toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-foreground text-white rounded-full text-sm font-medium shadow-lg"
          >
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* KI-Assistent Floating Button */}
      <AIFloatingButton />

      {/* Direct Edit Sheets from Overview */}
      <AnimatePresence>
        {activeSheet === 'title' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setActiveSheet(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <button onClick={() => setActiveSheet(null)} className="p-2 -ml-2 rounded-lg hover:bg-background transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <h3 className="font-semibold text-foreground">Event-Titel</h3>
                <div className="w-9" />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="relative">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="z.B. Mein Event"
                    className="w-full px-4 py-4 text-lg border-2 border-border bg-card text-foreground rounded-2xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {editTitle.length}/50
                  </span>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4">Der Titel wird auf der Event-Seite angezeigt</p>
              </div>
              <div className="p-4 border-t border-border bg-card">
                <button
                  onClick={async () => {
                    if (editTitle.trim().length < 3) return;
                    setSavingSheet(true);
                    try {
                      await api.put(`/events/${eventId}`, { title: editTitle });
                      showToast('Titel gespeichert', 'success');
                      loadEvent();
                      setActiveSheet(null);
                    } catch (err: any) {
                      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
                    } finally {
                      setSavingSheet(false);
                    }
                  }}
                  disabled={editTitle.trim().length < 3 || savingSheet}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Speichern
                </button>
              </div>
            </motion.div>
          </>
        )}
        {activeSheet === 'date-location' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setActiveSheet(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                <button onClick={() => setActiveSheet(null)} className="p-2 -ml-2 rounded-lg hover:bg-background transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                <h3 className="font-semibold text-foreground">Datum & Ort</h3>
                <div className="w-9" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    Datum & Uhrzeit
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime ? `${editDateTime.getFullYear()}-${String(editDateTime.getMonth() + 1).padStart(2, '0')}-${String(editDateTime.getDate()).padStart(2, '0')}T${String(editDateTime.getHours()).padStart(2, '0')}:${String(editDateTime.getMinutes()).padStart(2, '0')}` : ''}
                    onChange={(e) => e.target.value ? setEditDateTime(new Date(e.target.value)) : setEditDateTime(null)}
                    className="w-full px-4 py-3 border-2 border-border bg-card text-foreground rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <MapPin className="w-4 h-4" />
                    Ort / Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="z.B. Schloss Neuschwanstein"
                    className="w-full px-4 py-3 border-2 border-border bg-card text-foreground rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-border bg-card">
                <button
                  onClick={async () => {
                    setSavingSheet(true);
                    try {
                      await api.put(`/events/${eventId}`, { 
                        dateTime: editDateTime?.toISOString() || null,
                        location: editLocation || null,
                      });
                      showToast('Datum & Ort gespeichert', 'success');
                      loadEvent();
                      setActiveSheet(null);
                    } catch (err: any) {
                      showToast(err.response?.data?.error || 'Fehler beim Speichern', 'error');
                    } finally {
                      setSavingSheet(false);
                    }
                  }}
                  disabled={savingSheet}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingSheet ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Speichern
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({
  event,
  eventDate,
  designConfig,
  stats,
  storageUsed,
  storageLimit,
  recentPhotos,
  onStatClick,
  onboardingSteps,
  completedSteps,
  totalSteps,
  progressPercent,
  onToggleActive,
  onCopy,
  onGenerateShareLink,
  shareUrl,
  shareLoading,
  invitations,
  cohosts,
  onMintCohostInvite,
  mintingCohostInvite,
  eventId,
  onGoToSetup,
  onOpenSheet,
  onGoToGuestbook,
  packageInfo,
}: {
  event: EventType;
  eventDate: string | null;
  designConfig: any;
  stats: { photos: number; videos: number; guestbook: number; challenges: number; pending: number; guests: number; visitors?: number };
  storageUsed: number;
  storageLimit: number;
  recentPhotos: any[];
  onStatClick: (filter: GalleryFilter) => void;
  onboardingSteps: OnboardingStep[];
  completedSteps: number;
  totalSteps: number;
  progressPercent: number;
  onToggleActive: () => void;
  onCopy: (text: string, msg?: string) => void;
  onGenerateShareLink: () => void;
  shareUrl: string | null;
  shareLoading: boolean;
  invitations: any[];
  cohosts: any[];
  onMintCohostInvite: () => void;
  mintingCohostInvite: boolean;
  eventId: string;
  packageInfo: PackageInfo;
  onGoToSetup: () => void;
  onOpenSheet?: (sheetId: 'title' | 'date-location') => void;
  onGoToGuestbook?: () => void;
}) {
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(completedSteps < totalSteps); // Open until complete
  const currentStep = onboardingSteps.find(s => s.current);
  const [liveStats, setLiveStats] = useState<{ todayCount: number; topUploaders: { name: string; count: number }[]; lastPhotoAt: string | null } | null>(null);
  const [trends, setTrends] = useState<{ date: string; total: number }[]>([]);
  const [guestStats, setGuestStats] = useState<{ total: number; accepted: number; declined: number; pending: number; withEmail: number; plusOnes: number; totalWithPlusOnes?: number } | null>(null);
  const [recentActivity, setRecentActivity] = useState<{ type: string; name: string; at: string }[]>([]);
  const [commentsPending, setCommentsPending] = useState(0);

  useEffect(() => {
    if (!eventId) return;
    api.get(`/events/${eventId}/photos/live-stats`)
      .then(r => setLiveStats(r.data))
      .catch(() => {});
    api.get(`/events/${eventId}/trends?days=7`)
      .then(r => setTrends(r.data.trends || []))
      .catch(() => {});
    api.get(`/events/${eventId}/guests/stats`)
      .then(r => setGuestStats(r.data))
      .catch(() => {});
    api.get(`/events/${eventId}/activity?limit=5`)
      .then(r => setRecentActivity(r.data?.activity || []))
      .catch(() => {});
    api.get(`/events/${eventId}/comments?status=PENDING&limit=1`)
      .then(r => setCommentsPending(r.data?.total || 0))
      .catch(() => {});

    // Polling alle 30s fuer pendingCount
    const poll = setInterval(() => {
      api.get(`/events/${eventId}/photos/pending-count`)
        .then(r => { /* stats update via parent */ })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(poll);
  }, [eventId, stats.photos]);
  
  // Determine event status for hero card color
  const isActive = (event as any).isActive !== false;
  const eventDateTime = event.dateTime ? new Date(event.dateTime) : null;
  const isLive = isActive && eventDateTime && eventDateTime >= new Date(new Date().setHours(0,0,0,0));
  const heroGradient = isLive 
    ? 'from-emerald-500 to-green-600' 
    : 'from-amber-500 to-orange-600';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4 space-y-4"
    >
      {/* Hero Card */}
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${heroGradient} text-white p-5`}>
        {(designConfig.coverImage || (event as any).coverImageUrl) && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${designConfig.coverImage || (event as any).coverImageUrl})` }}
          />
        )}
        <div className="relative z-10">
          <div className="flex items-start gap-3">
            {/* Profile Image */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-xl bg-card/20 backdrop-blur-sm overflow-hidden flex items-center justify-center border-2 border-white/30">
                {(designConfig.profileImage || (event as any).profileImageUrl) ? (
                  <img src={designConfig.profileImage || (event as any).profileImageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-white/60" />
                )}
              </div>
              <Link
                href={`/events/${eventId}/design?wizard=1`}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
              >
                <Upload className="w-5 h-5 text-white" />
              </Link>
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{event.title}</h2>
              {eventDate && (
                <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                  <Calendar className="w-4 h-4" />
                  {eventDate}
                </p>
              )}
              {(event as any).location && (
                <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                  <MapPin className="w-4 h-4" />
                  {(event as any).location}
                </p>
              )}
              {(event as any).wifiName && (
                <p className="text-white/80 text-sm flex items-center gap-1 mt-0.5">
                  <Wifi className="w-4 h-4" />
                  {(event as any).wifiName}{(event as any).wifiPassword ? ` · ${(event as any).wifiPassword}` : ''}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <Link
                href={`/e3/${event.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-full bg-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-card/30 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Vorschau
              </Link>
              <Link
                href={`/events/${eventId}/design?wizard=1`}
                className="px-3 py-1.5 rounded-full bg-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-card/30 transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
                Design
              </Link>
              <button
                onClick={() => {
                  const url = `/api/events/${eventId}/export`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `event-export-${event.slug}.json`;
                  a.click();
                }}
                className="px-3 py-1.5 rounded-full bg-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-card/30 transition-colors"
              >
                <Film className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={async () => {
                  const url = buildApiUrl(`/events/${eventId}/photos/download-zip`);
                  const a = document.createElement('a');
                  a.href = url;
                  a.target = '_blank';
                  a.click();
                }}
                className="px-3 py-1.5 rounded-full bg-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-card/30 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                ZIP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={Camera} value={stats.photos} label="FOTOS" color="blue" onClick={() => onStatClick('photos')} />
        <StatCard icon={Video} value={stats.videos} label="VIDEOS" color="purple" onClick={() => onStatClick('videos')} />
        {typeof stats.visitors === 'number'
          ? <StatCard icon={Eye} value={stats.visitors} label="BESUCHER" color="cyan" />
          : <StatCard icon={Users} value={stats.guests} label="GÄSTE" color="cyan" onClick={() => onStatClick('guests')} />}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={BookOpen} value={stats.guestbook} label="GÄSTEBUCH" color="green" onClick={onGoToGuestbook} />
        <StatCard icon={Trophy} value={stats.challenges} label="FOTO-SPIELE" color="purple" onClick={() => onStatClick('challenges')} />
        <StatCard icon={Clock} value={stats.pending} label="AUSSTEHEND" color="yellow" highlight={stats.pending > 0} onClick={() => onStatClick('pending')} />
      </div>

      {/* Live Stats — Fotos heute + Top Uploader */}
      {liveStats && (liveStats.todayCount > 0 || liveStats.topUploaders.length > 0) && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              Live-Aktivität
            </h3>
            {liveStats.lastPhotoAt && (
              <span className="text-[11px] text-muted-foreground">
                Zuletzt: {new Date(liveStats.lastPhotoAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{liveStats.todayCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fotos heute</p>
            </div>
            {liveStats.topUploaders.length > 0 && (
              <div className="flex-2 space-y-1">
                {liveStats.topUploaders.slice(0, 3).map((u, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] w-4 text-muted-foreground font-mono">#{i + 1}</span>
                    <div className="flex-1 bg-border/50 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.round((u.count / liveStats.topUploaders[0].count) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-foreground font-medium w-16 truncate">{u.name}</span>
                    <span className="text-[11px] text-muted-foreground w-6 text-right">{u.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gäste-Stats Widget */}
      {guestStats && guestStats.total > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Gäste-Übersicht
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-xl font-bold text-green-500">{guestStats.accepted}</p>
              <p className="text-[10px] text-muted-foreground">Zusagen</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-500">{guestStats.declined}</p>
              <p className="text-[10px] text-muted-foreground">Absagen</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-yellow-500">{guestStats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Ausstehend</p>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border">
            <span>{guestStats.withEmail} mit E-Mail</span>
            {guestStats.plusOnes > 0 && <span>+{guestStats.plusOnes} Begl.</span>}
            <span className="font-medium">Σ {guestStats.total}</span>
          </div>
        </div>
      )}

      {/* Letzte Aktivitäten */}
      {recentActivity.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Letzte Aktivitäten
          </p>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-base">{a.type === 'photo_upload' ? '📸' : '👤'}</span>
                <span className="text-foreground flex-1 truncate">{a.name}</span>
                <span className="text-muted-foreground shrink-0">{new Date(a.at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend-Sparkline letzten 7 Tage */}
      {trends.length > 0 && trends.some(t => t.total > 0) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Fotos letzte 7 Tage
          </p>
          <div className="flex items-end gap-1 h-12">
            {(() => {
              const max = Math.max(...trends.map(t => t.total), 1);
              return trends.map((t, i) => (
                <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${t.total > 0 ? 'bg-primary/70' : 'bg-muted'}`}
                    style={{ height: `${Math.max(2, (t.total / max) * 100)}%` }}
                  />
                  {i % 2 === 0 && (
                    <span className="text-[9px] text-muted-foreground/60">
                      {new Date(t.date).getDate()}
                    </span>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Quick Actions — Briefing + AI */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/events/${eventId}/briefing`}
          className="group flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-200/50 hover:border-violet-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Event-Briefing</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Infos für AI-Personalisierung</p>
          </div>
        </Link>
        <Link
          href={`/events/${eventId}/booth-games`}
          className="group flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/5 border border-pink-200/50 hover:border-pink-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">KI-Spiele</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Roast, Bingo, DJ & mehr</p>
          </div>
        </Link>
      </div>

      {/* Recent Uploads Preview */}
      {recentPhotos.length > 0 && (
        <button
          onClick={() => onStatClick('all')}
          className="w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-all text-left"
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Letzte Uploads</span>
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">Alle anzeigen <ChevronRight className="w-3 h-3" /></span>
          </div>
          <div className="grid grid-cols-6 gap-0.5 p-0.5">
            {recentPhotos.map((p: any) => (
              <div key={p.id} className="aspect-square bg-border overflow-hidden">
                <img src={p.thumbnailUrl || p.url || '/placeholder.jpg'} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </button>
      )}

      {/* Storage Usage */}
      {storageLimit > 0 && (
        <div className="rounded-2xl border border-border bg-card shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Speicher</span>
            <span className="text-xs text-muted-foreground">
              {formatBytesCompact(storageUsed)} / {formatBytesCompact(storageLimit)}
            </span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${storageUsed / storageLimit > 0.9 ? 'bg-red-500' : storageUsed / storageLimit > 0.7 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (storageUsed / storageLimit) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Theme Preview */}
      {(event as any)?.theme && (
        <Link
          href={`/events/${eventId}/design`}
          className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex gap-1 shrink-0">
            {['primary', 'secondary', 'accent'].map((key) => (
              <div
                key={key}
                className="w-8 h-8 rounded-lg border border-border"
                style={{ backgroundColor: ((event as any).theme.colors as any)?.[key] || '#ccc' }}
              />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground text-sm truncate">{(event as any).theme.name}</div>
            <div className="text-xs text-muted-foreground">Event Theme · {(event as any).theme.wallLayout}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Link>
      )}

      {/* Onboarding Progress */}
      {progressPercent < 100 && (
        <div className="group relative rounded-2xl overflow-hidden">
          {/* Gradient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-warning/20 via-orange-500/10 to-amber-500/5 rounded-2xl" />
          <div className="relative border border-warning/20 rounded-2xl p-5 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning to-orange-500 flex items-center justify-center shadow-md shadow-warning/30">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-foreground">Event einrichten</span>
                  <span className="text-xs font-bold text-warning bg-warning/15 px-2 py-0.5 rounded-full">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-card rounded-full overflow-hidden border border-border">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-warning to-orange-500 rounded-full"
                  />
                </div>
              </div>
            </div>
            {currentStep && currentStep.link && (
              <Link
                href={currentStep.link}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-card/80 border border-warning/20 hover:border-warning/40 hover:shadow-md transition-all group/step"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-warning to-orange-500 text-white flex items-center justify-center shadow-sm group-hover/step:scale-110 transition-transform">
                  <ChevronRight className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-foreground text-sm">Nächster Schritt</div>
                  <div className="text-xs text-muted-foreground">{currentStep.label}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover/step:translate-x-1 group-hover/step:text-warning transition-all" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* All Steps - Collapsible */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAllSteps(!showAllSteps)}
          className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Setup-Checkliste</h3>
              <p className="text-xs text-muted-foreground">{completedSteps}/{totalSteps} abgeschlossen</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${showAllSteps ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showAllSteps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-1.5">
                {onboardingSteps.map((step, index) => {
                  const content = (
                    <>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        step.completed
                          ? 'bg-gradient-to-br from-success to-emerald-500 text-white shadow-sm shadow-success/30'
                          : step.current
                            ? 'bg-gradient-to-br from-warning to-orange-500 text-white shadow-sm shadow-warning/30'
                            : 'bg-muted/60 text-muted-foreground'
                      }`}>
                        {step.completed ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-sm flex-1 ${
                        step.completed ? 'text-success line-through decoration-success/30' : step.current ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {step.label}
                      </span>
                      {step.current && (
                        <ChevronRight className="w-4 h-4 text-warning" />
                      )}
                      {step.completed && (
                        <span className="text-[10px] text-success/70 font-medium">✓</span>
                      )}
                    </>
                  );

                  const className = `flex items-center gap-3 p-3 rounded-xl transition-all ${
                    step.completed ? 'bg-success/5 hover:bg-success/10' : step.current ? 'bg-warning/10 border border-warning/20' : 'hover:bg-muted/30'
                  }`;

                  return (
                    <Link
                      key={step.id}
                      href={step.link || `#`}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Event Status */}
      <EventStatusCard event={event} onToggleActive={onToggleActive} showInfo={showStatusInfo} setShowInfo={setShowStatusInfo} />

      {/* Quick Actions */}
      {(() => {
        const pf = packageInfo?.features || {};
        const tier = packageInfo?.tier || 'FREE';
        const quickActions = [
          { label: 'Event Wall', sub: 'Slideshow starten', icon: Play, href: `/events/${eventId}/live-wall`, gradient: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/20', featureKey: 'liveWall' as const },
          { label: 'Mosaic Wall', sub: 'Foto-Mosaik', icon: LayoutGrid, href: `/events/${eventId}/mosaic`, gradient: 'from-pink-500 to-rose-600', shadow: 'shadow-pink-500/20', featureKey: 'mosaicWall' as const },
          { label: 'KI-Kunst', sub: 'AI Style Transfer', icon: Sparkles, href: `/events/${eventId}/ki-booth`, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', featureKey: 'aiEffects' as const },
          { label: 'Foto-Spiele', sub: 'Face Switch & mehr', icon: Gamepad2, href: `/events/${eventId}/booth-games`, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', featureKey: 'boothGames' as const },
          { label: 'Live-Analytics', sub: 'Echtzeit-Statistiken', icon: Activity, href: `/events/${eventId}/live-analytics`, gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/20', featureKey: null },
          { label: 'QR-Designer', sub: 'Print-Ready QR-Code', icon: QrCode, href: `/events/${eventId}/qr-styler`, gradient: 'from-gray-600 to-gray-800', shadow: 'shadow-gray-500/20', featureKey: null },
          { label: 'Paket', sub: 'Upgrade & Wechsel', icon: Package, href: `/events/${eventId}/package`, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', featureKey: null },
        ];
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onGenerateShareLink}
              disabled={shareLoading}
              className="group flex items-center gap-3 rounded-2xl bg-card border border-border p-4 text-left disabled:opacity-50 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-110 transition-transform">
                {shareLoading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Share2 className="w-5 h-5 text-white" />}
              </div>
              <div>
                <div className="font-medium text-foreground text-sm">Share</div>
                <div className="text-xs text-muted-foreground">{shareUrl ? 'Erneut kopieren' : 'Link erzeugen'}</div>
              </div>
            </button>
            {quickActions.map(qa => {
              const isLocked = qa.featureKey ? !pf[qa.featureKey] : false;
              const Icon = qa.icon;
              if (isLocked) {
                return (
                  <Link
                    key={qa.label}
                    href={`/events/${eventId}/package`}
                    className="group relative flex items-center gap-3 rounded-2xl bg-card border border-border p-4 opacity-60 hover:opacity-80 transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${qa.gradient} flex items-center justify-center shadow-sm ${qa.shadow} grayscale`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground text-sm flex items-center gap-1.5">
                        {qa.label}
                        <Lock className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground">Upgrade erforderlich</div>
                    </div>
                    <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                      UPGRADE
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={qa.label}
                  href={qa.href}
                  className="group flex items-center gap-3 rounded-2xl bg-card border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${qa.gradient} flex items-center justify-center shadow-sm ${qa.shadow} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">{qa.label}</div>
                    <div className="text-xs text-muted-foreground">{qa.sub}</div>
                  </div>
                </Link>
              );
            })}
            <HighlightReelButton eventId={eventId} />
          </div>
        );
      })()}

      {/* Paket & Upsell */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                {packageInfo?.packageName || 'Free'}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase">
                  {packageInfo?.tier || 'FREE'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(packageInfo as any)?.activeAddons?.length > 0
                  ? `+ ${(packageInfo as any).activeAddons.map((a: any) => a.name).join(', ')}`
                  : 'Aktuelles Paket'}
              </div>
            </div>
          </div>
          <Link
            href={`/events/${eventId}/package`}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center gap-1 hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            Upgrade
          </Link>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2">
          {(() => {
            const pf = packageInfo?.features || {};
            return [
              { label: 'Live Wall', icon: Play, enabled: Boolean(pf.liveWall) },
              { label: 'Video', icon: Video, enabled: Boolean(pf.videoUpload) },
              { label: 'Mosaic', icon: LayoutGrid, enabled: Boolean(pf.mosaicWall) },
              { label: 'KI-Effekte', icon: Sparkles, enabled: Boolean(pf.aiEffects) },
              { label: 'Werbefrei', icon: Star, enabled: Boolean(pf.adFree) },
              { label: 'Co-Hosts', icon: Users, enabled: Boolean(pf.coHosts) },
              { label: 'Gästebuch', icon: BookOpen, enabled: Boolean(pf.guestbook) },
              { label: 'Face Search', icon: ScanFace, enabled: Boolean(pf.faceSearch) },
              { label: 'Slideshow', icon: Play, enabled: Boolean(pf.slideshow) },
            ].map(f => (
              <div key={f.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                f.enabled ? 'bg-success/10 text-success border border-success/30' : 'bg-muted/50 text-muted-foreground/70 border border-border'
              }`}>
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
                {!f.enabled && <Lock className="w-3 h-3 ml-auto" />}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Hashtag — Always FREE */}
      <HashtagWidget eventId={eventId} onCopy={onCopy} />

      {/* Share URL Display */}
      {shareUrl && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-blue-600 truncate flex-1 font-mono">{shareUrl}</p>
            <button
              onClick={() => onCopy(shareUrl, 'Link kopiert!')}
              className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <Copy className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        </div>
      )}

      {/* Invitations Overview */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
              <Mail className="w-4 h-4 text-success" />
            </div>
            <div>
              <h3 className="font-medium text-foreground flex items-center gap-1.5">
                Einladungen
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">COMING SOON</span>
              </h3>
              <p className="text-xs text-muted-foreground">{invitations.length} erstellt</p>
            </div>
          </div>
          <Link
            href={`/events/${eventId}/invitations`}
            className="text-xs text-blue-600 font-medium flex items-center gap-1"
          >
            Verwalten <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {invitations.length > 0 ? (
          <div className="divide-y divide-border">
            {invitations.slice(0, 3).map((inv: any) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-foreground">{inv.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.opens || 0} Aufrufe • RSVP: {inv?.rsvp?.yes || 0}/{inv?.rsvp?.no || 0}/{inv?.rsvp?.maybe || 0}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${inv.isActive !== false ? 'bg-success/100' : 'bg-border'}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Noch keine Einladungen erstellt
          </div>
        )}
      </div>

      {/* Co-Hosts Overview */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-foreground">Co-Hosts</h3>
              <p className="text-xs text-muted-foreground">{cohosts.length} Mitverwalter</p>
            </div>
          </div>
          <button
            onClick={onMintCohostInvite}
            disabled={mintingCohostInvite}
            className="text-xs bg-purple-100 text-purple-600 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
          >
            {mintingCohostInvite ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Einladen
          </button>
        </div>
        {cohosts.length > 0 ? (
          <div className="divide-y divide-border">
            {cohosts.map((cohost: any) => (
              <div key={cohost.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-muted-foreground text-xs font-medium">
                  {cohost.user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-foreground truncate">{cohost.user?.email || 'Unbekannt'}</div>
                  <div className="text-xs text-muted-foreground">Co-Host</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Noch keine Co-Hosts eingeladen
          </div>
        )}
      </div>
    </motion.div>
  );
}

// GalleryTab removed — now using GalleryTabV2 component

// GuestbookTab removed — now using GuestbookTabV2 component

// SetupTab removed — now using SetupTabV2 component

// ============ HELPER COMPONENTS ============

function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function StatCard({ icon: Icon, value, label, color, highlight, onClick }: {
  icon: any;
  value: number | string;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';
  highlight?: boolean;
  onClick?: () => void;
}) {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      icon: 'text-blue-500',
      text: 'text-foreground',
    },
    green: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-500',
      text: 'text-foreground',
    },
    yellow: {
      bg: 'bg-amber-500/10',
      border: highlight ? 'border-amber-500/50 border-2' : 'border-amber-500/20',
      icon: 'text-amber-500',
      text: 'text-foreground',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      icon: 'text-purple-500',
      text: 'text-foreground',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      icon: 'text-cyan-500',
      text: 'text-foreground',
    },
  };
  
  const styles = colorStyles[color];
  
  return (
    <button 
      onClick={onClick}
      className={`rounded-2xl p-3 ${styles.bg} border ${styles.border} transition-all hover:shadow-md ${onClick ? 'cursor-pointer active:scale-95' : ''} text-left w-full`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${styles.icon}`} />
      </div>
      <div className={`text-2xl font-bold ${styles.text}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground font-medium tracking-wide">{label}</div>
    </button>
  );
}

function SetupRow({ icon: Icon, label, danger, link }: {
  icon: any;
  label: string;
  danger?: boolean;
  link?: string;
}) {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className={danger ? 'text-destructive' : 'text-foreground'}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </>
  );

  if (link) {
    return (
      <Link href={link} className="flex items-center justify-between w-full px-4 py-4 border-b border-border last:border-0 text-left hover:bg-background transition-colors">
        {content}
      </Link>
    );
  }

  return (
    <button className="flex items-center justify-between w-full px-4 py-4 border-b border-border last:border-0 text-left hover:bg-background transition-colors">
      {content}
    </button>
  );
}

function HighlightReelButton({ eventId }: { eventId: string }) {
  const [generating, setGenerating] = useState(false);
  const [reelUrl, setReelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToastStore();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post(`/events/${eventId}/generate`, {
        duration: 3,
        maxPhotos: 20,
        resolution: '1080p',
        transition: 'fade',
      });
      showToast('Video-Generierung gestartet! Dies kann einige Minuten dauern.', 'success');

      // Poll for completion
      const jobId = res.data.jobId;
      const poll = setInterval(async () => {
        try {
          const progress = await api.get(`/events/${eventId}/progress/${jobId}`);
          if (progress.data.status === 'complete') {
            clearInterval(poll);
            // Fetch list to get URL
            const list = await api.get(`/events/${eventId}`);
            if (list.data.reels?.length > 0) {
              setReelUrl(list.data.reels[0]);
            }
            setGenerating(false);
            showToast('Highlight Reel fertig!', 'success');
          } else if (progress.data.status === 'error') {
            clearInterval(poll);
            setGenerating(false);
            setError(progress.data.message);
            showToast(progress.data.message || 'Fehler', 'error');
          }
        } catch {
          // Keep polling
        }
      }, 3000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(poll);
        if (generating) setGenerating(false);
      }, 300000);
    } catch (err: any) {
      setGenerating(false);
      setError(err.response?.data?.error || 'Fehler beim Starten');
      showToast('Fehler beim Generieren des Videos', 'error');
    }
  };

  // Check for existing reels on mount
  useEffect(() => {
    api.get(`/events/${eventId}`)
      .then(res => {
        if (res.data.reels?.length > 0) {
          setReelUrl(res.data.reels[0]);
        }
      })
      .catch(() => {});
  }, [eventId]);

  return (
    <button
      onClick={reelUrl ? () => window.open(reelUrl, '_blank') : handleGenerate}
      disabled={generating}
      className="flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-left disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm text-rose-500">
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Film className="w-5 h-5" />}
      </div>
      <div>
        <div className="font-medium text-foreground">Highlight Reel</div>
        <div className="text-xs text-muted-foreground">
          {generating ? 'Wird erstellt...' : reelUrl ? 'Video ansehen' : 'Video erstellen'}
        </div>
      </div>
    </button>
  );
}

function EventStatusCard({ 
  event, 
  onToggleActive, 
  showInfo, 
  setShowInfo 
}: { 
  event: EventType; 
  onToggleActive: () => void;
  showInfo: boolean;
  setShowInfo: (show: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${(event as any).isActive !== false ? 'bg-success/100' : 'bg-destructive/100'}`} />
            <span className="font-semibold text-foreground">Event Status</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={(event as any).isActive !== false} 
              onChange={onToggleActive}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success/100"></div>
          </label>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-6">
          <p className="text-sm text-muted-foreground">
            {(event as any).isActive !== false ? 'Gäste können Fotos hochladen' : 'Event ist deaktiviert'}
          </p>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full hover:bg-background transition-colors"
          >
            <Info className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        
        {/* Info Tooltip */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 ml-6 overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-foreground">
                    <p className="font-medium mb-1">Was bedeutet das?</p>
                    <p className="text-muted-foreground text-xs">
                      Bei Deaktivierung werden folgende Funktionen gesperrt:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <li>• Upload-Funktion für Gäste</li>
                      <li>• Gäste-Galerie (öffentlich)</li>
                      <li>• Event-Link funktioniert nicht mehr</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      ✓ Du als Host kannst die Fotos weiterhin sehen und herunterladen.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Erstellt am</span>
          <span className="text-foreground">
            {event.createdAt ? new Date(event.createdAt).toLocaleDateString('de-DE') : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Event-Datum</span>
          <span className="text-foreground">
            {event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
