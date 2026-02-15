'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Download, MoreHorizontal } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import { buildApiUrl } from '@/lib/api';
import api from '@/lib/api';

/**
 * PhotoGrid - v0-Style Photo Grid
 * 
 * Cleaner implementation than ModernPhotoGrid (41KB → ~400 LOC)
 * 
 * Features:
 * - Masonry layout (Pinterest-style)
 * - Double-tap to like
 * - Infinite scroll (Intersection Observer)
 * - Lazy loading images
 * - Hover states with actions
 * - Click to open lightbox
 * 
 * Props integration with existing API hooks via useGuestEventData
 */

export interface PhotoGridProps {
  photos: Photo[];
  eventId: string;
  eventSlug?: string;
  
  // Permissions
  allowDownloads?: boolean;
  allowComments?: boolean;
  
  // Callbacks
  onPhotoClick?: (photo: Photo, index: number) => void;
  onUploadSuccess?: () => void;
  
  // Infinite scroll
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  
  // State
  isStorageLocked?: boolean;
  uploadDisabled?: boolean;
  
  // External like updates (from Lightbox)
  externalLikeUpdates?: Record<string, { liked: boolean; count: number }>;
}

// Helper: Get the real photo ID for API calls (challenge photos have fake IDs)
const getRealPhotoId = (photo: any): string | null => {
  if (photo.isChallengePhoto && photo.photoId) {
    return photo.photoId;
  }
  if (typeof photo.id === 'string' && photo.id.startsWith('challenge-')) {
    return photo.photoId || null;
  }
  return photo.id;
};

export default function PhotoGrid({
  photos,
  eventId,
  eventSlug,
  allowDownloads = true,
  allowComments = true,
  onPhotoClick,
  onUploadSuccess,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  isStorageLocked = false,
  uploadDisabled = false,
  externalLikeUpdates,
}: PhotoGridProps) {
  // Like state
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Sync external like updates from Lightbox
  useEffect(() => {
    if (!externalLikeUpdates) return;
    Object.entries(externalLikeUpdates).forEach(([photoId, { liked, count }]) => {
      setLikeCounts((prev) => ({ ...prev, [photoId]: count }));
      setLikedPhotos((prev) => {
        const newSet = new Set(prev);
        if (liked) {
          newSet.add(photoId);
        } else {
          newSet.delete(photoId);
        }
        return newSet;
      });
    });
  }, [externalLikeUpdates]);
  
  // Double-tap tracking
  const lastTapRef = useRef<{ photoId: string; time: number } | null>(null);
  const DOUBLE_TAP_DELAY = 300; // ms

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Load like count for a photo
  const loadLikeCount = useCallback(async (photoId: string, photo?: any) => {
    const realId = photo ? getRealPhotoId(photo) : photoId;
    if (!realId) return;
    try {
      const response = await api.get(`/photos/${realId}/likes`);
      setLikeCounts((prev) => ({
        ...prev,
        [photoId]: response.data.likeCount || 0,
      }));
      const liked = response.data?.liked ?? response.data?.isLiked;
      if (liked) {
        setLikedPhotos((prev) => new Set(prev).add(photoId));
      }
    } catch (err) {
      void err;
    }
  }, []);

  // Toggle like
  const toggleLike = useCallback(async (photoId: string, photo?: any) => {
    const realId = photo ? getRealPhotoId(photo) : photoId;
    if (!realId) return;
    try {
      const response = await api.post(`/photos/${realId}/like`);
      setLikedPhotos((prev) => {
        const newSet = new Set(prev);
        if (response.data.liked) {
          newSet.add(photoId);
        } else {
          newSet.delete(photoId);
        }
        return newSet;
      });
      setLikeCounts((prev) => ({
        ...prev,
        [photoId]: response.data.likeCount || 0,
      }));
    } catch (err) {
      void err;
    }
  }, []);

  // Handle double-tap like
  const handlePhotoTap = useCallback((photo: Photo, index: number) => {
    const now = Date.now();
    const last = lastTapRef.current;

    if (last && last.photoId === photo.id && now - last.time < DOUBLE_TAP_DELAY) {
      // Double tap detected - like the photo
      toggleLike(photo.id, photo);
      lastTapRef.current = null; // Reset
    } else {
      // Single tap - open lightbox after delay to detect double tap
      lastTapRef.current = { photoId: photo.id, time: now };
      setTimeout(() => {
        if (lastTapRef.current?.photoId === photo.id && lastTapRef.current?.time === now) {
          // Still the same tap - no double tap occurred
          onPhotoClick?.(photo, index);
        }
      }, DOUBLE_TAP_DELAY);
    }
  }, [toggleLike, onPhotoClick]);

  // Download photo
  const handleDownload = useCallback((photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!allowDownloads) return;
    const realId = getRealPhotoId(photo);
    if (!realId) return;
    const url = buildApiUrl(`/photos/${realId}/download`);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [allowDownloads]);

  // Share photo
  const handleShare = useCallback(async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = eventSlug
      ? `${window.location.origin}/e3/${eventSlug}?photo=${photo.id}`
      : photo.url || '';

    if (navigator.share && photo.url) {
      try {
        await navigator.share({
          title: 'Event Foto',
          text: 'Schau dir dieses Foto an!',
          url: shareUrl,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [eventSlug]);

  // Like button click (for hover state)
  const handleLikeClick = useCallback((photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(photo.id, photo);
  }, [toggleLike]);

  // Load likes lazily - only when user interacts, not on mount
  // This prevents browser overload from too many concurrent requests
  // Likes will be loaded on-demand when user clicks like button

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4"
        >
          <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </motion.div>
        <p className="text-muted-foreground text-lg font-medium mb-2">Noch keine Fotos</p>
        <p className="text-muted-foreground text-sm">Lade als Erster ein Foto hoch!</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="columns-2 sm:columns-2 lg:columns-3 xl:columns-4 gap-2 sm:gap-3 md:gap-6">
        {photos.map((photo, index) => {
          const isLiked = likedPhotos.has(photo.id);
          const likeCount = likeCounts[photo.id] || 0;

          return (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              className="mb-3 md:mb-6 relative group cursor-pointer break-inside-avoid"
              onClick={() => handlePhotoTap(photo, index)}
            >
              {/* Photo Card */}
              <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-2xl transition-all duration-300">
                {/* Image */}
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1}`}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />

                {/* Challenge Badge (always visible if photo is from challenge) */}
                {(photo as any).challengeId && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">🏆</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {(photo as any).challengeTitle || 'Challenge'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gradient Overlay (appears on hover) */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 ${(photo as any).challengeId ? 'opacity-0' : 'opacity-0'} group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Hover Actions (bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center justify-between">
                    {/* Like Button — with particle burst */}
                    <motion.button
                      onClick={(e) => handleLikeClick(photo, e)}
                      className="relative flex items-center gap-2 px-3 py-2 bg-card/20 backdrop-blur-md rounded-full text-white hover:bg-card/30 transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      >
                        <Heart
                          className={`w-5 h-5 transition-colors duration-200 ${isLiked ? 'fill-red-500 text-destructive' : ''}`}
                        />
                      </motion.div>
                      {likeCount > 0 && (
                        <span className="text-sm font-medium">{likeCount}</span>
                      )}
                      {/* Particle burst */}
                      <AnimatePresence>
                        {isLiked && Array.from({ length: 6 }).map((_, i) => (
                          <motion.div
                            key={`pb-${photo.id}-${i}`}
                            className="absolute top-1/2 left-4 w-1 h-1 rounded-full bg-destructive/80"
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                            animate={{
                              x: Math.cos((i / 6) * Math.PI * 2) * 16,
                              y: Math.sin((i / 6) * Math.PI * 2) * 16,
                              scale: 0,
                              opacity: 0,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.button>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Comment Icon (if enabled) */}
                      {allowComments && (
                        <motion.button
                          className="p-2 bg-card/20 backdrop-blur-md rounded-full text-white hover:bg-card/30 transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          <MessageCircle className="w-5 h-5" />
                        </motion.button>
                      )}

                      {/* Share */}
                      <motion.button
                        onClick={(e) => handleShare(photo, e)}
                        className="p-2 bg-card/20 backdrop-blur-md rounded-full text-white hover:bg-card/30 transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        <Share2 className="w-5 h-5" />
                      </motion.button>

                      {/* Download (if enabled) */}
                      {allowDownloads && (
                        <motion.button
                          onClick={(e) => handleDownload(photo, e)}
                          className="p-2 bg-card/20 backdrop-blur-md rounded-full text-white hover:bg-card/30 transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          <Download className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Like Animation (Double-tap feedback) — enhanced */}
                <AnimatePresence>
                  {isLiked && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <Heart className="w-20 h-20 fill-white text-white drop-shadow-2xl" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="py-8 text-center">
          {loadingMore ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-8 h-8 border-4 border-muted-foreground border-t-primary rounded-full"
            />
          ) : (
            <p className="text-muted-foreground text-sm">Scroll für mehr...</p>
          )}
        </div>
      )}
    </div>
  );
}
