'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Share2, Download, MoreHorizontal, MessageCircle } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import { buildApiUrl } from '@/lib/api';

interface InstagramGalleryProps {
  photos: Photo[];
  allowDownloads?: boolean;
  eventSlug?: string;
  eventTitle?: string;
}

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
    const url = buildApiUrl(`/photos/${photo.id}/download`);
    window.open(url, '_blank', 'noopener,noreferrer');
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
        <div className="w-24 h-24 rounded-full bg-app-bg flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-app-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-app-muted text-sm">Noch keine Fotos vorhanden</p>
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
            className="aspect-square bg-app-bg relative group cursor-pointer overflow-hidden"
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt="Event Foto"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-app-muted">
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
      <AnimatePresence>
        {selectedPhoto !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePost}
            className="fixed inset-0 bg-app-fg z-50 flex items-center justify-center"
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePost}
              className="absolute top-4 right-4 text-app-bg hover:opacity-80 z-10 p-2"
            >
              <X className="w-6 h-6" />
            </motion.button>

            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                  className="absolute left-4 text-app-bg hover:opacity-80 z-10 p-2 bg-app-fg/50 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                  className="absolute right-4 text-app-bg hover:opacity-80 z-10 p-2 bg-app-fg/50 rounded-full"
                >
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </>
            )}

            {/* Post Content - Instagram Style */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-card border border-app-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Image Section */}
              <div className="relative bg-app-fg flex-1 flex items-center justify-center min-h-[400px] md:min-h-[600px]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedPhoto}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    src={photos[selectedPhoto]?.url || ''}
                    alt="Event Foto"
                    className="max-w-full max-h-full object-contain"
                  />
                </AnimatePresence>
              </div>

              {/* Sidebar - Instagram Style */}
              <div className="w-full md:w-80 flex flex-col bg-app-card border-t md:border-t-0 md:border-l border-app-border">
                {/* Header */}
                <div className="p-4 border-b border-app-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-app-bg flex items-center justify-center">
                      <span className="text-xs font-semibold text-app-muted">
                        {eventTitle.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-sm">{eventTitle}</span>
                  </div>
                  <button className="p-1 hover:bg-app-bg rounded">
                    <MoreHorizontal className="w-5 h-5 text-app-muted" />
                  </button>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-app-border">
                  <div className="flex items-center gap-4">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleLike(photos[selectedPhoto]?.id || '')}
                      className="p-1"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          likedPhotos.has(photos[selectedPhoto]?.id || '')
                            ? 'fill-[var(--status-danger)] text-[var(--status-danger)]'
                            : 'text-app-fg'
                        }`}
                      />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(photos[selectedPhoto])}
                      className="p-1"
                    >
                      <Share2 className="w-6 h-6 text-app-fg" />
                    </motion.button>
                    {allowDownloads && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDownload(photos[selectedPhoto])}
                        className="p-1"
                      >
                        <Download className="w-6 h-6 text-app-fg" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Photo Counter */}
                <div className="p-4 text-center text-sm text-app-muted border-t border-app-border mt-auto">
                  {selectedPhoto + 1} / {photos.length}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

