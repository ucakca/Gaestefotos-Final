'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, X, ChevronLeft, ChevronRight, Send, MoreHorizontal, Download } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Photo } from '@gaestefotos/shared';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';

interface InstagramGalleryProps {
  photos: Photo[];
  allowDownloads?: boolean;
  eventSlug?: string;
  eventTitle?: string;
}

const MotionIconButton = motion(IconButton);

export default function InstagramGallery({ 
  photos, 
  allowDownloads = true, 
  eventSlug,
  eventTitle = 'Event'
}: InstagramGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

  const handleDownload = (photo: Photo) => {
    if (!allowDownloads) return;
    window.open(`/api/photos/${photo.id}/download`, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async (photo: Photo) => {
    const shareUrl = eventSlug 
      ? `${window.location.origin}/e2/${eventSlug}?photo=${photo.id}`
      : photo.url || '';

    if (navigator.share && photo.url) {
      try {
        await navigator.share({
          title: eventTitle,
          text: 'Schau dir dieses Event-Foto an!',
          url: shareUrl,
        });
      } catch (err) {
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could show a toast notification here
    });
  };

  const toggleLike = (photoId: string) => {
    setLikedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const openPost = (index: number) => {
    setSelectedPhoto(index);
  };

  const closePost = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto((selectedPhoto + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (selectedPhoto !== null) {
      setSelectedPhoto((selectedPhoto - 1 + photos.length) % photos.length);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-muted-foreground text-sm">Noch keine Fotos vorhanden</p>
      </div>
    );
  }

  return (
    <>
      {/* Instagram-like Grid - 3 columns on mobile, more on desktop */}
      <div className="grid grid-cols-3 gap-0.5 md:gap-1">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => openPost(index)}
            className="aspect-square bg-background relative group cursor-pointer overflow-hidden"
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt="Event Foto"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            {/* Hover overlay - Instagram style */}
            <div className="absolute inset-0 bg-app-fg/0 group-hover:bg-app-fg/30 transition-opacity flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 text-app-bg">
                <div className="flex items-center gap-1">
                  <Heart className="w-5 h-5 fill-current" />
                  <span className="text-sm font-semibold">0</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">0</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instagram-like Post Modal */}
      <Dialog open={selectedPhoto !== null} onOpenChange={(open) => (open ? null : closePost())}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row bg-card border border-border rounded-lg p-0">
          {/* Close Button */}
          <DialogClose asChild>
            <MotionIconButton
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePost}
              icon={<X className="w-6 h-6" />}
              variant="glass"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
              className="absolute top-4 right-4 z-10 p-2"
            />
          </DialogClose>

          {/* Navigation Buttons */}
          {photos.length > 1 && (
            <>
              <MotionIconButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                icon={<ChevronLeft className="w-6 h-6" />}
                variant="glass"
                size="sm"
                aria-label="Vorheriges Foto"
                title="Vorheriges Foto"
                className="absolute left-4 z-10 p-2 rounded-full"
              />
              <MotionIconButton
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                icon={<ChevronRight className="w-6 h-6" />}
                variant="glass"
                size="sm"
                aria-label="Nächstes Foto"
                title="Nächstes Foto"
                className="absolute right-4 z-10 p-2 rounded-full"
              />
            </>
          )}

          {/* Image Section */}
          <div className="relative bg-app-fg flex-1 flex items-center justify-center min-h-[400px] md:min-h-[600px]">
            <AnimatePresence mode="wait">
              <motion.img
                key={selectedPhoto}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                src={selectedPhoto !== null ? (photos[selectedPhoto]?.url || '') : ''}
                alt="Event Foto"
                className="max-w-full max-h-full object-contain"
              />
            </AnimatePresence>
          </div>

          {/* Sidebar - Instagram Style */}
          <div className="w-full md:w-80 flex flex-col bg-card border-t md:border-t-0 md:border-l border-border">
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {eventTitle.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-sm">{eventTitle}</span>
                  </div>
                  <IconButton
                    icon={<MoreHorizontal className="w-5 h-5" />}
                    variant="ghost"
                    size="sm"
                    aria-label="Mehr"
                    title="Mehr"
                    className="p-1"
                  />
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-4">
                    <MotionIconButton
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleLike(selectedPhoto !== null ? (photos[selectedPhoto]?.id || '') : '')}
                      icon={
                        <Heart
                          className={`w-6 h-6 ${
                            likedPhotos.has(selectedPhoto !== null ? (photos[selectedPhoto]?.id || '') : '')
                              ? 'fill-status-danger text-destructive'
                              : 'text-foreground'
                          }`}
                        />
                      }
                      variant="ghost"
                      size="sm"
                      aria-label="Gefällt mir"
                      title="Gefällt mir"
                      className="p-1"
                    />
                    <MotionIconButton
                      whileTap={{ scale: 0.9 }}
                      onClick={() => (selectedPhoto !== null ? handleShare(photos[selectedPhoto]) : null)}
                      icon={<Share2 className="w-6 h-6" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Teilen"
                      title="Teilen"
                      className="p-1"
                    />
                    {allowDownloads && (
                      <MotionIconButton
                        whileTap={{ scale: 0.9 }}
                        onClick={() => (selectedPhoto !== null ? handleDownload(photos[selectedPhoto]) : null)}
                        icon={<Download className="w-6 h-6" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Download"
                        title="Download"
                        className="p-1"
                      />
                    )}
                  </div>
                </div>

                {/* Photo Counter */}
                <div className="p-4 text-center text-sm text-muted-foreground border-t border-border mt-auto">
                  {selectedPhoto !== null ? selectedPhoto + 1 : 0} / {photos.length}
                </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

