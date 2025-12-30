'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Grid3x3, 
  BookOpen, 
  Trophy, 
  Info, 
  Share2, 
  X,
  Folder,
  Users,
  User,
  Heart,
  LayoutDashboard
} from 'lucide-react';
import { Category, Event as EventType } from '@gaestefotos/shared';
import Guestbook from './Guestbook';
import ChallengeCompletion from './ChallengeCompletion';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface BottomNavigationProps {
  eventId: string;
  eventSlug: string;
  categories?: Category[];
  onAlbumSelect?: (categoryId: string | null) => void;
  selectedAlbum?: string | null;
  event?: EventType;
  guestId?: string;
  uploaderName?: string;
}

interface FeedEntry {
  id: string;
  authorName: string;
  message: string;
  photoUrl: string | null;
  createdAt: string;
}

export default function BottomNavigation({
  eventId,
  eventSlug,
  categories = [],
  onAlbumSelect,
  selectedAlbum,
  event,
  guestId,
  uploaderName,
}: BottomNavigationProps) {
  const router = useRouter();
  const { user, isAuthenticated, loadUser, token } = useAuthStore();
  const [activeView, setActiveView] = useState<'feed' | 'albums' | 'challenges' | 'guestbook' | 'info'>('feed');
  const [showAlbums, setShowAlbums] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Load user on mount if token exists but user is not loaded
  useEffect(() => {
    if (token && !user && !isAuthenticated) {
      loadUser();
    }
  }, [token, user, isAuthenticated, loadUser]);

  // Check if current user is the host
  const isHost = isAuthenticated && user && event && (user.id === (event as any).hostId);

  useEffect(() => {
    if (activeView === 'feed') {
      loadFeed();
    } else if (activeView === 'challenges') {
      loadChallenges();
    }
  }, [activeView, eventId]);

  // Reload feed when guestbook modal closes (in case new entries were added)
  useEffect(() => {
    if (activeView === 'feed') {
      loadFeed();
    }
  }, [activeView]);

  const loadFeed = async () => {
    try {
      setLoadingFeed(true);
      const { data } = await api.get(`/events/${eventId}/feed`);
      setFeedEntries(data.entries || []);
    } catch (err) {
      console.error('Fehler beim Laden des Feeds:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const loadChallenges = async () => {
    try {
      setLoadingChallenges(true);
      const { data } = await api.get(`/events/${eventId}/challenges`, {
        params: { isActive: true },
      });
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error('Fehler beim Laden der Challenges:', err);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const handleViewChange = (view: typeof activeView) => {
    setActiveView(view);
    if (view === 'albums') {
      setShowAlbums(true);
    } else if (view === 'challenges') {
      // Challenges wird jetzt als Vollbild angezeigt, nicht als Modal
      setShowChallenges(false);
    } else {
      setShowAlbums(false);
      setShowChallenges(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/e2/${eventSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Event Fotos',
          text: 'Schau dir die Event-Fotos an!',
          url,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(url);
      // Could show toast notification here
    }
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-app-card/90 backdrop-blur border-t border-app-border z-50 safe-area-bottom shadow-[0_-6px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {/* Feed */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('feed')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                activeView === 'feed' ? 'bg-app-bg text-app-fg' : 'text-app-muted'
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
              <span className="text-xs font-medium">Feed</span>
            </motion.button>


            {/* Challenges */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const featuresConfig = event?.featuresConfig as any;
                if (featuresConfig?.challengesEnabled === true) {
                  handleViewChange('challenges');
                } else {
                  // Zeige Hinweis-Modal wenn Challenges deaktiviert
                  setShowChallenges(true);
                }
              }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                (event?.featuresConfig as any)?.challengesEnabled === true
                  ? activeView === 'challenges'
                    ? 'bg-app-bg text-app-fg'
                    : 'text-app-muted'
                  : 'text-app-muted opacity-50'
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span className="text-xs font-medium">Challenges</span>
            </motion.button>

            {/* Gästebuch */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('guestbook')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                activeView === 'guestbook' ? 'bg-app-bg text-app-fg' : 'text-app-muted'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-medium">Gästebuch</span>
            </motion.button>

            {/* Info/Share */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('info')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-colors ${
                activeView === 'info' ? 'bg-app-bg text-app-fg' : 'text-app-muted'
              }`}
            >
              <Info className="w-5 h-5" />
              <span className="text-xs font-medium">Info</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Albums Modal */}
      <AnimatePresence>
        {showAlbums && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAlbums(false)}
            className="fixed inset-0 bg-app-fg/50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-card border border-app-border rounded-t-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-app-fg">Alben</h2>
                <button
                  onClick={() => setShowAlbums(false)}
                  className="p-1 hover:bg-app-bg rounded-full"
                >
                  <X className="w-5 h-5 text-app-fg" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4">
                {/* Alle Fotos */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onAlbumSelect?.(null);
                    setShowAlbums(false);
                    setActiveView('feed');
                  }}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                    selectedAlbum === null
                      ? 'bg-tokens-brandGreen text-app-bg'
                      : 'bg-app-bg hover:bg-app-card text-app-fg'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Grid3x3 className="w-5 h-5" />
                    <div className="flex-1">
                      <p className="font-medium">Alle Fotos</p>
                      <p className="text-sm opacity-70">Komplette Galerie</p>
                    </div>
                  </div>
                </motion.button>

                {/* Kategorien/Alben */}
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-app-muted">
                    <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Noch keine Alben vorhanden</p>
                  </div>
                ) : (
                  categories.map((category) => (
                    <motion.button
                      key={category.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onAlbumSelect?.(category.id);
                        setShowAlbums(false);
                        setActiveView('feed');
                      }}
                      className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                        selectedAlbum === category.id
                          ? 'bg-tokens-brandGreen text-app-bg'
                          : 'bg-app-bg hover:bg-app-card text-app-fg'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5" />
                        <div className="flex-1">
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm opacity-70">
                            {/* Photo count would come from API */}
                            Album
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenges - Vollbild wie Gästebuch */}
      <AnimatePresence>
        {activeView === 'challenges' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-app-bg z-50 flex flex-col"
          >
            <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between z-10 flex-shrink-0">
              <h2 className="text-lg font-semibold text-app-fg">Foto Challenges</h2>
              <button
                onClick={() => {
                  setActiveView('feed');
                  setShowChallenges(false);
                }}
                className="p-1 hover:bg-app-bg rounded-full"
              >
                <X className="w-5 h-5 text-app-fg" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 p-4">
              {(event?.featuresConfig as any)?.challengesEnabled !== true ? (
                <div className="text-center py-8 text-app-muted">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium text-app-fg mb-1">Challenges sind für dieses Event nicht aktiviert</p>
                  <p className="text-xs mt-2 opacity-70">
                    Der Gastgeber kann Challenges in den erweiterten Einstellungen aktivieren
                  </p>
                </div>
              ) : loadingChallenges ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-fg mx-auto"></div>
                  <p className="text-sm text-app-muted mt-2">Lade Challenges...</p>
                </div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-8 text-app-muted">
                  <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Noch keine Challenges vorhanden</p>
                  <p className="text-xs mt-2 opacity-70">
                    Der Gastgeber kann Challenges in den Einstellungen erstellen
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {challenges
                    .filter((c: any) => c.isActive && (!selectedAlbum ? !c.categoryId : c.categoryId === selectedAlbum))
                    .map((challenge: any) => (
                      <ChallengeCompletion
                        key={challenge.id}
                        challenge={challenge}
                        eventId={eventId}
                        guestId={guestId}
                        uploaderName={uploaderName}
                        onComplete={() => {
                          loadChallenges();
                          // Feed neu laden, damit Challenge-Fotos im Feed erscheinen
                          loadFeed();
                          // Trigger window event to reload photos in parent component
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('photoUploaded'));
                          }
                        }}
                      />
                    ))}
                  {challenges.filter((c: any) => c.isActive && (!selectedAlbum ? !c.categoryId : c.categoryId === selectedAlbum)).length === 0 && (
                    <div className="text-center py-4 text-app-muted">
                      <p className="text-sm">Keine Challenges für das ausgewählte Album</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guestbook - Direct View (not modal) for guests */}
      {activeView === 'guestbook' && (
        <div className="fixed inset-0 bg-app-bg z-40 flex flex-col" style={{ paddingBottom: '80px' }}>
          <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between z-20 flex-shrink-0">
            <h2 className="text-lg font-semibold text-app-fg">Gästebuch</h2>
            <button
              onClick={() => setActiveView('feed')}
              className="p-1 hover:bg-app-bg rounded-full"
            >
              <X className="w-5 h-5 text-app-fg" />
            </button>
          </div>
          <div className="flex-1" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <Guestbook eventId={eventId} eventTitle={event?.title} />
          </div>
        </div>
      )}

      {/* Info Modal */}
      <AnimatePresence>
        {activeView === 'info' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveView('feed')}
            className="fixed inset-0 bg-app-fg/50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-card border border-app-border rounded-t-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-app-card border-b border-app-border px-4 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-app-fg">Info</h2>
                <button
                  onClick={() => setActiveView('feed')}
                  className="p-1 hover:bg-app-bg rounded-full"
                >
                  <X className="w-5 h-5 text-app-fg" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-4">
                {/* Zum Dashboard Button - Immer sichtbar, prüft Login beim Klick */}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={async () => {
                    // Prüfe zuerst ob Token vorhanden ist (auch wenn isAuthenticated noch false ist)
                    const hasToken = token || (
                      typeof window !== 'undefined' &&
                      (sessionStorage.getItem('token') || localStorage.getItem('token'))
                    );
                    
                    if (hasToken && !isAuthenticated) {
                      // Token vorhanden, aber User noch nicht geladen - lade User zuerst
                      try {
                        await loadUser();
                        // Nach erfolgreichem Laden, prüfe nochmal den aktuellen State
                        const currentState = useAuthStore.getState();
                        if (currentState.isAuthenticated && currentState.user) {
                          router.push(`/events/${eventId}/dashboard`);
                        } else {
                          // Token ungültig - zur Login-Seite
                          const returnUrl = `/events/${eventId}/dashboard`;
                          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                        }
                      } catch (error) {
                        // Fehler beim Laden - zur Login-Seite
                        const returnUrl = `/events/${eventId}/dashboard`;
                        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                      }
                    } else if (isAuthenticated) {
                      // Eingeloggt - direkt zum Dashboard
                      router.push(`/events/${eventId}/dashboard`);
                    } else {
                      // Nicht eingeloggt - zur Login-Seite mit Return-URL
                      const returnUrl = `/events/${eventId}/dashboard`;
                      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                    }
                  }}
                  className="w-full bg-tokens-brandGreen hover:opacity-90 text-app-bg rounded-lg p-4 flex items-center gap-3 transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-medium">Zum Dashboard</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShare}
                  className="w-full bg-app-bg hover:bg-app-card rounded-lg p-4 flex items-center gap-3 transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="font-medium text-app-fg">Event teilen</span>
                </motion.button>
                <div className="text-sm text-app-muted space-y-2">
                  <p>
                    <strong>Event teilen:</strong> Lade deine Freunde ein, die Fotos zu sehen!
                  </p>
                  <p>
                    <strong>Fotos hochladen:</strong> Nutze den Kamera-Button, um deine Fotos zu teilen.
                  </p>
                  <p>
                    <strong>Alben:</strong> Organisiere Fotos in verschiedenen Alben.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

