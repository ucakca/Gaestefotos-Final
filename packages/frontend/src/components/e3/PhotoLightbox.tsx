'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Send,
  User,
  Trophy,
  Star,
} from 'lucide-react';
import StarRating from '@/components/ui/StarRating';
import { Photo } from '@gaestefotos/shared';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { buildApiUrl } from '@/lib/api';
import api from '@/lib/api';

// Helper: Get the real photo ID for API calls (challenge photos have fake IDs)
const getRealPhotoId = (photo: any): string | null => {
  if (photo?.isChallengePhoto && photo?.photoId) {
    return photo.photoId;
  }
  if (typeof photo?.id === 'string' && photo.id.startsWith('challenge-')) {
    return photo.photoId || null;
  }
  return photo?.id || null;
};

/**
 * PhotoLightbox - v0-Style Fullscreen Photo Viewer
 * 
 * Fullscreen modal for viewing photos with advanced features:
 * - Swipe/keyboard navigation
 * - Pinch zoom (mobile)
 * - Like/Comment system
 * - Share/Download actions
 * - Smooth transitions
 * 
 * Integrates with existing API via PhotoGrid
 */

export interface PhotoLightboxProps {
  photos: Photo[];
  selectedIndex: number | null;
  eventSlug?: string;
  eventTitle?: string;
  allowDownloads?: boolean;
  allowComments?: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onLikeChange?: (photoId: string, liked: boolean, likeCount: number) => void;
}

interface Comment {
  id: string;
  comment: string;
  authorName: string;
  createdAt: string;
  status?: string;
}

// Animated Share Button with Send fly-out
function ShareButtonAnimated({ onShare }: { onShare: () => void }) {
  const [isSending, setIsSending] = useState(false);

  return (
    <motion.button
      onClick={() => {
        setIsSending(true);
        setTimeout(() => setIsSending(false), 1200);
        onShare();
      }}
      className="p-1 relative"
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={isSending ? { scale: [1, 0.8, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Share2 className="w-7 h-7 text-white" />
      </motion.div>
      <AnimatePresence>
        {isSending && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5], x: [0, 15, 40], y: [0, -20, -40] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Send className="w-5 h-5 text-success/80" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function PhotoLightbox({
  photos,
  selectedIndex,
  eventSlug,
  eventTitle,
  allowDownloads = true,
  allowComments = true,
  onClose,
  onNext,
  onPrev,
  onLikeChange,
}: PhotoLightboxProps) {
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [photoRatings, setPhotoRatings] = useState<Record<string, { average: number; count: number; userRating: number | null }>>({}); 
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Swipe threshold in pixels
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && onNext) {
      onNext();
    } else if (isRightSwipe && onPrev) {
      onPrev();
    }
  };

  const isOpen = selectedIndex !== null;
  const currentPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  // Load like count and comments for current photo
  useEffect(() => {
    if (!currentPhoto) return;

    const loadPhotoData = async () => {
      const realId = getRealPhotoId(currentPhoto);
      if (!realId) return;
      try {
        // Load likes
        const likesRes = await api.get(`/photos/${realId}/likes`);
        setLikeCounts((prev) => ({
          ...prev,
          [currentPhoto.id]: likesRes.data.likeCount || 0,
        }));
        const liked = likesRes.data?.liked ?? likesRes.data?.isLiked;
        if (liked) {
          setLikedPhotos((prev) => new Set(prev).add(currentPhoto.id));
        }

        // Load comments (if enabled)
        if (allowComments && !comments[currentPhoto.id]) {
          const commentsRes = await api.get(`/photos/${realId}/comments`);
          setComments((prev) => ({
            ...prev,
            [currentPhoto.id]: commentsRes.data.comments || [],
          }));
        }

        // Load ratings
        if (!photoRatings[currentPhoto.id]) {
          try {
            const ratingsRes = await api.get(`/photos/${realId}/votes`);
            setPhotoRatings((prev) => ({
              ...prev,
              [currentPhoto.id]: {
                average: ratingsRes.data.averageRating || 0,
                count: ratingsRes.data.voteCount || 0,
                userRating: ratingsRes.data.userVote || null,
              },
            }));
          } catch {
            // Votes endpoint might not exist for all photos
          }
        }
      } catch (err) {
        void err;
      }
    };

    loadPhotoData();
  }, [currentPhoto, allowComments]);

  // Toggle like
  const toggleLike = useCallback(async () => {
    if (!currentPhoto) return;
    const realId = getRealPhotoId(currentPhoto);
    if (!realId) return;

    try {
      const response = await api.post(`/photos/${realId}/like`);
      setLikedPhotos((prev) => {
        const newSet = new Set(prev);
        if (response.data.liked) {
          newSet.add(currentPhoto.id);
        } else {
          newSet.delete(currentPhoto.id);
        }
        return newSet;
      });
      const newLikeCount = response.data.likeCount || 0;
      setLikeCounts((prev) => ({
        ...prev,
        [currentPhoto.id]: newLikeCount,
      }));
      // Notify parent about like change
      onLikeChange?.(currentPhoto.id, response.data.liked, newLikeCount);
    } catch (err) {
      void err;
    }
  }, [currentPhoto, onLikeChange]);

  // Submit comment
  const submitComment = useCallback(async () => {
    if (!currentPhoto || !commentText.trim() || !authorName.trim()) return;

    const realId = getRealPhotoId(currentPhoto);
    if (!realId) return;

    try {
      setSubmittingComment(true);
      const response = await api.post(`/photos/${realId}/comments`, {
        comment: commentText.trim(),
        authorName: authorName.trim(),
      });

      const created = response.data?.comment;
      const status = String(created?.status || '').toUpperCase();

      if (status === 'APPROVED' || status !== 'PENDING') {
        setComments((prev) => ({
          ...prev,
          [currentPhoto.id]: [...(prev[currentPhoto.id] || []), created],
        }));
      }

      setCommentText('');
      // Keep authorName for next comment
    } catch (err) {
      void err;
    } finally {
      setSubmittingComment(false);
    }
  }, [currentPhoto, commentText, authorName]);

  // Rate photo
  const handleRate = useCallback(async (rating: number) => {
    if (!currentPhoto) return;
    const realId = getRealPhotoId(currentPhoto);
    if (!realId) return;

    try {
      const response = await api.post(`/photos/${realId}/vote`, { rating });
      setPhotoRatings((prev) => ({
        ...prev,
        [currentPhoto.id]: {
          average: response.data.averageRating || 0,
          count: response.data.voteCount || 0,
          userRating: rating,
        },
      }));
    } catch (err) {
      void err;
    }
  }, [currentPhoto]);

  // Download photo
  const handleDownload = useCallback(() => {
    if (!currentPhoto || !allowDownloads) return;
    const realId = getRealPhotoId(currentPhoto);
    if (!realId) return;
    const url = buildApiUrl(`/photos/${realId}/download`);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [currentPhoto, allowDownloads]);

  // Share photo with branding
  const handleShare = useCallback(async () => {
    if (!currentPhoto) return;
    
    const shareUrl = eventSlug
      ? `${window.location.origin}/e3/${eventSlug}?photo=${currentPhoto.id}`
      : currentPhoto.url || '';
    const shareText = `Schau dir dieses Foto an! 📸 #gästefotos ${eventTitle ? `#${eventTitle.replace(/\s+/g, '')}` : ''}`;

    // Try to share image with branding via Web Share API (for Instagram, etc.)
    if (navigator.share && navigator.canShare) {
      try {
        // Fetch branded image from backend
        const shareImageUrl = buildApiUrl(`/photos/${currentPhoto.id}/share-image`);
        const response = await fetch(shareImageUrl, { credentials: 'include' });
        
        if (response.ok) {
          const blob = await response.blob();
          const file = new File([blob], 'foto-gaestefotos.jpg', { type: 'image/jpeg' });
          
          // Check if we can share files
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: eventTitle || 'Event Foto',
              text: shareText,
            });
            return;
          }
        }
        
        // Fallback: share URL only
        await navigator.share({
          title: eventTitle || 'Event Foto',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error - copy to clipboard
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      }
    } else {
      // No Web Share API - copy to clipboard
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    }
  }, [currentPhoto, eventSlug, eventTitle]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        onPrev?.();
      } else if (e.key === 'ArrowRight') {
        onNext?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!currentPhoto) return null;

  const isLiked = likedPhotos.has(currentPhoto.id);
  const likeCount = likeCounts[currentPhoto.id] || 0;
  const photoComments = comments[currentPhoto.id] || [];
  const currentRating = photoRatings[currentPhoto.id] || { average: 0, count: 0, userRating: null };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-full h-full p-0 bg-black/95 border-none overflow-hidden">
        <DialogTitle className="sr-only">Foto ansehen</DialogTitle>
        <DialogDescription className="sr-only">Vollbild-Ansicht des Fotos mit Navigations- und Aktionsmöglichkeiten</DialogDescription>
        <div className="relative w-full h-full flex flex-col">
          {/* Top Bar - Event Title + Close */}
          <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm border-b border-white/10">
            <div className="flex items-center justify-between p-4">
              {/* Event Title */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-base truncate">
                  {eventTitle || 'Event'}
                </p>
                <p className="text-white/60 text-xs">
                  {(selectedIndex ?? 0) + 1} von {photos.length}
                </p>
              </div>

              {/* Close Button (X) */}
              <motion.button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-card/10 transition-colors ml-4"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-7 h-7 text-white" />
              </motion.button>
            </div>
          </div>

          {/* Main Content - Contained within viewport, with swipe support */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Navigation Buttons */}
            {onPrev && selectedIndex !== null && selectedIndex > 0 && (
              <motion.button
                onClick={onPrev}
                className="absolute left-4 z-40 p-3 rounded-full bg-card/10 backdrop-blur-sm hover:bg-card/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </motion.button>
            )}

            {onNext && selectedIndex !== null && selectedIndex < photos.length - 1 && (
              <motion.button
                onClick={onNext}
                className="absolute right-4 z-40 p-3 rounded-full bg-card/10 backdrop-blur-sm hover:bg-card/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </motion.button>
            )}

            {/* Photo - Instagram style, contained in viewport */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPhoto.id}
                className="relative w-full h-full flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={currentPhoto.url}
                  alt={`Foto ${(selectedIndex ?? 0) + 1}`}
                  className="max-w-full max-h-full object-contain rounded-sm"
                  style={{ maxHeight: 'calc(100vh - 280px)' }}
                />
                
                {/* Challenge Badge */}
                {((currentPhoto as any)?.challengeId || (currentPhoto as any)?.isChallengePhoto) && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold text-sm">
                        {(currentPhoto as any)?.challengeTitle || (currentPhoto as any)?.challenge?.title || 'Challenge'}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Bar - Instagram Style Actions - Fixed at bottom with max-height */}
          <div className="flex-shrink-0 bg-black/80 backdrop-blur-sm border-t border-white/10 max-h-[40vh] overflow-y-auto">
            <div className="p-4 space-y-2">
              {/* Action Buttons Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Like — with particle burst */}
                  <motion.button
                    onClick={toggleLike}
                    className="p-1 relative"
                    whileTap={{ scale: 0.9 }}
                  >
                    <motion.div
                      animate={isLiked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    >
                      <Heart
                        className={`w-7 h-7 transition-colors duration-200 ${isLiked ? 'fill-red-500 text-destructive' : 'text-white'}`}
                      />
                    </motion.div>
                    {/* Particle burst on like */}
                    <AnimatePresence>
                      {isLiked && Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={`p-${i}`}
                          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-destructive/80"
                          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                          animate={{
                            x: Math.cos((i / 8) * Math.PI * 2) * 22,
                            y: Math.sin((i / 8) * Math.PI * 2) * 22,
                            scale: 0,
                            opacity: 0,
                          }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.button>

                  {/* Comment Icon - Shows count */}
                  {allowComments && (
                    <div className="p-1 flex items-center gap-1">
                      <MessageCircle className="w-7 h-7 text-white" />
                      {photoComments.length > 0 && (
                        <span className="text-white text-sm">{photoComments.length}</span>
                      )}
                    </div>
                  )}

                  {/* Share — with send animation */}
                  <ShareButtonAnimated onShare={handleShare} />
                </div>

                {/* Download */}
                {allowDownloads && (
                  <motion.button
                    onClick={handleDownload}
                    className="p-1"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Download className="w-7 h-7 text-white" />
                  </motion.button>
                )}
              </div>

              {/* Like Count - always show line, changes based on count */}
              <p className="text-white font-semibold text-sm">
                {likeCount > 0 
                  ? `Gefällt ${likeCount} ${likeCount === 1 ? 'Person' : 'Personen'}`
                  : 'Sei der Erste, dem das gefällt'
                }
              </p>

              {/* Star Rating */}
              <div className="flex items-center gap-2 py-1">
                <span className="text-white/60 text-sm">Bewerten:</span>
                <StarRating
                  rating={currentRating.average}
                  userRating={currentRating.userRating}
                  voteCount={currentRating.count}
                  onRate={handleRate}
                  size="md"
                />
              </div>

              {/* Uploader attribution - always visible */}
              <p className="text-white/80 text-sm">
                <span className="text-white/60">Geteilt von </span>
                <span className="font-medium">
                  {(currentPhoto as any)?.uploader?.firstName 
                    ? `${(currentPhoto as any).uploader.firstName}${(currentPhoto as any).uploader.lastName ? ` ${(currentPhoto as any).uploader.lastName}` : ''}`
                    : (currentPhoto as any)?.completion?.uploaderName 
                      || (currentPhoto as any)?.uploadedBy 
                      || (currentPhoto as any)?.uploaderName 
                      || 'Anonymer Teilnehmer'}
                </span>
              </p>

              {/* Comments Section - Always show first 5 */}
              {allowComments && (
                <div className="space-y-2">
                  {/* First 5 comments always visible */}
                  {photoComments.length > 0 && (
                    <div className="space-y-2">
                      {photoComments.slice(0, showAllComments ? undefined : 5).map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-card/20 flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white/90 text-sm">
                              <span className="font-semibold">{comment.authorName}</span>{' '}
                              <span className="text-white/70">{comment.comment}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                      {photoComments.length > 5 && !showAllComments && (
                        <button
                          onClick={() => setShowAllComments(true)}
                          className="text-white/50 text-sm hover:text-white/70 transition-colors"
                        >
                          Alle {photoComments.length} Kommentare anzeigen
                        </button>
                      )}
                    </div>
                  )}

                  {/* Comment Form - Compact */}
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Input
                      placeholder="Kommentar hinzufügen..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitComment();
                        }
                      }}
                      className="bg-transparent border-none text-white placeholder:text-white/40 text-sm p-0 h-auto"
                    />
                    {commentText.trim() && (
                      <Button
                        onClick={submitComment}
                        disabled={submittingComment || !authorName.trim()}
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80 p-0"
                      >
                        Posten
                      </Button>
                    )}
                  </div>
                  {commentText.trim() && !authorName.trim() && (
                    <Input
                      placeholder="Dein Name"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      className="bg-card/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
