'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Event as EventType } from '@gaestefotos/shared';
import { Camera, Plus, User, Video, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import api from '@/lib/api';
import { getDesignPreset } from '@/lib/designPresets';

interface EventHeaderProps {
  event: EventType;
  hostName?: string;
  variant?: 'default' | 'hero';
  isStorageLocked?: boolean;
  uploadDisabled?: boolean;
  uploadDisabledReason?: string;
  showUploadCta?: boolean;
  upgradeHref?: string;
  hasStories?: boolean;
  onProfileClick?: () => void;
  onStoryCreated?: () => void;
  onPhotosChanged?: () => void;
}

export default function EventHeader({
  event,
  hostName,
  variant = 'default',
  isStorageLocked,
  uploadDisabled,
  uploadDisabledReason,
  showUploadCta,
  upgradeHref,
  hasStories,
  onProfileClick,
  onStoryCreated,
  onPhotosChanged,
}: EventHeaderProps) {
  const designConfig = event.designConfig as any || {};
  const welcomeMessage = designConfig.welcomeMessage || 
    'Schön, dass ihr alle hier seid! Lasst uns gemeinsam unvergessliche Erinnerungen schaffen ❤️';

  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showStoryDisabled, setShowStoryDisabled] = useState(false);
  const [storyUploaderName, setStoryUploaderName] = useState('');
  const [storyUploadError, setStoryUploadError] = useState<string | null>(null);
  const [storyUploading, setStoryUploading] = useState(false);
  
  // Get profile image - use storagePath if available, otherwise use direct URL
  const profileImageStoragePath = designConfig.profileImageStoragePath;
  const profileImage = profileImageStoragePath 
    ? `/api/events/${event.id}/design-image/profile/${encodeURIComponent(profileImageStoragePath)}`
    : (designConfig.profileImage && !designConfig.profileImage.startsWith('http://localhost:8001') 
        ? designConfig.profileImage 
        : null);

  const headerColor =
    designConfig?.colors?.primary ||
    designConfig.headerColor ||
    '#8B1538'; // Dark magenta/burgundy
  const appName = designConfig.appName || 'Gästefotos';

  const presetKey = designConfig.designPresetKey || 'classic';
  const selectedPreset = getDesignPreset(presetKey);
  const heroGradient = selectedPreset?.heroGradient || null;
  const accentGradient = selectedPreset?.accentGradient || null;
  
  // Get logo URL - use storagePath if available, otherwise use direct URL (filter out localhost URLs)
  const logoStoragePath = designConfig.logoStoragePath;
  const logoUrl = logoStoragePath 
    ? `/api/events/${event.id}/design-image/logo/${encodeURIComponent(logoStoragePath)}`
    : (designConfig.logoUrl && !designConfig.logoUrl.startsWith('http://localhost:8001') 
        ? designConfig.logoUrl 
        : null);

  const storyRingStyle = useMemo(() => {
    if (hasStories) {
      return {
        backgroundImage:
          accentGradient || 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
      };
    }
    return { backgroundImage: 'linear-gradient(135deg, #D1D5DB 0%, #E5E7EB 100%)' };
  }, [accentGradient, hasStories]);

  const openStoryModal = () => {
    if (isStorageLocked || uploadDisabled) {
      setShowStoryDisabled(true);
      return;
    }
    setStoryUploadError(null);
    setShowStoryModal(true);
  };

  const closeStoryModal = () => {
    setShowStoryModal(false);
    setStoryUploadError(null);
    setStoryUploading(false);
  };

  const closeStoryDisabled = () => {
    setShowStoryDisabled(false);
  };

  const validateVideoDuration = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const el = document.createElement('video');
        el.preload = 'metadata';
        el.onloadedmetadata = () => resolve(el.duration);
        el.onerror = () => reject(new Error('metadata'));
        el.src = url;
      });
      return duration;
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const uploadStoryMedia = useCallback(
    async (file: File) => {
      setStoryUploadError(null);
      setStoryUploading(true);

      const isVideo = typeof file.type === 'string' && file.type.startsWith('video/');
      if (isVideo) {
        try {
          const duration = await validateVideoDuration(file);
          if (Number.isFinite(duration) && duration > 15) {
            setStoryUploadError('Video ist zu lang. Maximale Story-Länge: 15 Sekunden.');
            setStoryUploading(false);
            return;
          }
        } catch {
          // If we cannot read metadata, we allow upload but keep the hint in the UI.
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      if (storyUploaderName.trim()) {
        formData.append('uploaderName', storyUploaderName.trim());
      }

      try {
        const uploadEndpoint = isVideo ? `/events/${event.id}/videos/upload` : `/events/${event.id}/photos/upload`;
        const uploadRes = await api.post(uploadEndpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (isVideo) {
          const videoId = uploadRes?.data?.video?.id;
          if (!videoId) throw new Error('VIDEO_ID_MISSING');
          await api.post(`/videos/${videoId}/story`, { isActive: true });
        } else {
          const photoId = uploadRes?.data?.photo?.id;
          if (!photoId) throw new Error('PHOTO_ID_MISSING');
          await api.post(`/photos/${photoId}/story`, { isActive: true });
        }

        closeStoryModal();
        onStoryCreated?.();
        onPhotosChanged?.();
      } catch (e: any) {
        setStoryUploadError(e?.response?.data?.error || 'Upload fehlgeschlagen');
      } finally {
        setStoryUploading(false);
      }
    },
    [event.id, onPhotosChanged, onStoryCreated, storyUploaderName, validateVideoDuration]
  );

  const pickFile = useCallback(
    (kind: 'photo' | 'video', useCapture: boolean) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = kind === 'video' ? 'video/*' : 'image/*';
      if (useCapture && 'capture' in input) {
        (input as any).capture = 'environment';
      }
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadStoryMedia(file);
      };
      input.click();
    },
    [uploadStoryMedia]
  );

  if (variant === 'hero') {
    return (
      <div className="relative">
        <div className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
            style={heroGradient ? { backgroundImage: heroGradient } : { backgroundColor: headerColor }}
          >
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/40 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-black/25 blur-3xl" />
            </div>

            <div className="pt-safe-top" />

            <div className="relative px-4 pt-4 pb-24">
              <div className="flex items-center justify-between gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={appName} className="h-7 max-w-[160px] object-contain" />
                ) : (
                  <div className="text-white/90 text-xs font-semibold tracking-wide">{appName}</div>
                )}

                <div className="text-right text-white/90">
                  <div className="text-xs font-semibold truncate">{event.title}</div>
                  <div className="text-[11px] text-white/75 truncate">{hostName ? `von ${hostName}` : 'von Gastgeber'}</div>
                </div>
              </div>
            </div>

            <div className="absolute left-0 right-0 -bottom-10 h-20 bg-white rounded-t-[48px]" />
          </motion.div>
        </div>

        <div className="bg-white">
          <div className="max-w-md mx-auto px-4 -mt-16 relative">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={onProfileClick}
                disabled={!onProfileClick}
                className="relative"
              >
                <div className="relative w-28 h-28">
                  {hasStories ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                      className="absolute inset-0 rounded-full p-[3px]"
                      style={storyRingStyle}
                    />
                  ) : (
                    <div className="absolute inset-0 rounded-full p-[3px]" style={storyRingStyle} />
                  )}
                  <div className="absolute inset-[3px] rounded-full bg-white overflow-hidden flex items-center justify-center">
                    {profileImage ? (
                      <img src={profileImage} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <User className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={openStoryModal}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-3 py-1.5 shadow-sm text-sm font-semibold text-gray-900"
                >
                  <Plus className="w-4 h-4" />
                  +Story
                </button>
              </div>

              {!hasStories && (
                <div className="mt-2 text-xs text-gray-500">Sei der Erste</div>
              )}

              <div className="mt-4 w-full rounded-2xl border border-gray-100 bg-white shadow-sm px-4 py-4">
                <div className="text-base font-semibold text-gray-900 leading-snug">{event.title}</div>

                {((event as any)?.profileDescription || welcomeMessage) && (
                  <div className="mt-2 text-sm text-gray-700 leading-relaxed">
                    {(event as any)?.profileDescription || welcomeMessage}
                  </div>
                )}

                {(event.locationName || (event as any).locationGoogleMapsLink || event.dateTime) && (
                  <div className="mt-3 text-xs text-gray-500">
                    {event.dateTime ? new Date(event.dateTime as any).toLocaleDateString('de-DE') : null}
                    {event.locationName ? ` · ${event.locationName}` : null}
                  </div>
                )}

                {isStorageLocked && (
                  <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                    <p className="text-gray-900 text-sm font-semibold">Speicherzeit abgelaufen</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Fotos sind als Vorschau weiterhin sichtbar, aber unscharf.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showStoryModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeStoryModal}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900">Story erstellen</div>
                  <button
                    type="button"
                    onClick={closeStoryModal}
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-gray-700">Dein Name (optional)</label>
                  <input
                    type="text"
                    value={storyUploaderName}
                    onChange={(e) => setStoryUploaderName(e.target.value)}
                    placeholder="z.B. Max"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => pickFile('photo', true)}
                    className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Camera className="w-5 h-5" />
                      Foto aufnehmen
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => pickFile('video', true)}
                    className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Video className="w-5 h-5" />
                      Video aufnehmen
                    </div>
                    <div className="mt-1 text-xs text-gray-500">max 15s</div>
                  </button>
                  <button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => pickFile('photo', false)}
                    className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left"
                  >
                    <div className="text-sm font-semibold text-gray-900">Foto auswählen</div>
                    <div className="mt-1 text-xs text-gray-500">Galerie</div>
                  </button>
                  <button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => pickFile('video', false)}
                    className="rounded-2xl border border-gray-200 bg-white px-3 py-3 text-left"
                  >
                    <div className="text-sm font-semibold text-gray-900">Video auswählen</div>
                    <div className="mt-1 text-xs text-gray-500">Galerie · max 15s</div>
                  </button>
                </div>

                {storyUploadError && (
                  <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {storyUploadError}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  Hinweis: Videos in Stories sind auf maximal 15 Sekunden begrenzt.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showStoryDisabled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeStoryDisabled}
              className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4"
            >
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
              >
                <div className="text-sm font-semibold text-gray-900">Story nicht möglich</div>
                <div className="mt-1 text-sm text-gray-600">
                  {isStorageLocked
                    ? 'Die Speicherzeit ist abgelaufen.'
                    : uploadDisabledReason || 'Uploads sind aktuell deaktiviert.'}
                </div>
                <button
                  type="button"
                  onClick={closeStoryDisabled}
                  className="mt-4 w-full rounded-xl bg-gray-900 text-white py-2 text-sm font-semibold"
                >
                  OK
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative" style={{ backgroundColor: headerColor }}>
        <div className="pt-safe-top" />
        <div className="px-4 py-3">
          {logoUrl ? (
            <div className="flex items-center justify-center">
              <img src={logoUrl} alt={appName} className="h-7 max-w-[180px] object-contain" />
            </div>
          ) : (
            <h1 className="text-center text-white text-lg font-semibold tracking-wide">{appName}</h1>
          )}
        </div>
      </motion.div>

      <div className="bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-gray-100 bg-white/90 backdrop-blur shadow-sm px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-0.5">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-purple-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-gray-900 leading-snug truncate">{event.title}</h2>
                <p className="text-xs text-gray-600 mt-0.5 truncate">{hostName ? `von ${hostName}` : 'von Gastgeber'}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm text-gray-700 leading-relaxed">{welcomeMessage}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


