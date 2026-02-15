'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Trophy,
  Heart,
  Camera,
  MessageCircle,
  Crown,
  Medal,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Photo } from '@gaestefotos/shared';
import * as QRCode from 'qrcode';
import api from '@/lib/api';

interface PhotoComment {
  id: string;
  comment: string;
  authorName: string;
}

interface SlideshowModeProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  eventTitle?: string;
  eventSlug?: string;
  eventId?: string;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

interface TopUploader {
  name: string;
  count: number;
}

export default function SlideshowMode({
  photos,
  isOpen,
  onClose,
  initialIndex = 0,
  eventTitle = '',
  eventSlug = '',
  eventId = '',
}: SlideshowModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSeconds] = useState(7);
  const [showControls, setShowControls] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [kenBurnsDirection, setKenBurnsDirection] = useState(0);
  const [displayedName, setDisplayedName] = useState('');
  const [currentComments, setCurrentComments] = useState<PhotoComment[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  const slideTimerRef = useRef<NodeJS.Timeout>();
  const heartIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const photoCountRef = useRef(0);

  const currentPhoto = photos[currentIndex];

  // Calculate top uploaders
  const topUploaders = useMemo((): TopUploader[] => {
    const uploaderCounts: Record<string, number> = {};
    photos.forEach((photo: any) => {
      const name = photo.uploader?.firstName 
        || photo.completion?.uploaderName 
        || photo.uploadedBy 
        || photo.uploaderName
        || photo.guestbookEntry?.authorName
        || photo.story?.uploaderName;
      if (name && name !== 'Anonymer Teilnehmer') {
        uploaderCounts[name] = (uploaderCounts[name] || 0) + 1;
      }
    });
    return Object.entries(uploaderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [photos]);

  // Get uploader name for current photo
  const currentUploaderName = useMemo(() => {
    const photo = currentPhoto as any;
    return photo?.uploader?.firstName 
      || photo?.completion?.uploaderName 
      || photo?.uploadedBy 
      || photo?.uploaderName
      || photo?.guestbookEntry?.authorName
      || photo?.story?.uploaderName
      || 'Gast';
  }, [currentPhoto]);

  // Day/Night theme based on time
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      setIsDarkTheme(hour >= 20 || hour < 6);
    };
    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load comments for current photo
  useEffect(() => {
    if (!currentPhoto || !isOpen) return;
    
    const photoId = (currentPhoto as any)?.id;
    // Skip fake IDs (guestbook, challenge, story)
    if (!photoId || typeof photoId !== 'string' || 
        photoId.startsWith('guestbook-') || 
        photoId.startsWith('challenge-') || 
        photoId.startsWith('story-')) {
      setCurrentComments([]);
      return;
    }
    
    const loadComments = async () => {
      try {
        const res = await api.get(`/photos/${photoId}/comments`);
        const comments = res.data.comments || [];
        setCurrentComments(comments.slice(0, 3)); // Show max 3 comments
      } catch {
        setCurrentComments([]);
      }
    };
    
    loadComments();
  }, [currentPhoto, isOpen]);

  // Generate QR Code
  useEffect(() => {
    if (typeof window !== 'undefined' && eventSlug) {
      const url = `${window.location.origin}/e3/${eventSlug}`;
      QRCode.toDataURL(url, { 
        width: 120, 
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [eventSlug]);

  // WebSocket for live likes
  useEffect(() => {
    if (!isOpen || !eventId) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/events/${eventId}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'like' || data.type === 'photo_liked') {
            // Spawn floating heart
            spawnFloatingHeart();
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      wsRef.current?.close();
    };
  }, [isOpen, eventId]);

  // Spawn floating heart animation
  const spawnFloatingHeart = useCallback(() => {
    const id = heartIdRef.current++;
    const x = 20 + Math.random() * 60; // 20-80% from left
    const y = 70 + Math.random() * 20; // Start from bottom area
    
    setFloatingHearts(prev => [...prev, { id, x, y }]);
    
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 3000);
  }, []);

  // Typewriter effect for uploader name
  useEffect(() => {
    if (!currentPhoto) return;
    
    setDisplayedName('');
    const name = currentUploaderName;
    let i = 0;
    
    const typeInterval = setInterval(() => {
      if (i < name.length) {
        setDisplayedName(name.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 80);
    
    return () => clearInterval(typeInterval);
  }, [currentIndex, currentUploaderName, currentPhoto]);

  // Ken Burns random direction
  useEffect(() => {
    setKenBurnsDirection(Math.floor(Math.random() * 4));
  }, [currentIndex]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!isOpen || !isPlaying || showLeaderboard) return;

    slideTimerRef.current = setTimeout(() => {
      photoCountRef.current++;
      
      // Show leaderboard every 10 photos
      if (photoCountRef.current % 10 === 0 && topUploaders.length > 0) {
        setShowLeaderboard(true);
        setTimeout(() => {
          setShowLeaderboard(false);
          setCurrentIndex((prev) => (prev + 1) % photos.length);
        }, 5000);
      } else {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      }
    }, intervalSeconds * 1000);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [isOpen, isPlaying, currentIndex, intervalSeconds, photos.length, showLeaderboard, topUploaders.length]);

  // Auto-hide controls
  useEffect(() => {
    const hideControls = () => {
      controlsTimerRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    if (showControls) hideControls();

    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls, isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case 'h':
          // Debug: spawn heart
          spawnFloatingHeart();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext, spawnFloatingHeart]);

  if (!isOpen) return null;

  // Ken Burns animation variants
  const kenBurnsVariants = [
    { scale: [1, 1.1], x: [0, 20], y: [0, 10] },
    { scale: [1.1, 1], x: [20, 0], y: [10, 0] },
    { scale: [1, 1.1], x: [0, -20], y: [0, -10] },
    { scale: [1.1, 1], x: [-20, 0], y: [-10, 0] },
  ];

  // Slide transition variants — cycle randomly for variety
  const slideTransitions = [
    { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 1.2 } },
    { initial: { opacity: 0, x: 100 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 }, transition: { duration: 0.8 } },
    { initial: { opacity: 0, y: 80 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -80 }, transition: { duration: 0.8 } },
    { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.15 }, transition: { duration: 1 } },
    { initial: { opacity: 0, scale: 1.3 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.7 }, transition: { duration: 1 } },
  ];
  const currentTransition = slideTransitions[currentIndex % slideTransitions.length];

  const themeClasses = isDarkTheme 
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950' 
    : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 ${themeClasses} overflow-hidden`}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Leaderboard Overlay */}
      <AnimatePresence>
        {showLeaderboard && topUploaders.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-blue-900/95 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: -50 }}
              className="text-center"
            >
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Camera className="w-16 h-16 text-warning mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-white mb-2">Top Fotografen</h2>
                <p className="text-white/60 mb-8">{eventTitle}</p>
              </motion.div>

              <div className="flex items-end justify-center gap-8">
                {/* 2nd Place */}
                {topUploaders[1] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center"
                  >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center mb-3 mx-auto shadow-xl">
                      <Medal className="w-12 h-12 text-foreground/80" />
                    </div>
                    <div className="bg-card/10 backdrop-blur-sm rounded-xl px-6 py-4">
                      <p className="text-white font-bold text-lg">{topUploaders[1].name}</p>
                      <p className="text-muted-foreground/50 text-sm">{topUploaders[1].count} Fotos</p>
                    </div>
                    <div className="h-20 w-24 bg-gradient-to-t from-gray-500 to-gray-400 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white/80">2</span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {topUploaders[0] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center -mt-8"
                  >
                    <motion.div
                      animate={{ y: [0, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center mb-3 mx-auto shadow-2xl ring-4 ring-yellow-300/50"
                    >
                      <Crown className="w-16 h-16 text-warning" />
                    </motion.div>
                    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl px-8 py-5 border border-yellow-500/30">
                      <p className="text-white font-bold text-xl">{topUploaders[0].name}</p>
                      <p className="text-warning/70 text-sm">{topUploaders[0].count} Fotos</p>
                    </div>
                    <div className="h-28 w-32 bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-5xl font-bold text-white">1</span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {topUploaders[2] && (
                  <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center mb-3 mx-auto shadow-xl">
                      <Award className="w-10 h-10 text-amber-200" />
                    </div>
                    <div className="bg-card/10 backdrop-blur-sm rounded-xl px-5 py-3">
                      <p className="text-white font-bold">{topUploaders[2].name}</p>
                      <p className="text-amber-300 text-sm">{topUploaders[2].count} Fotos</p>
                    </div>
                    <div className="h-16 w-20 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white/80">3</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Photo Display */}
      <div className="relative h-full w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhoto?.id}
            initial={currentTransition.initial}
            animate={currentTransition.animate}
            exit={currentTransition.exit}
            transition={currentTransition.transition}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* Ken Burns animated container */}
            <motion.div
              className="relative w-full h-full"
              animate={kenBurnsVariants[kenBurnsDirection]}
              transition={{ duration: intervalSeconds, ease: 'linear' }}
            >
              <img
                src={currentPhoto?.url || '/placeholder.svg'}
                alt="Slideshow Foto"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Hearts */}
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ 
                left: `${heart.x}%`, 
                bottom: `${100 - heart.y}%`,
                opacity: 1,
                scale: 0.5
              }}
              animate={{ 
                bottom: '100%',
                opacity: [1, 1, 0],
                scale: [0.5, 1.5, 1],
                rotate: [0, -15, 15, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: 'easeOut' }}
              className="absolute z-30 pointer-events-none"
            >
              <Heart className="w-12 h-12 text-destructive fill-red-500 drop-shadow-lg" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Challenge Badge - Bounce In */}
        <AnimatePresence>
          {((currentPhoto as any)?.challengeId || (currentPhoto as any)?.isChallengePhoto || (currentPhoto as any)?.isChallengeCompletion) && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.5 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 z-20"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full px-8 py-4 shadow-2xl flex items-center gap-4"
              >
                <Trophy className="w-8 h-8" />
                <div className="text-left">
                  <p className="text-lg font-bold">
                    {(currentPhoto as any)?.challengeTitle || (currentPhoto as any)?.challenge?.title || 'Challenge'}
                  </p>
                  {((currentPhoto as any)?.completion?.uploaderName || (currentPhoto as any)?.uploaderName) && (
                    <p className="text-sm opacity-90">
                      von {(currentPhoto as any).completion?.uploaderName || (currentPhoto as any).uploaderName}
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Bubble for Guestbook Messages */}
        <AnimatePresence>
          {((currentPhoto as any)?.guestbookEntry?.message || (currentPhoto as any)?.isGuestbookEntry) && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
              className="absolute bottom-6 left-6 z-30 max-w-xs"
            >
              <div className="bg-card rounded-2xl p-4 shadow-2xl relative">
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-card transform rotate-45" />
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {(currentPhoto as any)?.guestbookEntry?.authorName || 'Gast'}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {(currentPhoto as any)?.guestbookEntry?.message}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Bubble for Photo Comments */}
        <AnimatePresence>
          {currentComments.length > 0 && !((currentPhoto as any)?.guestbookEntry?.message) && (
            <motion.div
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
              className="absolute bottom-6 left-6 z-30 max-w-sm"
            >
              <div className="bg-card rounded-2xl p-3 shadow-2xl relative">
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-card transform rotate-45" />
                <div className="space-y-2">
                  {currentComments.map((comment, idx) => (
                    <div key={comment.id || idx} className="flex items-start gap-2">
                      <MessageCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-foreground/80">
                        <span className="font-semibold text-foreground">{comment.authorName}</span>{' '}
                        <span className="text-muted-foreground">{comment.comment}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploader Name - Dezent unten links (nur wenn kein Challenge-Foto und keine Sprechblase) */}
        {!((currentPhoto as any)?.challengeId || (currentPhoto as any)?.isChallengePhoto || (currentPhoto as any)?.isChallengeCompletion) && 
         !((currentPhoto as any)?.guestbookEntry?.message || (currentPhoto as any)?.isGuestbookEntry) &&
         currentComments.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-6 left-6 z-20"
          >
            <p className="text-white/50 text-xs">
              Geteilt von <span className="text-white/70">{displayedName}</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Floating QR Code with Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-6 right-6 z-30"
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="bg-card rounded-2xl p-4 shadow-2xl text-center"
        >
          <p className="text-sm font-bold text-foreground mb-3">📸 Mach mit!</p>
          {qrDataUrl && (
            <img src={qrDataUrl} alt="QR Code" className="w-28 h-28 rounded-lg mx-auto" />
          )}
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-border/50">
            <img 
              src="/icon-192.svg" 
              alt="Gästefotos" 
              className="w-6 h-6"
            />
            <span className="text-sm font-semibold text-foreground/80">gästefotos</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-card/20 z-30">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: intervalSeconds, ease: 'linear' }}
          key={currentIndex}
        />
      </div>

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-card/10"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="text-center">
            <p className="text-white font-semibold text-lg">{eventTitle}</p>
            <p className="text-white/60 text-sm">Live Diashow</p>
          </div>
          
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="text-white hover:bg-card/10"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:bg-card/10 h-14 w-14 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="text-white hover:bg-card/10"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
