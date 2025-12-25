'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Heart, Share2, Download, MoreHorizontal, MessageCircle, Send, User, Trophy, Star } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import UploadButton from './UploadButton';
import api from '@/lib/api';
import { buildApiUrl } from '@/lib/api';

interface ModernPhotoGridProps {
  photos: Photo[];
  allowDownloads?: boolean;
  eventSlug?: string;
  eventTitle?: string;
  eventId: string;
  onUploadSuccess?: () => void;
  allowUploads?: boolean;
  isStorageLocked?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledReason?: string;
}

export default function ModernPhotoGrid({
  photos,
  allowDownloads = true,
  eventSlug,
  eventTitle = 'Event',
  eventId,
  onUploadSuccess,
  allowUploads = true,
  isStorageLocked = false,
  uploadDisabled = false,
  uploadDisabledReason,
}: ModernPhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [showUploadDisabled, setShowUploadDisabled] = useState(false);
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);

  const downloadsEnabled = allowDownloads && !isStorageLocked;

  const handleDownload = (photo: Photo) => {
    if (!downloadsEnabled) return;
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
      // Could show toast notification here
    });
  };

  const loadLikeCount = async (photoId: string) => {
    try {
      const response = await api.get(`/photos/${photoId}/likes`);
      setLikeCounts((prev) => ({
        ...prev,
        [photoId]: response.data.likeCount || 0,
      }));
      const liked = response.data?.liked ?? response.data?.isLiked;
      if (liked) {
        setLikedPhotos((prev) => new Set(prev).add(photoId));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Likes:', err);
    }
  };

  const toggleLike = async (photoId: string) => {
    try {
      const response = await api.post(`/photos/${photoId}/like`);
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
      console.error('Fehler beim Liken:', err);
    }
  };

  const loadComments = async (photoId: string) => {
    if (loadingComments.has(photoId) || comments[photoId]) {
      return; // Already loading or loaded
    }

    try {
      setLoadingComments((prev) => new Set(prev).add(photoId));
      const response = await api.get(`/photos/${photoId}/comments`);
      setComments((prev) => ({
        ...prev,
        [photoId]: response.data.comments || [],
      }));
    } catch (err) {
      console.error('Fehler beim Laden der Kommentare:', err);
    } finally {
      setLoadingComments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  };

  const submitComment = async (photoId: string) => {
    if (!commentText.trim() || !authorName.trim()) {
      return;
    }

    try {
      setSubmittingComment(true);
      const response = await api.post(`/photos/${photoId}/comments`, {
        comment: commentText.trim(),
        authorName: authorName.trim(),
      });

      const created = response.data?.comment;
      const status = String(created?.status || '').toUpperCase();

      if (status === 'PENDING') {
        setCommentNotice('Wird nach Freigabe sichtbar.');
        setCommentText('');
        setAuthorName('');
        setTimeout(() => setCommentNotice(null), 3500);
        return;
      }

      setComments((prev) => ({
        ...prev,
        [photoId]: [...(prev[photoId] || []), created],
      }));

      setCommentText('');
      setAuthorName('');
    } catch (err: any) {
      console.error('Fehler beim Erstellen des Kommentars:', err);
      alert(err.response?.data?.error || 'Fehler beim Erstellen des Kommentars');
    } finally {
      setSubmittingComment(false);
    }
  };

  useEffect(() => {
    if (selectedPhoto !== null) {
      setCommentNotice(null);
      const photo = photos[selectedPhoto];
      if (photo) {
        // Only load likes and comments for regular photos (not challenge or guestbook entries)
        // Challenge and guestbook entries have different ID formats (challenge-xxx, guestbook-xxx)
        // and may not have a valid photoId
        const isRegularPhoto = !(photo as any).isChallengePhoto && !(photo as any).isGuestbookEntry;
        const photoId = (photo as any).photoId || photo.id;
        
        if (isRegularPhoto && photoId && !photoId.startsWith('challenge-') && !photoId.startsWith('guestbook-')) {
          loadLikeCount(photoId);
          loadComments(photoId);
        }
      }
    }
  }, [selectedPhoto]);

  const openPost = (index: number) => {
    if (isStorageLocked) {
      return;
    }
    setCommentNotice(null);
    setSelectedPhoto(index);
  };

  const closePost = () => {
    setCommentNotice(null);
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

  if (photos.length === 0 && !allowUploads) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Noch keine Fotos vorhanden</p>
      </div>
    );
  }

  return (
    <>
      {allowUploads && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50"
          style={{
            bottom: `calc(env(safe-area-inset-bottom) + 84px)`,
          }}
        >
          <div
            onClick={(e) => {
              if (!uploadDisabled && !isStorageLocked) return;
              e.preventDefault();
              e.stopPropagation();
              setShowUploadDisabled(true);
            }}
          >
            <UploadButton
              eventId={eventId}
              onUploadSuccess={onUploadSuccess}
              disabled={uploadDisabled || isStorageLocked}
              disabledReason={isStorageLocked ? 'Die Speicherzeit ist abgelaufen.' : uploadDisabledReason}
              variant="fab"
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showUploadDisabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUploadDisabled(false)}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            >
              <div className="text-sm font-semibold text-gray-900">Upload nicht möglich</div>
              <div className="mt-1 text-sm text-gray-600">
                {isStorageLocked ? 'Die Speicherzeit ist abgelaufen.' : uploadDisabledReason || 'Uploads sind aktuell deaktiviert.'}
              </div>
              <button
                type="button"
                onClick={() => setShowUploadDisabled(false)}
                className="mt-4 w-full rounded-xl bg-gray-900 text-white py-2 text-sm font-semibold"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern 3-Column Grid with Upload Button */}
      <div className="grid grid-cols-3 gap-0.5 md:gap-1 max-w-md mx-auto">
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
              className="aspect-square bg-gray-100 relative group cursor-pointer overflow-hidden flex items-center justify-center"
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
                <div className="w-full h-full flex items-center justify-center text-gray-400">
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
                    className="bg-yellow-400 rounded-full p-1.5 shadow-lg"
                  >
                    <Trophy className="w-4 h-4 text-yellow-900" />
                  </motion.div>
                </div>
              )}

              {/* Guestbook Entry Speech Bubble Overlay - Bottom positioned */}
              {isGuestbookEntry && guestbookEntry && (
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-900">
                        {guestbookEntry.authorName || 'Anonym'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {guestbookEntry.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Challenge Photo Speech Bubble Overlay - Bottom positioned */}
              {isChallengePhoto && challenge && completion && (
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="bg-white rounded-lg px-3 py-2 shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {challenge.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-700 font-medium">
                        {completion.guest 
                          ? `${completion.guest.firstName} ${completion.guest.lastName}` 
                          : (completion.uploaderName && completion.uploaderName.trim() ? completion.uploaderName : 'Anonym')}
                      </span>
                      {completion.averageRating && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-gray-600">{completion.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity" />
            </motion.div>
          );
        })}
      </div>


      {/* Instagram-like Post Modal */}
      <AnimatePresence>
        {selectedPhoto !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePost}
            className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          >
            {/* Close Button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePost}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 p-2"
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
                  className="absolute left-4 text-white hover:text-gray-300 z-10 p-2 bg-black bg-opacity-50 rounded-full"
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
                  className="absolute right-4 text-white hover:text-gray-300 z-10 p-2 bg-black bg-opacity-50 rounded-full"
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
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Image Section */}
              <div className="relative bg-black flex-1 flex items-center justify-center min-h-[400px] md:min-h-[600px] max-h-[90vh] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedPhoto}
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
                      if (info.offset.x > threshold) {
                        prevPhoto();
                        return;
                      }
                      if (info.offset.x < -threshold) {
                        nextPhoto();
                      }
                    }}
                    className="relative w-full h-full flex items-center justify-center p-4 select-none touch-pan-y"
                  >
                    <img
                      src={photos[selectedPhoto]?.url?.startsWith('/api/') ? photos[selectedPhoto]?.url : photos[selectedPhoto]?.url || ''}
                      alt="Event Foto"
                      className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                      onError={(e) => {
                        // Fallback: versuche absolute URL
                        const url = photos[selectedPhoto]?.url;
                        if (url && url.startsWith('/api/')) {
                          const absoluteUrl = window.location.origin + url;
                          (e.target as HTMLImageElement).src = absoluteUrl;
                        }
                      }}
                    />
                    {/* Challenge Photo Badge on Full Image */}
                    {(photos[selectedPhoto] as any)?.isChallengePhoto && (photos[selectedPhoto] as any)?.challenge && (
                      <div className="absolute top-4 right-4 z-10">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="bg-yellow-400 rounded-full p-3 shadow-xl"
                        >
                          <Trophy className="w-6 h-6 text-yellow-900" />
                        </motion.div>
                      </div>
                    )}

                    {/* Guestbook Entry Speech Bubble on Full Image */}
                    {(photos[selectedPhoto] as any)?.isGuestbookEntry && (photos[selectedPhoto] as any)?.guestbookEntry && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-white rounded-lg px-4 py-3 shadow-xl max-w-md mx-auto">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {(photos[selectedPhoto] as any).guestbookEntry.authorName}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {(photos[selectedPhoto] as any).guestbookEntry.message}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Challenge Photo Speech Bubble on Full Image */}
                    {(photos[selectedPhoto] as any)?.isChallengePhoto && (photos[selectedPhoto] as any)?.challenge && (
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg px-4 py-3 shadow-xl max-w-md mx-auto border border-yellow-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-semibold text-gray-900">
                              {(photos[selectedPhoto] as any).challenge.title}
                            </span>
                          </div>
                          {(photos[selectedPhoto] as any).challenge.description && (
                            <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                              {(photos[selectedPhoto] as any).challenge.description}
                            </p>
                          )}
                          {(photos[selectedPhoto] as any).completion && (
                            <div className="text-xs text-gray-600">
                              Erfüllt von: {(photos[selectedPhoto] as any).completion.guest 
                                ? `${(photos[selectedPhoto] as any).completion.guest.firstName} ${(photos[selectedPhoto] as any).completion.guest.lastName}`
                                : (photos[selectedPhoto] as any).completion.uploaderName || 'Anonym'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Sidebar */}
              <div className="w-full md:w-80 flex flex-col bg-white border-t md:border-t-0 md:border-l border-gray-200 max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">
                        {(photos[selectedPhoto] as any)?.isChallengePhoto 
                          ? ((photos[selectedPhoto] as any)?.completion?.uploaderName && (photos[selectedPhoto] as any).completion.uploaderName.trim()
                            ? (photos[selectedPhoto] as any).completion.uploaderName.charAt(0).toUpperCase()
                            : (photos[selectedPhoto] as any)?.uploadedBy && (photos[selectedPhoto] as any).uploadedBy.trim()
                            ? (photos[selectedPhoto] as any).uploadedBy.charAt(0).toUpperCase()
                            : eventTitle.charAt(0).toUpperCase())
                          : (photos[selectedPhoto] as any)?.isGuestbookEntry && (photos[selectedPhoto] as any)?.guestbookEntry?.authorName
                          ? (photos[selectedPhoto] as any).guestbookEntry.authorName.charAt(0).toUpperCase()
                          : (photos[selectedPhoto] as any)?.uploadedBy && (photos[selectedPhoto] as any).uploadedBy.trim()
                          ? (photos[selectedPhoto] as any).uploadedBy.charAt(0).toUpperCase()
                          : eventTitle.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-semibold text-sm">
                      {(photos[selectedPhoto] as any)?.isChallengePhoto 
                        ? ((photos[selectedPhoto] as any)?.completion?.uploaderName && (photos[selectedPhoto] as any).completion.uploaderName.trim()
                          ? (photos[selectedPhoto] as any).completion.uploaderName
                          : (photos[selectedPhoto] as any)?.uploadedBy && (photos[selectedPhoto] as any).uploadedBy.trim()
                          ? (photos[selectedPhoto] as any).uploadedBy
                          : eventTitle)
                        : (photos[selectedPhoto] as any)?.isGuestbookEntry && (photos[selectedPhoto] as any)?.guestbookEntry?.authorName
                        ? (photos[selectedPhoto] as any).guestbookEntry.authorName
                        : (photos[selectedPhoto] as any)?.uploadedBy && (photos[selectedPhoto] as any).uploadedBy.trim()
                        ? (photos[selectedPhoto] as any).uploadedBy
                        : eventTitle}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreHorizontal className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-4 mb-3">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleLike(photos[selectedPhoto]?.id || '')}
                      className="p-1 flex items-center gap-2"
                    >
                      <Heart
                        className={`w-6 h-6 ${
                          likedPhotos.has(photos[selectedPhoto]?.id || '')
                            ? 'fill-red-500 text-red-500'
                            : 'text-gray-900'
                        }`}
                      />
                      {likeCounts[photos[selectedPhoto]?.id || ''] > 0 && (
                        <span className="text-sm font-medium text-gray-900">
                          {likeCounts[photos[selectedPhoto]?.id || '']}
                        </span>
                      )}
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleShare(photos[selectedPhoto])}
                      className="p-1"
                    >
                      <Share2 className="w-6 h-6 text-gray-900" />
                    </motion.button>
                    {downloadsEnabled && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDownload(photos[selectedPhoto])}
                        className="p-1"
                      >
                        <Download className="w-6 h-6 text-gray-900" />
                      </motion.button>
                    )}
                  </div>
                  
                  {/* Like Count */}
                  {likeCounts[photos[selectedPhoto]?.id || ''] > 0 && (
                    <div className="text-sm font-semibold text-gray-900 mb-3">
                      {likeCounts[photos[selectedPhoto]?.id || '']} {likeCounts[photos[selectedPhoto]?.id || ''] === 1 ? 'Like' : 'Likes'}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  {loadingComments.has(photos[selectedPhoto]?.id || '') ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (comments[photos[selectedPhoto]?.id || ''] || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Noch keine Kommentare</p>
                      <p className="text-xs mt-1 opacity-70">Sei der Erste, der kommentiert!</p>
                    </div>
                  ) : (
                    (comments[photos[selectedPhoto]?.id || ''] || []).map((comment: any) => (
                      <div key={comment.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {comment.authorName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString('de-DE', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {comment.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="space-y-2">
                    {commentNotice && (
                      <div className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        {commentNotice}
                      </div>
                    )}
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Dein Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                      disabled={submittingComment}
                      maxLength={100}
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Schreibe einen Kommentar..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                        disabled={submittingComment}
                        maxLength={1000}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitComment(photos[selectedPhoto]?.id || '');
                          }
                        }}
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => submitComment(photos[selectedPhoto]?.id || '')}
                        disabled={submittingComment || !commentText.trim() || !authorName.trim()}
                        className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submittingComment ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

