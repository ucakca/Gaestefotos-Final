'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Share2 } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import { buildApiUrl } from '@/lib/api';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface GalleryProps {
  photos: Photo[];
  allowDownloads?: boolean;
  eventSlug?: string;
}

export default function Gallery({ photos, allowDownloads = true, eventSlug }: GalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleDownload = (photo: Photo) => {
    if (!allowDownloads) return;
    const url = buildApiUrl(`/photos/${photo.id}/download`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async (photo: Photo) => {
    const shareUrl = eventSlug 
      ? `${window.location.origin}/e/${eventSlug}?photo=${photo.id}`
      : photo.url || '';

    if (navigator.share && photo.url) {
      try {
        await navigator.share({
          title: 'Event Foto',
          text: 'Schau dir dieses Event-Foto an!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('Link kopiert');
      window.setTimeout(() => setCopyFeedback(null), 1500);
    });
  };

  const openLightbox = (index: number) => {
    setSelectedPhoto(index);
  };

  const closeLightbox = () => {
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
      <div className="text-center py-12">
        <p className="text-app-muted">Noch keine Fotos vorhanden</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => openLightbox(index)}
            className="aspect-square bg-app-bg rounded-lg overflow-hidden cursor-pointer group relative"
          >
            {photo.url ? (
              <img
                src={photo.url}
                alt="Event Foto"
                className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-app-muted">
                Foto
              </div>
            )}
            <div className="absolute inset-0 bg-app-fg/0 group-hover:bg-app-fg/20 transition-opacity" />
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={selectedPhoto !== null} onOpenChange={(open) => (open ? null : closeLightbox())}>
        {selectedPhoto !== null && (
          <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 w-screen h-screen max-w-none bg-app-fg/90 border-0 p-4">
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLightbox}
              aria-label="Schließen"
              title="Schließen"
              className="absolute top-4 right-4 text-app-bg hover:text-app-bg/70 z-10"
            >
              <X className="w-8 h-8" />
            </motion.button>

            {/* Navigation Buttons */}
            {photos.length > 1 && (
              <>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    prevPhoto();
                  }}
                  aria-label="Vorheriges Foto"
                  title="Vorheriges Foto"
                  className="absolute left-4 text-app-bg hover:text-app-bg/70 z-10"
                >
                  <ChevronLeft className="w-12 h-12" />
                </motion.button>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    nextPhoto();
                  }}
                  aria-label="Nächstes Foto"
                  title="Nächstes Foto"
                  className="absolute right-4 text-app-bg hover:text-app-bg/70 z-10"
                >
                  <ChevronRight className="w-12 h-12" />
                </motion.button>
              </>
            )}

            {/* Image */}
            <div className="w-full h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedPhoto}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  src={photos[selectedPhoto]?.url || ''}
                  alt="Event Foto"
                  className="max-w-full max-h-full object-contain"
                />
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  handleDownload(photos[selectedPhoto]);
                }}
                aria-label="Download"
                title="Download"
                className="p-3 bg-app-fg/50 rounded-full text-app-bg hover:bg-app-fg/70"
              >
                <Download className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  handleShare(photos[selectedPhoto]);
                }}
                aria-label="Teilen"
                title="Teilen"
                className="p-3 bg-app-fg/50 rounded-full text-app-bg hover:bg-app-fg/70"
              >
                <Share2 className="w-6 h-6" />
              </motion.button>
            </motion.div>

            <AnimatePresence>
              {copyFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-32 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-app-fg/60 text-app-bg text-sm"
                >
                  {copyFeedback}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Photo Counter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-app-bg text-sm"
            >
              {selectedPhoto + 1} / {photos.length}
            </motion.div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

