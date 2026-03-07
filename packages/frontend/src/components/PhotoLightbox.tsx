'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Share2, Download, MoreHorizontal, MessageCircle, Send, User, Trophy, Star } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { buildApiUrl } from '@/lib/api';
import { usePhotoInteractions, REACTIONS, REACTION_KEYS } from '@/components/hooks/usePhotoInteractions';

const MotionIconButton = motion(IconButton);
const MotionButton = motion(Button);

interface PhotoLightboxProps {
  photos: Photo[];
  selectedIndex: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
  allowDownloads: boolean;
  allowComments: boolean;
  isStorageLocked: boolean;
  eventSlug?: string;
  eventTitle: string;
}

function getUnderlyingPhotoId(photo: Photo | undefined | null): string | null {
  if (!photo) return null;
  const isGuestbookEntry = !!(photo as any).isGuestbookEntry;
  if (isGuestbookEntry) return null;
  const id = (photo as any).photoId || photo.id;
  if (!id || typeof id !== 'string') return null;
  if (id.startsWith('challenge-') || id.startsWith('guestbook-')) return null;
  return id;
}

function getDisplayName(photo: any, eventTitle: string): string {
  if (photo?.isChallengePhoto) {
    if (photo?.completion?.uploaderName?.trim()) return photo.completion.uploaderName;
    if (photo?.uploadedBy?.trim()) return photo.uploadedBy;
    return eventTitle;
  }
  if (photo?.isGuestbookEntry && photo?.guestbookEntry?.authorName) {
    return photo.guestbookEntry.authorName;
  }
  if (photo?.uploadedBy?.trim()) return photo.uploadedBy;
  return eventTitle;
}

function getDisplayInitial(photo: any, eventTitle: string): string {
  return getDisplayName(photo, eventTitle).charAt(0).toUpperCase();
}

export default function PhotoLightbox({
  photos,
  selectedIndex,
  onClose,
  onNavigate,
  allowDownloads,
  allowComments,
  isStorageLocked,
  eventSlug,
  eventTitle,
}: PhotoLightboxProps) {
  const downloadsEnabled = allowDownloads && !isStorageLocked;
  const {
    likedPhotos,
    likeCounts,
    myReactions,
    reactionCounts,
    customReactionInput,
    setCustomReactionInput,
    comments,
    commentText,
    setCommentText,
    authorName,
    setAuthorName,
    loadingComments,
    submittingComment,
    commentNotice,
    commentError,
    loadLikeCount,
    toggleLike,
    loadComments,
    submitComment,
    resetNotices,
  } = usePhotoInteractions();

  const photo = selectedIndex !== null ? photos[selectedIndex] : null;
  const photoId = getUnderlyingPhotoId(photo);

  useEffect(() => {
    if (selectedIndex !== null && photo) {
      resetNotices();
      const isGuestbookEntry = !!(photo as any).isGuestbookEntry;
      const isChallengePhoto = !!(photo as any).isChallengePhoto;
      const underlyingPhotoId = (photo as any).photoId || photo.id;

      if (!isGuestbookEntry && underlyingPhotoId && typeof underlyingPhotoId === 'string') {
        const isFake = underlyingPhotoId.startsWith('challenge-') || underlyingPhotoId.startsWith('guestbook-');
        if (!isFake) {
          loadLikeCount(underlyingPhotoId);
          if (allowComments && !isChallengePhoto) {
            loadComments(underlyingPhotoId);
          }
        }
      }
    }
  }, [allowComments, selectedIndex]);

  const prevPhoto = () => {
    if (selectedIndex !== null) {
      onNavigate((selectedIndex - 1 + photos.length) % photos.length);
    }
  };

  const nextPhoto = () => {
    if (selectedIndex !== null) {
      onNavigate((selectedIndex + 1) % photos.length);
    }
  };

  const handleDownload = (p: Photo) => {
    if (!downloadsEnabled) return;
    const url = buildApiUrl(`/photos/${p.id}/download`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async (p: Photo) => {
    const shareUrl = eventSlug
      ? `${window.location.origin}/e2/${eventSlug}?photo=${p.id}`
      : p.url || '';

    if (navigator.share && p.url) {
      try {
        await navigator.share({ title: eventTitle, text: 'Schau dir dieses Event-Foto an!', url: shareUrl });
      } catch {
        navigator.clipboard.writeText(shareUrl);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  if (selectedIndex === null || !photo) return null;

  return (
    <Dialog open={selectedIndex !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row bg-card border border-border p-0">
        {/* Close Button */}
        <MotionIconButton
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          icon={<X className="w-6 h-6" />}
          variant="ghost"
          size="sm"
          aria-label="Schließen"
          title="Schließen"
          className="absolute top-4 right-4 text-background hover:opacity-80 z-10 p-2"
        />

        {/* Navigation Buttons */}
        {photos.length > 1 && (
          <>
            <MotionIconButton
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={prevPhoto}
              icon={<ChevronLeft className="w-6 h-6" />}
              variant="ghost"
              size="sm"
              aria-label="Vorheriges Foto"
              title="Vorheriges Foto"
              className="absolute left-4 text-background hover:opacity-80 z-10 p-2 bg-foreground/50 rounded-full"
            />
            <MotionIconButton
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={nextPhoto}
              icon={<ChevronRight className="w-6 h-6" />}
              variant="ghost"
              size="sm"
              aria-label="Nächstes Foto"
              title="Nächstes Foto"
              className="absolute right-4 text-background hover:opacity-80 z-10 p-2 bg-foreground/50 rounded-full"
            />
          </>
        )}

        {/* Image Section */}
        <div className="relative bg-foreground flex-1 flex items-center justify-center min-h-[400px] md:min-h-[600px] max-h-[90vh] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              drag={photos.length > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (photos.length <= 1) return;
                const threshold = 60;
                if (info.offset.x > threshold) { prevPhoto(); return; }
                if (info.offset.x < -threshold) { nextPhoto(); }
              }}
              className="relative w-full h-full flex items-center justify-center p-4 select-none touch-pan-y"
            >
              <img
                src={photo.url?.startsWith('/api/') ? photo.url : photo.url || ''}
                alt="Event Foto"
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                onError={(e) => {
                  const url = photo.url;
                  if (url && url.startsWith('/api/')) {
                    (e.target as HTMLImageElement).src = window.location.origin + url;
                  }
                }}
              />

              {/* Challenge Photo Badge on Full Image */}
              {(photo as any)?.isChallengePhoto && (photo as any)?.challenge && (
                <div className="absolute top-4 right-4 z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="rounded-full p-3 shadow-xl bg-status-warning"
                  >
                    <Trophy className="w-6 h-6 text-foreground" />
                  </motion.div>
                </div>
              )}

              {/* Guestbook Entry Speech Bubble on Full Image */}
              {(photo as any)?.isGuestbookEntry && (photo as any)?.guestbookEntry && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-card border border-border rounded-lg px-4 py-3 shadow-xl max-w-md mx-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-status-warning to-primary flex items-center justify-center">
                        <User className="w-4 h-4 text-background" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {(photo as any)?.guestbookEntry?.authorName}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {(photo as any)?.guestbookEntry?.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Challenge Photo Speech Bubble on Full Image */}
              {(photo as any)?.isChallengePhoto && (photo as any)?.challenge && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-gradient-to-r from-background to-card rounded-lg px-4 py-3 shadow-xl max-w-md mx-auto border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-status-warning" />
                      <span className="text-sm font-semibold text-foreground">
                        {(photo as any)?.challenge?.title}
                      </span>
                    </div>
                    {(photo as any)?.challenge?.description && (
                      <p className="text-sm text-foreground mb-2 whitespace-pre-wrap">
                        {(photo as any)?.challenge?.description}
                      </p>
                    )}
                    {(photo as any)?.completion && (
                      <div className="text-xs text-muted-foreground">
                        Erfüllt von: {(photo as any)?.completion?.guest
                          ? `${(photo as any)?.completion?.guest?.firstName} ${(photo as any)?.completion?.guest?.lastName}`
                          : (photo as any)?.completion?.uploaderName || 'Anonym'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col bg-card border-t md:border-t-0 md:border-l border-border max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground">
                  {getDisplayInitial(photo, eventTitle)}
                </span>
              </div>
              <span className="font-semibold text-sm text-foreground">
                {getDisplayName(photo, eventTitle)}
              </span>
            </div>
            <IconButton
              icon={<MoreHorizontal className="w-5 h-5" />}
              variant="ghost"
              size="sm"
              aria-label="Mehr"
              title="Mehr"
              className="p-1 text-muted-foreground"
            />
          </div>

          {/* Actions */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-4 mb-3">
              <MotionButton
                whileTap={{ scale: 0.9 }}
                onClick={() => { if (photoId) toggleLike(photoId, 'heart'); }}
                variant="ghost"
                size="sm"
                aria-label="Gefällt mir"
                title="Gefällt mir"
                className="p-1 flex items-center gap-2"
              >
                <Heart
                  className={`w-6 h-6 ${
                    likedPhotos.has(photoId || '')
                      ? 'fill-status-warning text-status-warning'
                      : 'text-foreground'
                  }`}
                />
                {likeCounts[photoId || ''] > 0 && (
                  <span className="text-sm font-medium text-foreground">
                    {likeCounts[photoId || '']}
                  </span>
                )}
              </MotionButton>
              <MotionButton
                whileTap={{ scale: 0.9 }}
                onClick={() => handleShare(photo)}
                variant="ghost"
                size="sm"
                aria-label="Teilen"
                title="Teilen"
                className="p-1"
              >
                <Share2 className="w-6 h-6 text-foreground" />
              </MotionButton>
              {downloadsEnabled && (
                <MotionButton
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDownload(photo)}
                  variant="ghost"
                  size="sm"
                  aria-label="Download"
                  title="Download"
                  className="p-1"
                >
                  <Download className="w-6 h-6 text-foreground" />
                </MotionButton>
              )}
            </div>

            {/* Like Count */}
            {likeCounts[photoId || ''] > 0 && (
              <div className="text-sm font-semibold text-foreground mb-3">
                {likeCounts[photoId || '']} {likeCounts[photoId || ''] === 1 ? 'Like' : 'Likes'}
              </div>
            )}

            {/* Reactions */}
            {(() => {
              if (!photoId) return null;
              const counts = reactionCounts[photoId];
              const hasCounts = counts && Object.keys(counts).length > 0;
              if (!hasCounts) return null;

              const customEntries = Object.entries(counts)
                .filter(([key]) => !REACTION_KEYS.has(key))
                .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                .slice(0, 12);

              return (
                <div className="flex items-center gap-2 flex-wrap">
                  {REACTIONS.map((r) => {
                    const c = counts?.[r.key] || 0;
                    const active = myReactions[photoId] === r.key;
                    return (
                      <Button
                        key={r.key}
                        type="button"
                        onClick={() => toggleLike(photoId, r.key)}
                        variant="ghost"
                        size="sm"
                        className={`px-2 py-1 rounded-full border text-sm ${
                          active ? 'border-foreground bg-background' : 'border-border bg-card'
                        }`}
                      >
                        <span className="mr-1">{r.label}</span>
                        {c > 0 ? <span className="text-foreground">{c}</span> : <span className="text-muted-foreground">0</span>}
                      </Button>
                    );
                  })}

                  {customEntries.map(([key, c]) => {
                    const active = myReactions[photoId] === key;
                    return (
                      <Button
                        key={key}
                        type="button"
                        onClick={() => toggleLike(photoId, key)}
                        variant="ghost"
                        size="sm"
                        className={`px-2 py-1 rounded-full border text-sm ${
                          active ? 'border-foreground bg-background' : 'border-border bg-card'
                        }`}
                      >
                        <span className="mr-1">{key}</span>
                        {c > 0 ? <span className="text-foreground">{c}</span> : <span className="text-muted-foreground">0</span>}
                      </Button>
                    );
                  })}

                  <div className="flex items-center gap-2">
                    <Input
                      value={customReactionInput}
                      onChange={(e) => setCustomReactionInput(e.target.value)}
                      placeholder="Emoji…"
                      className="px-2 py-1 border border-border bg-card text-foreground rounded-full text-sm w-24"
                      inputMode="text"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const v = customReactionInput.trim();
                        if (!v) return;
                        void toggleLike(photoId, v);
                      }}
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 rounded-full border border-border bg-card text-sm"
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Comments Section */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {!allowComments ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Kommentare sind deaktiviert</p>
              </div>
            ) : loadingComments.has(photoId || '') ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
              </div>
            ) : (comments[photoId || ''] || []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Noch keine Kommentare</p>
                <p className="text-xs mt-1 opacity-70">Sei der Erste, der kommentiert!</p>
              </div>
            ) : (
              (comments[photoId || ''] || []).map((comment: any) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-status-warning flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString('de-DE', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {comment.comment}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className="border-t border-border p-4 bg-card">
            <div className="space-y-2">
              {commentNotice && (
                <div className="text-xs text-foreground bg-background border border-border rounded-lg px-3 py-2">
                  {commentNotice}
                </div>
              )}
              {commentError && (
                <div className="text-xs text-destructive bg-background border border-status-danger rounded-lg px-3 py-2">
                  {commentError}
                </div>
              )}
              <Input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Dein Name"
                className="w-full px-3 py-2 text-sm"
                disabled={submittingComment || !allowComments}
                maxLength={100}
              />
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Schreibe einen Kommentar..."
                  className="flex-1 px-3 py-2 text-sm"
                  disabled={submittingComment || !allowComments}
                  maxLength={1000}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (photoId) submitComment(photoId);
                    }
                  }}
                />
                <MotionButton
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { if (photoId) submitComment(photoId); }}
                  disabled={
                    !allowComments ||
                    submittingComment ||
                    !commentText.trim() ||
                    !authorName.trim() ||
                    !photoId
                  }
                  variant="primary"
                  size="sm"
                  aria-label="Kommentar senden"
                  title="Kommentar senden"
                  className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingComment ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </MotionButton>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
