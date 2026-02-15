'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Share2, 
  QrCode,
  Heart,
  MessageCircle,
  Trophy,
  Video,
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  LayoutGrid,
  Monitor,
  Settings,
  Shuffle,
  ChevronDown
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import * as QRCode from 'qrcode';

type AnimationType = 'fade' | 'slide' | 'zoom' | 'flip' | 'collage';
type ViewMode = 'grid' | 'slideshow';

const ANIMATION_VARIANTS: Record<AnimationType, { initial: any; animate: any; exit: any }> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 1.2 } },
    exit: { opacity: 0, transition: { duration: 0.8 } },
  },
  slide: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 80, damping: 20 } },
    exit: { x: '-100%', opacity: 0, transition: { duration: 0.6 } },
  },
  zoom: {
    initial: { scale: 0.3, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 15 } },
    exit: { scale: 1.5, opacity: 0, transition: { duration: 0.8 } },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1, transition: { duration: 0.8 } },
    exit: { rotateY: -90, opacity: 0, transition: { duration: 0.6 } },
  },
  collage: {
    initial: { scale: 0.5, opacity: 0, rotate: -5 },
    animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 120, damping: 12 } },
    exit: { scale: 0.5, opacity: 0, rotate: 5, transition: { duration: 0.5 } },
  },
};

interface Photo {
  id: string;
  url: string;
  createdAt: string;
  isGuestbookEntry?: boolean;
  isChallengeCompletion?: boolean;
  isStory?: boolean;
  guestbookEntry?: {
    authorName: string;
    message: string;
  };
  challenge?: {
    title: string;
    emoji?: string;
  };
  story?: {
    uploaderName: string;
  };
}

export default function LiveWallPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  
  // Event Wall slideshow state
  const [viewMode, setViewMode] = useState<ViewMode>('slideshow');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animation, setAnimation] = useState<AnimationType>('fade');
  const [intervalSec, setIntervalSec] = useState(6);
  const [shuffleMode, setShuffleMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load event data
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!eventId) return;
    
    loadPhotos();
    
    refreshIntervalRef.current = setInterval(() => {
      loadPhotos();
    }, 5000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [eventId]);

  // Slideshow auto-advance
  useEffect(() => {
    if (viewMode !== 'slideshow' || !isPlaying || photos.length === 0) {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
      return;
    }
    slideshowTimerRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        if (shuffleMode) return Math.floor(Math.random() * photos.length);
        return (prev + 1) % photos.length;
      });
    }, intervalSec * 1000);
    return () => { if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current); };
  }, [viewMode, isPlaying, photos.length, intervalSec, shuffleMode]);

  // Generate QR Code
  useEffect(() => {
    if (typeof window !== 'undefined' && eventId) {
      const url = window.location.href;
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEventTitle(data.event?.title || 'Event Wall');
    } catch (err) {
      // Error loading event
    }
  };

  const loadPhotos = async () => {
    try {
      const [photosRes, feedRes, challengesRes, storiesRes] = await Promise.allSettled([
        api.get(`/events/${eventId}/photos?status=APPROVED&limit=50`),
        api.get(`/events/${eventId}/feed`),
        api.get(`/events/${eventId}/challenges/completions`),
        api.get(`/events/${eventId}/stories`)
      ]);

      let allPhotos: Photo[] = [];

      // Regular photos
      if (photosRes.status === 'fulfilled') {
        const regularPhotos = (photosRes.value.data.photos || []).map((p: any) => ({
          id: p.id,
          url: p.url || `/api/photos/${p.id}/file`,
          createdAt: p.createdAt,
        }));
        allPhotos = [...allPhotos, ...regularPhotos];
      }

      // Guestbook entries with photos
      if (feedRes.status === 'fulfilled') {
        const feedEntries = feedRes.value.data.entries || [];
        const guestbookPhotos = feedEntries
          .filter((e: any) => e.photoUrl)
          .map((e: any) => ({
            id: `guestbook-${e.id}`,
            url: e.photoUrl,
            createdAt: e.createdAt,
            isGuestbookEntry: true,
            guestbookEntry: {
              authorName: e.authorName,
              message: e.message,
            },
          }));
        allPhotos = [...allPhotos, ...guestbookPhotos];
      }

      // Challenge completions
      if (challengesRes.status === 'fulfilled') {
        const completions = challengesRes.value.data.completions || [];
        const challengePhotos = completions
          .filter((c: any) => c.photo?.url || c.photo?.id)
          .map((c: any) => ({
            id: `challenge-${c.id}`,
            url: c.photo.url || `/api/photos/${c.photo.id}/file`,
            createdAt: c.completedAt,
            isChallengeCompletion: true,
            challenge: {
              title: c.challenge?.title || 'Challenge',
              emoji: c.challenge?.emoji,
            },
          }));
        allPhotos = [...allPhotos, ...challengePhotos];
      }

      // Stories
      if (storiesRes.status === 'fulfilled') {
        const stories = storiesRes.value.data.stories || [];
        const storyPhotos = stories
          .filter((s: any) => s.mediaType === 'image' && s.mediaUrl)
          .map((s: any) => ({
            id: `story-${s.id}`,
            url: s.mediaUrl,
            createdAt: s.createdAt,
            isStory: true,
            story: {
              uploaderName: s.uploaderName || 'Gast',
            },
          }));
        allPhotos = [...allPhotos, ...storyPhotos];
      }

      // Sort by date (newest first) and limit
      allPhotos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPhotos(allPhotos.slice(0, 50));
      setLoading(false);
    } catch (err) {
      // Error loading photos
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventTitle} - Live Wall`,
          text: 'Schau dir die Live-Foto-Wall an!',
          url,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert('Link in Zwischenablage kopiert!');
    }
  };

  const currentPhoto = photos[currentIndex] || null;

  const nextSlide = () => {
    if (photos.length === 0) return;
    setCurrentIndex(prev => shuffleMode ? Math.floor(Math.random() * photos.length) : (prev + 1) % photos.length);
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen ${viewMode === 'slideshow' ? 'bg-black' : 'bg-gradient-to-br from-background via-card to-background'}`}
    >
      {/* Header */}
      <div className={`sticky top-0 z-50 backdrop-blur-sm border-b shadow-sm ${
        viewMode === 'slideshow' ? 'bg-black/80 border-white/10' : 'bg-card/95 border-border'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <IconButton
                icon={<ChevronLeft className="w-5 h-5" />}
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                aria-label="Zurück"
                title="Zurück"
              />
            )}
            <div>
              <h1 className={`text-lg font-bold ${viewMode === 'slideshow' ? 'text-white' : 'text-foreground'}`}>{eventTitle}</h1>
              <p className={`text-xs ${viewMode === 'slideshow' ? 'text-white/60' : 'text-muted-foreground'}`}>Event Wall</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-0.5 ${viewMode === 'slideshow' ? 'bg-white/10' : 'bg-background'}`}>
              <button
                onClick={() => setViewMode('slideshow')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'slideshow' ? 'bg-white/20 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                title="Slideshow"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : viewMode === 'slideshow' ? 'text-white/40 hover:text-white/80' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Slideshow Controls */}
            {viewMode === 'slideshow' && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={nextSlide}
                  className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                  title="Nächstes"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShuffleMode(!shuffleMode)}
                  className={`p-1.5 rounded-lg transition-colors ${shuffleMode ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                  title={shuffleMode ? 'Zufällig (an)' : 'Zufällig (aus)'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                  title="Einstellungen"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={() => setShowQR(!showQR)}>
              <QrCode className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
            <IconButton
              icon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              aria-label={isFullscreen ? "Vollbild beenden" : "Vollbild"}
              title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
            />
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && viewMode === 'slideshow' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Animation:</span>
                  <div className="flex rounded-lg bg-white/10 p-0.5">
                    {(['fade', 'slide', 'zoom', 'flip', 'collage'] as AnimationType[]).map(a => (
                      <button
                        key={a}
                        onClick={() => setAnimation(a)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          animation === a ? 'bg-blue-500 text-white' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Intervall:</span>
                  <input
                    type="range"
                    min={3}
                    max={15}
                    value={intervalSec}
                    onChange={e => setIntervalSec(Number(e.target.value))}
                    className="w-24 accent-blue-500"
                  />
                  <span className="text-xs text-white font-mono">{intervalSec}s</span>
                </div>
                <div className="text-xs text-white/40">
                  {photos.length} Medien • Foto {currentIndex + 1}/{photos.length}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">QR-Code scannen</h2>
                <IconButton
                  icon={<X className="w-5 h-5" />}
                  onClick={() => setShowQR(false)}
                  variant="ghost"
                  size="sm"
                  aria-label="Schließen"
                  title="Schließen"
                />
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="QR Code" className="w-full rounded-lg" />
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Scanne diesen Code, um die Live-Wall zu öffnen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className={viewMode === 'slideshow' ? 'text-white/60' : 'text-muted-foreground'}>Lade Fotos...</p>
          </div>
        </div>
      ) : photos.length === 0 ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Heart className={`w-16 h-16 mx-auto mb-4 opacity-30 ${viewMode === 'slideshow' ? 'text-white/30' : 'text-muted-foreground'}`} />
            <p className={`text-xl font-semibold mb-2 ${viewMode === 'slideshow' ? 'text-white' : 'text-foreground'}`}>Noch keine Fotos</p>
            <p className={viewMode === 'slideshow' ? 'text-white/50' : 'text-muted-foreground'}>Die ersten Fotos werden hier angezeigt</p>
          </div>
        </div>
      ) : viewMode === 'slideshow' ? (
        /* ═══ SLIDESHOW MODE ═══ */
        <div className="relative flex items-center justify-center" style={{ height: 'calc(100vh - 56px)' }}>
          <AnimatePresence mode="wait">
            {currentPhoto && (
              <motion.div
                key={currentPhoto.id + '-' + currentIndex}
                {...ANIMATION_VARIANTS[animation]}
                className="absolute inset-0 flex items-center justify-center p-8"
                style={{ perspective: '1200px' }}
              >
                <div className="relative max-w-full max-h-full">
                  <img
                    src={currentPhoto.url}
                    alt=""
                    className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
                  />
                  {/* Source badges */}
                  {currentPhoto.isGuestbookEntry && currentPhoto.guestbookEntry && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/70 backdrop-blur-sm rounded-xl px-5 py-3">
                        <div className="flex items-center gap-2 text-white">
                          <MessageCircle className="w-5 h-5 text-blue-400" />
                          <span className="font-semibold">{currentPhoto.guestbookEntry.authorName}</span>
                        </div>
                        <p className="text-white/80 text-sm mt-1">{currentPhoto.guestbookEntry.message}</p>
                      </div>
                    </div>
                  )}
                  {currentPhoto.isChallengeCompletion && currentPhoto.challenge && (
                    <div className="absolute top-4 right-4">
                      <div className="bg-yellow-400 text-yellow-900 rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        <span className="font-bold">{currentPhoto.challenge.emoji || '🏆'} {currentPhoto.challenge.title}</span>
                      </div>
                    </div>
                  )}
                  {currentPhoto.isStory && currentPhoto.story && (
                    <div className="absolute top-4 left-4">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
                        <Video className="w-5 h-5" />
                        <span className="font-bold">{currentPhoto.story.uploaderName}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <motion.div
              key={currentIndex}
              className="h-full bg-blue-500"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: intervalSec, ease: 'linear' }}
            />
          </div>
        </div>
      ) : (
        /* ═══ GRID MODE ═══ */
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            <AnimatePresence>
              {photos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="break-inside-avoid mb-4"
                >
                  <div className="relative group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white">
                    <img src={photo.url} alt="" className="w-full h-auto object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {photo.isGuestbookEntry && photo.guestbookEntry && (
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                          <div className="flex items-start gap-2">
                            <MessageCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{photo.guestbookEntry.authorName}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{photo.guestbookEntry.message}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {photo.isChallengeCompletion && photo.challenge && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                          <Trophy className="w-4 h-4" />
                          <span className="text-xs font-bold">{photo.challenge.emoji || '🏆'} {photo.challenge.title}</span>
                        </div>
                      </div>
                    )}
                    {photo.isStory && photo.story && (
                      <div className="absolute top-3 left-3">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                          <Video className="w-4 h-4" />
                          <span className="text-xs font-bold">{photo.story.uploaderName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
