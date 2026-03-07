'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import UploadButton from './UploadButton';
import OfflineQueueIndicator from './OfflineQueueIndicator';
import PhotoLightbox from './PhotoLightbox';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ModernPhotoGridProps {
  photos: Photo[];
  allowDownloads?: boolean;
  allowComments?: boolean;
  eventSlug?: string;
  eventTitle?: string;
  eventId: string;
  onUploadSuccess?: () => void;
  allowUploads?: boolean;
  isStorageLocked?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledReason?: string;
  uploadingCount?: number;
}

export default function ModernPhotoGrid({
  photos,
  allowDownloads = true,
  allowComments = true,
  eventSlug,
  eventTitle = 'Event',
  eventId,
  onUploadSuccess,
  allowUploads = true,
  isStorageLocked = false,
  uploadDisabled = false,
  uploadDisabledReason,
  uploadingCount = 0,
}: ModernPhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [showUploadDisabled, setShowUploadDisabled] = useState(false);

  const openPost = (index: number) => {
    if (isStorageLocked) return;
    setSelectedPhoto(index);
  };

  if (photos.length === 0 && !allowUploads) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-background border border-border flex items-center justify-center mb-4">
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
      {allowUploads && (
        <>
          {/* Upload Button 1/3 über sticky footer (ca. 80px über Bottom Navigation) */}
          <div className="fixed left-1/2 -translate-x-1/2 z-40" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}>
            <UploadButton
              eventId={eventId}
              onUploadSuccess={onUploadSuccess}
              disabled={uploadDisabled || isStorageLocked}
              disabledReason={isStorageLocked ? 'Die Speicherzeit ist abgelaufen.' : uploadDisabledReason}
              variant="fab"
            />
          </div>
          <OfflineQueueIndicator onUploadSuccess={onUploadSuccess} />
        </>
      )}

      <Dialog open={showUploadDisabled} onOpenChange={(open) => (open ? null : setShowUploadDisabled(false))}>
        <DialogContent className="bottom-4 top-auto left-1/2 -translate-x-1/2 translate-y-0 w-[calc(100vw-2rem)] max-w-md rounded-2xl bg-card border border-border p-4 shadow-xl">
          <div className="text-sm font-semibold text-foreground">Upload nicht möglich</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isStorageLocked ? 'Die Speicherzeit ist abgelaufen.' : uploadDisabledReason || 'Uploads sind aktuell deaktiviert.'}
          </div>
          <Button
            type="button"
            onClick={() => setShowUploadDisabled(false)}
            variant="primary"
            size="sm"
            className="mt-4 w-full rounded-xl py-2 text-sm font-semibold"
          >
            OK
          </Button>
        </DialogContent>
      </Dialog>

      {/* Modern 3-Column Grid with Upload Button */}
      <div className="grid grid-cols-3 gap-0.5 md:gap-1 max-w-md mx-auto">
        {/* Upload Placeholders - show spinning loader during uploads */}
        {Array.from({ length: uploadingCount }).map((_, i) => (
          <div
            key={`uploading-${i}`}
            className="aspect-square bg-background border border-border relative flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Lädt...</span>
            </div>
          </div>
        ))}
        {/* Photo Grid */}
        {photos.map((photo, index) => {
          const isGuestbookEntry = (photo as any).isGuestbookEntry;
          const guestbookEntry = (photo as any).guestbookEntry;
          const isChallengePhoto = (photo as any).isChallengePhoto;
          const challenge = (photo as any).challenge;
          const completion = (photo as any).completion;
          
          return (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => openPost(index)}
              className="aspect-square bg-background border border-border relative group cursor-pointer overflow-hidden flex items-center justify-center"
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt="Event Foto"
                  className={`w-full h-full object-cover ${isStorageLocked ? 'blur-md' : ''}`}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback: versuche absolute URL wenn relative
                    const img = e.target as HTMLImageElement;
                    if (photo.url && photo.url.startsWith('/api/')) {
                      const absoluteUrl = window.location.origin + photo.url;
                      if (img.src !== absoluteUrl) {
                        img.src = absoluteUrl;
                      }
                    } else if (photo.url && !photo.url.startsWith('http')) {
                      // Relative URL ohne /api/
                      const absoluteUrl = window.location.origin + (photo.url.startsWith('/') ? '' : '/') + photo.url;
                      if (img.src !== absoluteUrl) {
                        img.src = absoluteUrl;
                      }
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* Challenge Photo Badge */}
              {isChallengePhoto && challenge && (
                <div className="absolute top-2 right-2 z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="rounded-full p-1.5 shadow-lg bg-status-warning"
                  >
                    <Trophy className="w-4 h-4 text-foreground" />
                  </motion.div>
                </div>
              )}

              {/* Guestbook Entry Speech Bubble Overlay - Bottom positioned */}
              {isGuestbookEntry && guestbookEntry && (
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="bg-card rounded-lg px-3 py-2 shadow-lg border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground">
                        {guestbookEntry.authorName || 'Anonym'}
                      </span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">
                      {guestbookEntry.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Challenge Photo Speech Bubble Overlay - Bottom positioned */}
              {isChallengePhoto && challenge && completion && (
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="bg-card rounded-lg px-3 py-2 shadow-lg border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-3 h-3 flex-shrink-0 text-status-warning" />
                      <span className="text-xs font-semibold text-foreground truncate">
                        {challenge.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground font-medium">
                        {completion.guest 
                          ? `${completion.guest.firstName} ${completion.guest.lastName}` 
                          : (completion.uploaderName && completion.uploaderName.trim() ? completion.uploaderName : 'Anonym')}
                      </span>
                      {completion.averageRating && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Star className="w-3 h-3 fill-status-warning text-status-warning" />
                          <span className="text-xs text-muted-foreground">{completion.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-opacity" />
            </motion.div>
          );
        })}
      </div>


      {/* Photo Lightbox (extracted component) */}
      <PhotoLightbox
        photos={photos}
        selectedIndex={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={setSelectedPhoto}
        allowDownloads={allowDownloads}
        allowComments={allowComments}
        isStorageLocked={isStorageLocked}
        eventSlug={eventSlug}
        eventTitle={eventTitle}
      />
    </>
  );
}

