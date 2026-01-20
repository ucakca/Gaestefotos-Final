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
  ChevronLeft
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import * as QRCode from 'qrcode';

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

  // Generate QR Code
  useEffect(() => {
    if (typeof window !== 'undefined' && eventId) {
      const url = window.location.href;
      QRCode.toDataURL(url, { width: 300, margin: 2 })
        .then(setQrDataUrl)
        .catch(console.error);
    }
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEventTitle(data.event?.title || 'Live Wall');
    } catch (err) {
      console.error('Failed to load event:', err);
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
      console.error('Failed to load photos:', err);
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

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-app-bg via-app-card to-app-bg"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 bg-app-card/95 backdrop-blur-sm border-b border-app-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
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
              <h1 className="text-xl font-bold text-app-fg">{eventTitle}</h1>
              <p className="text-sm text-app-muted">Live Foto-Wall</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQR(!showQR)}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR-Code</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Teilen</span>
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
              className="bg-app-card rounded-2xl p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-app-fg">QR-Code scannen</h2>
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
              <p className="text-sm text-app-muted mt-4 text-center">
                Scanne diesen Code, um die Live-Wall zu öffnen
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Countdown Banner */}
      <AnimatePresence>
        {showCountdown && countdown && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-[73px] z-40 bg-gradient-to-r from-app-accent via-purple-600 to-pink-600 text-white shadow-lg"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-6 h-6 animate-pulse" />
                <span className="text-lg sm:text-2xl font-bold">{countdown}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto mb-4"></div>
              <p className="text-app-muted">Lade Fotos...</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Heart className="w-16 h-16 text-app-muted mx-auto mb-4 opacity-30" />
              <p className="text-xl font-semibold text-app-fg mb-2">Noch keine Fotos</p>
              <p className="text-app-muted">Die ersten Fotos werden hier angezeigt</p>
            </div>
          </div>
        ) : (
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
                    <img
                      src={photo.url}
                      alt=""
                      className="w-full h-auto object-cover"
                      loading="lazy"
                    />
                    
                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Guestbook Message */}
                    {photo.isGuestbookEntry && photo.guestbookEntry && (
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="absolute bottom-3 left-3 right-3"
                      >
                        <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                          <div className="flex items-start gap-2">
                            <MessageCircle className="w-4 h-4 text-app-accent mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-app-fg truncate">
                                {photo.guestbookEntry.authorName}
                              </p>
                              <p className="text-xs text-app-muted line-clamp-2">
                                {photo.guestbookEntry.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Challenge Badge */}
                    {photo.isChallengeCompletion && photo.challenge && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3"
                      >
                        <div className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                          <Trophy className="w-4 h-4" />
                          <span className="text-xs font-bold">
                            {photo.challenge.emoji || '🏆'} {photo.challenge.title}
                          </span>
                        </div>
                      </motion.div>
                    )}

                    {/* Story Indicator */}
                    {photo.isStory && photo.story && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 left-3"
                      >
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
                          <Video className="w-4 h-4" />
                          <span className="text-xs font-bold">{photo.story.uploaderName}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
