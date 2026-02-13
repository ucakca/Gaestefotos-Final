'use client';

import logger from '@/lib/logger';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import {
  Camera,
  Users,
  Clock,
  BarChart3,
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
  Link as LinkIcon,
  Calendar,
  MapPin,
  CheckCircle2,
  Video,
  Target,
  Star,
  Trash2,
  Download,
  FileText,
  Palette,
  Info,
  ScanFace,
  Filter,
  Rocket,
  Trophy,
  Mail,
  PartyPopper,
  ExternalLink,
  Copy,
  Loader2,
  UserPlus,
  Globe,
  Lock,
  Package,
  Zap,
  HardDrive,
  Plus,
  MoreVertical,
  Upload,
  RefreshCw,
  Wifi,
  LayoutGrid,
  Gamepad2,
  Activity,
} from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { useRealtimePhotos } from '@/hooks/useRealtimePhotos';
import { AIFloatingButton } from '@/components/ai-chat';
import { CoHostsSection } from '@/components/dashboard/CoHostsSection';
import SetupTabV2 from '@/components/dashboard/SetupTabV2';

type TabType = 'overview' | 'gallery' | 'guestbook' | 'setup';
type GalleryFilter = 'all' | 'photos' | 'videos' | 'albums' | 'guests' | 'challenges' | 'top' | 'pending' | 'trash';

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
      // Load photos
      const { data } = await api.get(`/events/${eventId}/photos?status=all`);
      const loadedPhotos = data.photos || [];
      setPhotos(loadedPhotos);
      
      const photosOnly = loadedPhotos.filter((p: any) => p.type !== 'VIDEO');
      const videosOnly = loadedPhotos.filter((p: any) => p.type === 'VIDEO');
      
      setPhotoStats({
        total: loadedPhotos.length,
        photos: photosOnly.length,
        videos: videosOnly.length,
        approved: loadedPhotos.filter((p: any) => p.status === 'APPROVED').length,
        pending: loadedPhotos.filter((p: any) => p.status === 'PENDING').length,
        rejected: loadedPhotos.filter((p: any) => p.status === 'REJECTED').length,
      });
      
      // Count unique guests
      const uniqueGuests = new Set(loadedPhotos.map((p: any) => p.guestId || p.deviceFingerprint).filter(Boolean));
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

  // Format storage
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const storageUsed = usage?.used || 0;
  const storageDisplay = formatBytes(storageUsed);

  if (loading) {
    return <FullPageLoader label="Lade Dashboard..." />;
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[hsl(30_20%_98%)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-app-fg mb-2">Event nicht gefunden</h2>
          <p className="text-app-muted mb-4">{error || 'Das Event konnte nicht geladen werden.'}</p>
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
    <div className="min-h-screen bg-[hsl(30_20%_98%)] text-app-fg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-app-card/90 backdrop-blur-xl border-b border-app-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => router.push('/dashboard')}
              className="p-2 -ml-2 rounded-lg hover:bg-app-bg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-app-muted rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-app-fg truncate">{event.title}</h1>
              <div className="flex items-center gap-2 text-xs text-app-muted">
                <span className={`w-2 h-2 rounded-full ${(event as any).isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{(event as any).isActive !== false ? 'Live' : 'Gesperrt'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              className="p-2 rounded-lg hover:bg-app-bg transition-colors"
              title="Gesichtserkennung"
            >
              <ScanFace className="w-5 h-5 text-app-muted" />
            </button>
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
                visitors: (event as any)?.visitCount || 0,
              }}
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
              onGoToSetup={() => {
                setActiveTab('setup');
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
          {activeTab === 'gallery' && (
            <GalleryTab
              key="gallery"
              photos={photos}
              filter={galleryFilter}
              onFilterChange={setGalleryFilter}
              pendingCount={photoStats.pending}
              eventId={eventId || ''}
            />
          )}
          {activeTab === 'guestbook' && (
            <GuestbookTab key="guestbook" eventId={eventId || ''} />
          )}
          {activeTab === 'setup' && (
            <SetupTabV2 key="setup" event={event} eventId={eventId || ''} onEventUpdate={loadEvent} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-app-card/95 backdrop-blur-xl border-t border-app-border z-40">
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
                  : 'text-app-muted hover:text-app-muted'
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
              className="bg-app-card rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <h3 className="text-lg font-semibold text-app-fg mb-4">QR-Code</h3>
                <div className="bg-app-bg rounded-xl p-8 mb-4">
                  <div className="w-48 h-48 mx-auto bg-app-card rounded-lg flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-app-fg" />
                  </div>
                </div>
                <p className="text-sm text-app-muted mb-4">
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
                    className="py-2 px-4 bg-app-bg text-app-fg rounded-lg font-medium hover:bg-app-border transition-colors"
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
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-app-fg text-white rounded-full text-sm font-medium shadow-lg"
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-app-card rounded-t-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-app-border">
                <button onClick={() => setActiveSheet(null)} className="p-2 -ml-2 rounded-lg hover:bg-app-bg transition-colors">
                  <X className="w-5 h-5 text-app-muted" />
                </button>
                <h3 className="font-semibold text-app-fg">Event-Titel</h3>
                <div className="w-9" />
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="relative">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="z.B. Mein Event"
                    className="w-full px-4 py-4 text-lg border-2 border-app-border bg-app-card text-app-fg rounded-2xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-app-muted"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-app-muted">
                    {editTitle.length}/50
                  </span>
                </div>
                <p className="text-center text-sm text-app-muted mt-4">Der Titel wird auf der Event-Seite angezeigt</p>
              </div>
              <div className="p-4 border-t border-app-border bg-app-card">
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-app-card rounded-t-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-4 border-b border-app-border">
                <button onClick={() => setActiveSheet(null)} className="p-2 -ml-2 rounded-lg hover:bg-app-bg transition-colors">
                  <X className="w-5 h-5 text-app-muted" />
                </button>
                <h3 className="font-semibold text-app-fg">Datum & Ort</h3>
                <div className="w-9" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-app-fg mb-2">
                    <Calendar className="w-4 h-4" />
                    Datum & Uhrzeit
                  </label>
                  <input
                    type="datetime-local"
                    value={editDateTime ? `${editDateTime.getFullYear()}-${String(editDateTime.getMonth() + 1).padStart(2, '0')}-${String(editDateTime.getDate()).padStart(2, '0')}T${String(editDateTime.getHours()).padStart(2, '0')}:${String(editDateTime.getMinutes()).padStart(2, '0')}` : ''}
                    onChange={(e) => e.target.value ? setEditDateTime(new Date(e.target.value)) : setEditDateTime(null)}
                    className="w-full px-4 py-3 border-2 border-app-border bg-app-card text-app-fg rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-app-fg mb-2">
                    <MapPin className="w-4 h-4" />
                    Ort / Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="z.B. Schloss Neuschwanstein"
                    className="w-full px-4 py-3 border-2 border-app-border bg-app-card text-app-fg rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-app-muted"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-app-border bg-app-card">
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
}: {
  event: EventType;
  eventDate: string | null;
  designConfig: any;
  stats: { photos: number; videos: number; guestbook: number; challenges: number; pending: number; visitors?: number };
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
  onGoToSetup: () => void;
  onOpenSheet?: (sheetId: 'title' | 'date-location') => void;
}) {
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(completedSteps < totalSteps); // Open until complete
  const currentStep = onboardingSteps.find(s => s.current);
  
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
              <div className="w-16 h-16 rounded-xl bg-app-card/20 backdrop-blur-sm overflow-hidden flex items-center justify-center border-2 border-white/30">
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
            </div>
            
            <div className="flex flex-col gap-2">
              <Link
                href={`/e3/${event.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-full bg-app-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-app-card/30 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                Vorschau
              </Link>
              <Link
                href={`/events/${eventId}/design?wizard=1`}
                className="px-3 py-1.5 rounded-full bg-app-card/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1 hover:bg-app-card/30 transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
                Design
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - 2 rows on mobile (3+3), 1 row on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatCard icon={Camera} value={stats.photos} label="FOTOS" color="blue" onClick={() => onStatClick('photos')} />
        <StatCard icon={Video} value={stats.videos} label="VIDEOS" color="purple" onClick={() => onStatClick('videos')} />
        <StatCard icon={BookOpen} value={stats.guestbook} label="GÄSTEBUCH" color="green" />
        <StatCard icon={Eye} value={stats.visitors || 0} label="BESUCHER" color="cyan" />
        <StatCard icon={Trophy} value={stats.challenges} label="FOTO-SPIELE" color="purple" onClick={() => onStatClick('challenges')} />
        <StatCard icon={Clock} value={stats.pending} label="AUSSTEHEND" color="yellow" highlight={stats.pending > 0} onClick={() => onStatClick('pending')} />
      </div>

      {/* Onboarding Progress */}
      {progressPercent < 100 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-app-fg">Event einrichten</span>
                <span className="text-xs text-amber-600 font-medium">{progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-amber-200 rounded-full mt-1">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
          {currentStep && currentStep.link && (
            <Link
              href={currentStep.link}
              className="flex items-center gap-3 p-3 rounded-xl bg-app-card border border-amber-200"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium text-app-fg">Nächster Schritt</div>
                <div className="text-sm text-app-muted">{currentStep.label}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-app-muted" />
            </Link>
          )}
        </div>
      )}

      {/* All Steps - Collapsible */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAllSteps(!showAllSteps)}
          className="w-full p-4 border-b border-app-border flex items-center justify-between hover:bg-app-bg transition-colors"
        >
          <div className="text-left">
            <h3 className="font-semibold text-app-fg">Setup-Checkliste</h3>
            <p className="text-sm text-app-muted">{completedSteps}/{totalSteps} abgeschlossen</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-app-muted transition-transform ${showAllSteps ? 'rotate-180' : ''}`} />
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
              <div className="p-4 space-y-1">
                {onboardingSteps.map((step, index) => {
                  const content = (
                    <>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.completed ? 'bg-green-500 text-white' : step.current ? 'bg-amber-500 text-white' : 'bg-app-border text-app-muted'
                      }`}>
                        {step.completed ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-sm flex-1 ${
                        step.completed ? 'text-green-700' : step.current ? 'text-amber-700 font-medium' : 'text-app-muted'
                      }`}>
                        {step.label}
                      </span>
                      {step.current && (
                        <ChevronRight className="w-4 h-4 text-amber-500" />
                      )}
                    </>
                  );
                  
                  const className = `flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    step.completed ? 'bg-green-50' : step.current ? 'bg-amber-50' : 'hover:bg-app-bg'
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
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/events/${eventId}/live-wall`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-purple-500">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">Event Wall</div>
            <div className="text-xs text-app-muted">Slideshow starten</div>
          </div>
        </Link>
        <button
          onClick={onGenerateShareLink}
          disabled={shareLoading}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-200 p-4 text-left disabled:opacity-50"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-blue-500">
            {shareLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="font-medium text-app-fg">Share</div>
            <div className="text-xs text-app-muted">{shareUrl ? 'Erneut kopieren' : 'Link erzeugen'}</div>
          </div>
        </button>
        <Link
          href={`/events/${eventId}/mosaic`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-pink-500/10 to-pink-600/5 border border-pink-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-pink-500">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">Mosaic Wall</div>
            <div className="text-xs text-app-muted">Foto-Mosaik</div>
          </div>
        </Link>
        <Link
          href={`/events/${eventId}/package`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-amber-500">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">Paket</div>
            <div className="text-xs text-app-muted">Upgrade & Wechsel</div>
          </div>
        </Link>
        <Link
          href={`/events/${eventId}/ki-booth`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-600/5 border border-violet-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-violet-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">KI-Kunst</div>
            <div className="text-xs text-app-muted">AI Style Transfer</div>
          </div>
        </Link>
        <Link
          href={`/events/${eventId}/booth-games`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-emerald-500">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">Foto-Spiele</div>
            <div className="text-xs text-app-muted">Interaktive Games</div>
          </div>
        </Link>
        <Link
          href={`/events/${eventId}/live-analytics`}
          className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-200 p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-app-card flex items-center justify-center shadow-sm text-cyan-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-app-fg">Live-Analytics</div>
            <div className="text-xs text-app-muted">Echtzeit-Statistiken</div>
          </div>
        </Link>
      </div>

      {/* Paket & Upsell */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-app-fg">
                {(event as any).tier === 'premium' ? 'Premium' : (event as any).tier === 'smart' ? 'Smart' : (event as any).tier === 'basic' ? 'Basic' : 'Free'}
              </div>
              <div className="text-xs text-app-muted">Aktuelles Paket</div>
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
          {[
            { label: 'Event Wall', icon: Play, enabled: (event as any).tier === 'smart' || (event as any).tier === 'premium' },
            { label: 'Video', icon: Video, enabled: (event as any).tier === 'smart' || (event as any).tier === 'premium' },
            { label: 'Mosaic', icon: LayoutGrid, enabled: Boolean((event as any).allowMosaicWall) },
            { label: 'KI-Kunst', icon: Sparkles, enabled: Boolean((event as any).allowKiBooth) },
            { label: 'Werbefrei', icon: Star, enabled: (event as any).tier === 'premium' },
            { label: 'Co-Hosts', icon: Users, enabled: (event as any).tier === 'smart' || (event as any).tier === 'premium' },
          ].map(f => (
            <div key={f.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
              f.enabled ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-gray-200'
            }`}>
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
              {!f.enabled && <Lock className="w-3 h-3 ml-auto" />}
            </div>
          ))}
        </div>
      </div>

      {/* Hashtag — Always FREE */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm text-teal-900 flex items-center gap-1.5">
                Hashtag-Import
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">FREE</span>
              </div>
              <p className="text-[11px] text-teal-700">Fotos automatisch in die Galerie importieren</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-white border border-teal-200 rounded-lg px-3 py-2 font-mono text-sm font-bold text-teal-800">
            #gästefotos
          </div>
          <button
            onClick={() => onCopy('#gästefotos', 'Hashtag kopiert!')}
            className="p-2 rounded-lg bg-teal-100 hover:bg-teal-200 transition-colors text-teal-700"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-teal-600 mt-2">
          Gäste posten Fotos mit diesem Hashtag → automatischer Import in eure Galerie. Inkl. gästefotos.com Logo-Overlay.
        </p>
      </div>

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
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-app-fg">Einladungen</h3>
              <p className="text-xs text-app-muted">{invitations.length} erstellt</p>
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
          <div className="divide-y divide-app-border">
            {invitations.slice(0, 3).map((inv: any) => (
              <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-app-fg">{inv.name}</div>
                  <div className="text-xs text-app-muted">
                    {inv.opens || 0} Aufrufe • RSVP: {inv?.rsvp?.yes || 0}/{inv?.rsvp?.no || 0}/{inv?.rsvp?.maybe || 0}
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${inv.isActive !== false ? 'bg-green-500' : 'bg-app-border'}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-app-muted">
            Noch keine Einladungen erstellt
          </div>
        )}
      </div>

      {/* Co-Hosts Overview */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-app-fg">Co-Hosts</h3>
              <p className="text-xs text-app-muted">{cohosts.length} Mitverwalter</p>
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
          <div className="divide-y divide-app-border">
            {cohosts.map((cohost: any) => (
              <div key={cohost.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-app-border flex items-center justify-center text-app-muted text-xs font-medium">
                  {cohost.user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-app-fg truncate">{cohost.user?.email || 'Unbekannt'}</div>
                  <div className="text-xs text-app-muted">Co-Host</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-app-muted">
            Noch keine Co-Hosts eingeladen
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ GALLERY TAB ============
function GalleryTab({
  photos,
  filter,
  onFilterChange,
  pendingCount,
  eventId,
}: {
  photos: any[];
  filter: GalleryFilter;
  onFilterChange: (f: GalleryFilter) => void;
  pendingCount: number;
  eventId: string;
}) {
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);
  const [showAll, setShowAll] = useState(false);
  
  // Count for filters
  const challengePhotos = photos.filter(p => p.challengeId && p.status === 'APPROVED');
  const topPhotos = photos.filter(p => p.isFavorite || p.likes > 0);
  const trashedPhotos = photos.filter(p => p.status === 'REJECTED');
  
  // Get unique categories (albums) with names - categoryId is used for albums
  const categoriesMap = new Map<string, { id: string; name: string; count: number }>();
  photos.filter(p => p.categoryId && p.status === 'APPROVED').forEach(p => {
    const existing = categoriesMap.get(p.categoryId);
    if (existing) {
      existing.count++;
    } else {
      categoriesMap.set(p.categoryId, { 
        id: p.categoryId, 
        name: p.category?.name || `Album ${p.categoryId.slice(0, 6)}`, 
        count: 1 
      });
    }
  });
  const albums = Array.from(categoriesMap.values());
  
  // Get unique uploaders (guests) with names and counts - use uploadedBy as primary
  const guestsMap = new Map<string, { id: string; name: string; count: number }>();
  photos.filter(p => p.status === 'APPROVED').forEach(p => {
    // Use uploadedBy as primary identifier, fallback to other identifiers
    const guestKey = p.uploadedBy || p.visitorId || p.guestId || p.deviceFingerprint || '__anonymous__';
    const existing = guestsMap.get(guestKey);
    if (existing) {
      existing.count++;
    } else {
      let guestName: string;
      if (p.uploadedBy) {
        guestName = p.uploadedBy;
      } else if (p.guest?.firstName) {
        guestName = `${p.guest.firstName} ${p.guest.lastName || ''}`.trim();
      } else if (p.visitor?.name) {
        guestName = p.visitor.name;
      } else if (guestKey === '__anonymous__') {
        guestName = 'Anonymer Teilnehmer';
      } else {
        guestName = `Gast ${guestKey.slice(0, 6)}`;
      }
      guestsMap.set(guestKey, { id: guestKey, name: guestName, count: 1 });
    }
  });
  const guests = Array.from(guestsMap.values()).sort((a, b) => b.count - a.count);
  
  const filters: { id: GalleryFilter; label: string; icon: any; count?: number }[] = [
    { id: 'all', label: 'Alle', icon: Filter },
    { id: 'photos', label: 'Fotos', icon: Camera },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'albums', label: 'Alben', icon: ImageIcon, count: albums.length },
    { id: 'guests', label: 'Gäste', icon: Users, count: guests.length },
    { id: 'challenges', label: 'Challenges', icon: Trophy, count: challengePhotos.length },
    { id: 'top', label: 'Top', icon: Star, count: topPhotos.length },
    { id: 'pending', label: 'Freigabe', icon: Clock, count: pendingCount },
    { id: 'trash', label: 'Papierkorb', icon: Trash2, count: trashedPhotos.length },
  ];

  // Reset sub-filters when main filter changes
  useEffect(() => {
    if (filter !== 'albums') setSelectedAlbum(null);
    if (filter !== 'guests') setSelectedGuest(null);
  }, [filter]);

  const filteredPhotos = photos.filter(p => {
    if (filter === 'all') return p.status === 'APPROVED';
    if (filter === 'photos') return p.status === 'APPROVED' && p.type !== 'VIDEO';
    if (filter === 'videos') return p.status === 'APPROVED' && p.type === 'VIDEO';
    if (filter === 'albums') {
      if (!p.categoryId || p.status !== 'APPROVED') return false;
      if (selectedAlbum) return p.categoryId === selectedAlbum;
      return true;
    }
    if (filter === 'guests') {
      if (p.status !== 'APPROVED') return false;
      const guestKey = p.uploadedBy || p.visitorId || p.guestId || p.deviceFingerprint || '__anonymous__';
      if (selectedGuest) return guestKey === selectedGuest;
      return true; // Show all approved photos in guests view
    }
    if (filter === 'challenges') return p.challengeId && p.status === 'APPROVED';
    if (filter === 'top') return (p.isFavorite || p.likes > 0) && p.status === 'APPROVED';
    if (filter === 'pending') return p.status === 'PENDING';
    if (filter === 'trash') return p.status === 'REJECTED';
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-blue-500 text-white'
                : 'bg-app-card border border-app-border text-app-muted hover:border-blue-300'
            }`}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === f.id ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-Filter for Albums */}
      {filter === 'albums' && albums.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedAlbum(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedAlbum
                ? 'bg-purple-500 text-white'
                : 'bg-purple-50 border border-purple-200 text-purple-600 hover:border-purple-300'
            }`}
          >
            Alle Alben
          </button>
          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbum(album.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedAlbum === album.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-50 border border-purple-200 text-purple-600 hover:border-purple-300'
              }`}
            >
              {album.name}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                selectedAlbum === album.id ? 'bg-app-card/20' : 'bg-purple-100'
              }`}>
                {album.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Sub-Filter for Guests */}
      {filter === 'guests' && guests.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedGuest(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedGuest
                ? 'bg-green-500 text-white'
                : 'bg-green-50 border border-green-200 text-green-600 hover:border-green-300'
            }`}
          >
            Alle Gäste
          </button>
          {guests.map(guest => (
            <button
              key={guest.id}
              onClick={() => setSelectedGuest(guest.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGuest === guest.id
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 border border-green-200 text-green-600 hover:border-green-300'
              }`}
            >
              {guest.name}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                selectedGuest === guest.id ? 'bg-app-card/20' : 'bg-green-100'
              }`}>
                {guest.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16">
          <Camera className="w-12 h-12 text-app-muted mx-auto mb-3" />
          <p className="text-app-muted">Keine Medien gefunden</p>
          {filter === 'pending' && (
            <p className="text-sm text-app-muted mt-1">Alle Fotos wurden bereits freigegeben</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
          {(showAll ? filteredPhotos : filteredPhotos.slice(0, 12)).map((photo, i) => (
            <button 
              key={photo.id || i}
              onClick={() => setLightboxPhoto(photo)}
              className="aspect-square relative bg-app-border group cursor-pointer overflow-hidden"
            >
              <img
                src={photo.thumbnailUrl || photo.url || '/placeholder.jpg'}
                alt=""
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Pending Overlay */}
              {photo.status === 'PENDING' && (
                <div className="absolute inset-0 bg-orange-500/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              )}
              {/* Challenge Overlay */}
              {photo.challengeId && photo.status === 'APPROVED' && (
                <div className="absolute top-1 left-1">
                  <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                  </div>
                </div>
              )}
              {/* Video Overlay */}
              {photo.type === 'VIDEO' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              )}
              {/* Top/Favorite Overlay */}
              {(photo.isFavorite || photo.likes > 0) && photo.status === 'APPROVED' && (
                <div className="absolute top-1 right-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Show All Button (inline, no navigation) */}
      {filteredPhotos.length > 12 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="flex items-center justify-center gap-2 mt-4 py-3 text-blue-600 font-medium w-full"
        >
          Alle {filteredPhotos.length} Medien anzeigen
          <ChevronDown className="w-4 h-4" />
        </button>
      )}
      {showAll && filteredPhotos.length > 12 && (
        <button
          onClick={() => setShowAll(false)}
          className="flex items-center justify-center gap-2 mt-4 py-3 text-app-muted font-medium w-full"
        >
          Weniger anzeigen
          <ChevronDown className="w-4 h-4 rotate-180" />
        </button>
      )}

      {/* Photo Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-app-card/20 text-white hover:bg-app-card/30 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxPhoto.url || lightboxPhoto.thumbnailUrl}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <span className="text-white/70 text-sm">
                {lightboxPhoto.uploadedBy || 'Unbekannt'} • {new Date(lightboxPhoto.createdAt).toLocaleDateString('de-DE')}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                lightboxPhoto.status === 'APPROVED' ? 'bg-green-500/20 text-green-300' :
                lightboxPhoto.status === 'REJECTED' ? 'bg-red-500/20 text-red-300' :
                'bg-orange-500/20 text-orange-300'
              }`}>
                {lightboxPhoto.status === 'APPROVED' ? 'Freigegeben' : lightboxPhoto.status === 'REJECTED' ? 'Abgelehnt' : 'Ausstehend'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ GUESTBOOK TAB ============
function GuestbookTab({ eventId }: { eventId: string }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/events/${eventId}/guestbook`)
      .then(res => setEntries(res.data?.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-app-muted mx-auto mb-3 animate-spin" />
          <p className="text-app-muted text-sm">Lade Gästebuch...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-app-muted mx-auto mb-3" />
          <h3 className="font-medium text-app-fg mb-1">Gästebuch</h3>
          <p className="text-app-muted text-sm">Noch keine Einträge vorhanden</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-app-fg">{entries.length} Einträge</h3>
          {entries.map((entry: any) => (
            <div key={entry.id} className="rounded-2xl border border-app-border bg-app-card p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-bold">
                  {(entry.name || 'G').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-sm text-app-fg">{entry.name || 'Gast'}</div>
                  <div className="text-xs text-app-muted">{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('de-DE') : ''}</div>
                </div>
              </div>
              {entry.message && <p className="text-sm text-app-fg">{entry.message}</p>}
              {entry.imageUrl && (
                <img src={entry.imageUrl} alt="" className="mt-2 rounded-xl max-h-48 object-cover w-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============ SETUP TAB ============
function SetupTab({ event, eventId }: { event: EventType; eventId: string }) {
  const { showToast } = useToastStore();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4 space-y-4"
    >
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

      {/* Event Info Section */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Info className="w-4 h-4" />
            Event-Info
          </h3>
        </div>
        <SetupRow icon={Calendar} label="Datum & Ort" link={`/events/${eventId}/edit`} />
        <SetupRow icon={LinkIcon} label="Event-Link" link={`/events/${eventId}/edit`} />
      </div>

      {/* Features Section */}
      <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-app-border bg-app-bg">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </h3>
        </div>
        <SetupRow icon={Trophy} label="Foto-Spiele" link={`/events/${eventId}/challenges`} />
        <SetupRow icon={Users} label="Gästeliste" link={`/events/${eventId}/guests`} />
        <SetupRow icon={BookOpen} label="Kategorien" link={`/events/${eventId}/categories`} />
        <SetupRow icon={BarChart3} label="Statistiken" link={`/events/${eventId}/statistics`} />
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
        <SetupRow icon={Eye} label="Sichtbarkeit" link={`/events/${eventId}/edit`} />
        <SetupRow icon={Settings} label="Erweiterte Optionen" link={`/events/${eventId}/edit`} danger />
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

    </motion.div>
  );
}

// ============ HELPER COMPONENTS ============

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
      bg: 'bg-gradient-to-br from-blue-100 to-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-900',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-100 to-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      text: 'text-green-900',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
      border: highlight ? 'border-yellow-400 border-2' : 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-900',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-100 to-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-500',
      text: 'text-purple-900',
    },
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-100 to-cyan-50',
      border: 'border-cyan-200',
      icon: 'text-cyan-500',
      text: 'text-cyan-900',
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
      <div className="text-[10px] text-app-muted font-medium tracking-wide">{label}</div>
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
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-app-muted'}`} />
        <span className={danger ? 'text-red-600' : 'text-app-fg'}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-app-muted" />
    </>
  );

  if (link) {
    return (
      <Link href={link} className="flex items-center justify-between w-full px-4 py-4 border-b border-app-border last:border-0 text-left hover:bg-app-bg transition-colors">
        {content}
      </Link>
    );
  }

  return (
    <button className="flex items-center justify-between w-full px-4 py-4 border-b border-app-border last:border-0 text-left hover:bg-app-bg transition-colors">
      {content}
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
    <div className="rounded-2xl border border-app-border bg-app-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-app-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${(event as any).isActive !== false ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold text-app-fg">Event Status</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={(event as any).isActive !== false} 
              onChange={onToggleActive}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-app-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-app-card after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-6">
          <p className="text-sm text-app-muted">
            {(event as any).isActive !== false ? 'Gäste können Fotos hochladen' : 'Event ist deaktiviert'}
          </p>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full hover:bg-app-bg transition-colors"
          >
            <Info className="w-4 h-4 text-app-muted" />
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
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Was bedeutet das?</p>
                    <p className="text-blue-700 text-xs">
                      Bei Deaktivierung werden folgende Funktionen gesperrt:
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                      <li>• Upload-Funktion für Gäste</li>
                      <li>• Gäste-Galerie (öffentlich)</li>
                      <li>• Event-Link funktioniert nicht mehr</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
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
          <span className="text-app-muted">Erstellt am</span>
          <span className="text-app-fg">
            {event.createdAt ? new Date(event.createdAt).toLocaleDateString('de-DE') : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-muted">Event-Datum</span>
          <span className="text-app-fg">
            {event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
