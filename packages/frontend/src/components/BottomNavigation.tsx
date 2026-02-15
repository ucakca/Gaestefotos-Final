'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  LayoutDashboard,
  Sparkles,
  Mail,
  ScanFace,
  Home,
  Moon,
  Sun
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Category, Event as EventType } from '@gaestefotos/shared';
import Guestbook from './Guestbook';
import ChallengeCompletion from './ChallengeCompletion';
import FaceSearch from './FaceSearch';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { ThemeToggleText } from '@/components/ThemeToggle';

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

const MotionButton = motion(Button);

// Helper to get Lucide icon component from iconKey
const getIcon = (iconKey?: string | null) => {
  if (!iconKey) return Folder;
  const Comp = (LucideIcons as any)[String(iconKey)];
  return typeof Comp === 'function' ? Comp : Folder;
};

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
  const { user, isAuthenticated, loadUser } = useAuthStore();
  const [activeView, setActiveView] = useState<'feed' | 'albums' | 'challenges' | 'guestbook' | 'info'>('feed');
  const [showAlbums, setShowAlbums] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(false);

  // Load user on mount if not already loaded
  useEffect(() => {
    if (!user && !isAuthenticated) {
      loadUser();
    }
  }, [user, isAuthenticated, loadUser]);

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
      // ignore
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
      // ignore
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
      {/* Bottom Navigation Bar - Redesigned */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-bottom pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-between py-2 relative">
            {/* Left: Feed */}
            <MotionButton
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('feed')}
              variant="ghost"
              size="sm"
              className={`h-auto flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeView === 'feed' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Home className={`w-6 h-6 ${activeView === 'feed' ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">Feed</span>
            </MotionButton>

            {/* Challenges */}
            <MotionButton
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const featuresConfig = event?.featuresConfig as any;
                if (featuresConfig?.enableChallenges === false) return;
                handleViewChange('challenges');
              }}
              variant="ghost"
              size="sm"
              className={`h-auto flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeView === 'challenges' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Trophy className={`w-6 h-6 ${activeView === 'challenges' ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">Challenges</span>
            </MotionButton>

            {/* Center: Finde mein Foto - Prominent Button */}
            {(event?.featuresConfig as any)?.faceSearch !== false && (
              <MotionButton
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowFaceSearch(true)}
                variant="primary"
                size="sm"
                className="absolute left-1/2 -translate-x-1/2 -top-5 h-auto flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg shadow-primary/30"
              >
                <ScanFace className="w-6 h-6" />
                <span className="text-[10px] font-semibold whitespace-nowrap">Finde mich</span>
              </MotionButton>
            )}

            {/* Gästebuch */}
            <MotionButton
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('guestbook')}
              variant="ghost"
              size="sm"
              className={`h-auto flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeView === 'guestbook' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <BookOpen className={`w-6 h-6 ${activeView === 'guestbook' ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">Gästebuch</span>
            </MotionButton>

            {/* Right: Info */}
            <MotionButton
              whileTap={{ scale: 0.9 }}
              onClick={() => handleViewChange('info')}
              variant="ghost"
              size="sm"
              className={`h-auto flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeView === 'info' ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Info className={`w-6 h-6 ${activeView === 'info' ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">Info</span>
            </MotionButton>
          </div>
        </div>
      </motion.div>
      
      {/* Face Search Modal */}
      <FaceSearch 
        eventId={eventId} 
        open={showFaceSearch}
        onClose={() => setShowFaceSearch(false)}
      />

      {/* Albums Modal */}
      <Dialog open={showAlbums} onOpenChange={(open) => (open ? null : setShowAlbums(false))}>
        <DialogContent className="bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 rounded-t-2xl w-full max-w-none max-h-[80vh] overflow-hidden p-0">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Alben</h2>
            <DialogClose asChild>
              <IconButton
                onClick={() => setShowAlbums(false)}
                icon={<X className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                title="Schließen"
              />
            </DialogClose>
          </div>
          <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4">
            {/* Alle Fotos */}
            <MotionButton
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onAlbumSelect?.(null);
                setShowAlbums(false);
                setActiveView('feed');
              }}
              variant="ghost"
              size="sm"
              className="h-auto w-full bg-background hover:bg-card rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Grid3x3 className="w-5 h-5 text-background" />
              </div>
              <div>
                <p className="font-medium text-foreground">Alle Fotos</p>
                <p className="text-sm opacity-70">Komplette Galerie</p>
              </div>
            </MotionButton>

            {/* Kategorien/Alben */}
            {categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Alben vorhanden</p>
              </div>
            ) : (
              categories.map((category) => (
                <MotionButton
                  key={category.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    onAlbumSelect?.(category.id);
                    setShowAlbums(false);
                    setActiveView('feed');
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-auto w-full bg-background hover:bg-card rounded-lg p-4 flex items-center gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const IconComp = getIcon(category.iconKey);
                        return <IconComp className="w-5 h-5 text-primary" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{category.name}</p>
                      <p className="text-sm text-muted-foreground">Album</p>
                    </div>
                  </div>
                </MotionButton>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenges - Vollbild wie Gästebuch */}
      <Dialog
        open={activeView === 'challenges'}
        onOpenChange={(open) => {
          if (open) return;
          setActiveView('feed');
          setShowChallenges(false);
        }}
      >
        {activeView === 'challenges' && (
          <DialogContent className="fixed inset-0 z-50 flex flex-col bg-background p-0 rounded-none max-w-none translate-x-0 translate-y-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 min-h-0">
              <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between z-10 flex-shrink-0">
                <h2 className="text-lg font-semibold text-foreground">Foto Challenges</h2>
                <DialogClose asChild>
                  <IconButton
                    onClick={() => {
                      setActiveView('feed');
                      setShowChallenges(false);
                    }}
                    icon={<X className="w-5 h-5" />}
                    variant="ghost"
                    size="sm"
                    aria-label="Schließen"
                    title="Schließen"
                  />
                </DialogClose>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                {(event?.featuresConfig as any)?.enableChallenges !== true ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium text-foreground mb-1">Challenges sind für dieses Event nicht aktiviert</p>
                    <p className="text-xs mt-2 opacity-70">
                      Der Gastgeber kann Challenges in den erweiterten Einstellungen aktivieren
                    </p>
                  </div>
                ) : loadingChallenges ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
                    <p className="text-sm text-muted-foreground mt-2">Lade Challenges...</p>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
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
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">Keine Challenges für das ausgewählte Album</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </DialogContent>
        )}
      </Dialog>

      {/* Guestbook - Direct View (not modal) for guests */}
      {activeView === 'guestbook' && (
        <div className="fixed inset-0 bg-background z-40 flex flex-col pb-20">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between z-20 flex-shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Gästebuch</h2>
            <IconButton
              onClick={() => setActiveView('feed')}
              icon={<X className="w-5 h-5" />}
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <Guestbook eventId={eventId} eventTitle={event?.title} />
          </div>
        </div>
      )}

      {/* Info Modal */}
      <Dialog open={activeView === 'info'} onOpenChange={(open) => (open ? null : setActiveView('feed'))}>
        <DialogContent className="bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 rounded-t-2xl w-full max-w-none max-h-[80vh] overflow-hidden p-0">
          <div className="sticky top-0 bg-card border-b border-border px-4 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Info</h2>
            <DialogClose asChild>
              <IconButton
                onClick={() => setActiveView('feed')}
                icon={<X className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                title="Schließen"
              />
            </DialogClose>
          </div>
          <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-4">
            {/* Zum Dashboard Button - Immer sichtbar, prüft Login beim Klick */}
            <MotionButton
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                // Auth is cookie-based - try to load user first if not authenticated
                if (!isAuthenticated) {
                  try {
                    await loadUser();
                    const currentState = useAuthStore.getState();
                    if (currentState.isAuthenticated && currentState.user) {
                      router.push(`/events/${eventId}/dashboard`);
                    } else {
                      const returnUrl = `/events/${eventId}/dashboard`;
                      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                    }
                  } catch (error) {
                    const returnUrl = `/events/${eventId}/dashboard`;
                    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
                  }
                } else {
                  router.push(`/events/${eventId}/dashboard`);
                }
              }}
              variant="ghost"
              size="sm"
              className="h-auto w-full bg-background hover:bg-card rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Zum Dashboard</span>
            </MotionButton>
            <MotionButton
              whileTap={{ scale: 0.98 }}
              onClick={handleShare}
              variant="ghost"
              size="sm"
              className="h-auto w-full bg-background hover:bg-card rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span className="font-medium text-foreground">Event teilen</span>
            </MotionButton>
            
            {/* Dark Mode Toggle */}
            <div className="w-full bg-background hover:bg-card rounded-lg transition-colors">
              <ThemeToggleText className="w-full p-4 justify-start" />
            </div>
            
            <div className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-semibold text-foreground mb-1">Über diese App</p>
                <p className="text-xs">
                  Mit Gästefotos können Sie Fotos von Ihrem Event teilen und organisieren. Laden Sie Ihre Gäste ein, Fotos hochzuladen und gemeinsam Erinnerungen zu schaffen.
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Betrieb & Hosting</p>
                <p className="text-xs mb-2">
                  Diese Plattform wird betrieben von <strong>Gästefotos</strong>.
                </p>
                <p className="text-xs">
                  <strong>Kontakt & Support:</strong><br/>
                  E-Mail: support@gästefotos.com<br/>
                  Website: gästefotos.com
                </p>
                <p className="text-xs mt-2">
                  <strong>Technische Infrastruktur:</strong><br/>
                  • Sichere SSL-verschlüsselte Datenübertragung<br/>
                  • DSGVO-konform in Deutschland gehostet<br/>
                  • Automatische Backups & 99.9% Uptime
                </p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">So funktioniert's</p>
                <p className="text-xs">
                  • <strong>Fotos hochladen:</strong> Nutzen Sie den Kamera-Button<br/>
                  • <strong>Alben:</strong> Filtern Sie Fotos nach Kategorien<br/>
                  • <strong>Challenges:</strong> Nehmen Sie an Foto-Challenges teil<br/>
                  • <strong>Gästebuch:</strong> Hinterlassen Sie Nachrichten<br/>
                  • <strong>Stories:</strong> Teilen Sie Momente in Echtzeit
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
