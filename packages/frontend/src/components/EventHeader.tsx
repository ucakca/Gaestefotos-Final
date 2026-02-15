'use client';

import { motion } from 'framer-motion';
import { Event as EventType } from '@gaestefotos/shared';
import { Camera, Plus, User, Video, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { getDesignPreset } from '@/lib/designPresets';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [storyUploaderName, setStoryUploaderName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guestUploaderName') || '';
    }
    return '';
  });
  const [storyUploadError, setStoryUploadError] = useState<string | null>(null);

  // Persist story uploader name to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && storyUploaderName.trim()) {
      localStorage.setItem('guestUploaderName', storyUploaderName.trim());
    }
  }, [storyUploaderName]);
  const [storyUploading, setStoryUploading] = useState(false);
  
  // Get profile image - use storagePath if available, otherwise use direct URL
  const profileImageStoragePath = designConfig.profileImageStoragePath;
  const profileImage = profileImageStoragePath 
    ? `/api/events/${event.id}/design-image/profile/${encodeURIComponent(profileImageStoragePath)}`
    : (designConfig.profileImage && !designConfig.profileImage.startsWith('http://localhost:8001') 
        ? designConfig.profileImage 
        : null);

  // Get cover image - use storagePath if available, otherwise use direct URL
  const coverImageStoragePath = designConfig.coverImageStoragePath;
  const coverImage = coverImageStoragePath
    ? `/api/events/${event.id}/design-image/cover/${encodeURIComponent(coverImageStoragePath)}`
    : (designConfig.coverImage && !designConfig.coverImage.startsWith('http://localhost:8001')
        ? designConfig.coverImage
        : null);

  const headerColor =
    designConfig?.colors?.primary ||
    designConfig.headerColor ||
    'var(--primary)';
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
          accentGradient || 'linear-gradient(135deg, var(--primary) 0%, var(--foreground) 100%)',
      };
    }
    return { backgroundImage: 'linear-gradient(135deg, var(--border) 0%, var(--background) 100%)' };
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

  const storyCapturePhotoInputRef = useRef<HTMLInputElement>(null);
  const storyCaptureVideoInputRef = useRef<HTMLInputElement>(null);
  const storyPickPhotoInputRef = useRef<HTMLInputElement>(null);
  const storyPickVideoInputRef = useRef<HTMLInputElement>(null);

  const onStoryFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // allow selecting the same file again
      e.target.value = '';
      if (!file) return;
      uploadStoryMedia(file);
    },
    [uploadStoryMedia]
  );

  if (variant === 'hero') {
    return (
      <div className="relative" key={`hero-${event.id}-v3`}>
        <div className="relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
            style={
              coverImage 
                ? {} 
                : heroGradient 
                  ? { backgroundImage: heroGradient } 
                  : { backgroundColor: headerColor }
            }
          >
            {coverImage && (
              <>
                <div className="absolute inset-0">
                  <img 
                    src={coverImage} 
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
              </>
            )}
            <div className="absolute inset-0 opacity-25">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-background/40 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-background/40 blur-3xl" />
            </div>

            <div className="pt-safe-top" />

            <div className="relative px-4 pt-4" style={{ minHeight: '50vh', paddingBottom: '6rem' }}>
              <div className="flex items-center justify-between gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={appName} className="h-7 max-w-[160px] object-contain drop-shadow-lg" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }} />
                ) : (
                  <div className="text-white text-xs font-semibold tracking-wide" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.8)' }}>{appName}</div>
                )}

                <div className="text-right text-background/90">
                  {/* Event-Titel entfernt - wird nur in Sprechblase angezeigt */}
                </div>
              </div>
            </div>

            <div className="absolute left-0 right-0 -bottom-10 h-20 bg-background rounded-t-[48px]" />
          </motion.div>
        </div>

        <div className="bg-background">
          <div className="max-w-md mx-auto px-4 -mt-20 relative">
            <div className="flex items-start gap-4">
              {/* Profilbild links */}
              <div className="flex flex-col items-center flex-shrink-0 relative">
                <Button
                  type="button"
                  onClick={onProfileClick}
                  disabled={!onProfileClick}
                  variant="ghost"
                  size="sm"
                  className="relative p-0 h-auto w-auto"
                >
                  <div className="relative w-32 h-32">
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
                    <div className="absolute inset-[3px] rounded-full bg-background overflow-hidden flex items-center justify-center">
                      {profileImage ? (
                        <img src={profileImage} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-background flex items-center justify-center">
                          <User className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                </Button>

                {/* + Story Button - Instagram-Style, direkt am Profilbild (weiter oben) */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <Button
                    type="button"
                    onClick={openStoryModal}
                    variant="secondary"
                    size="sm"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 shadow-lg text-sm font-semibold h-auto border-2 border-background"
                    style={{ backgroundColor: headerColor || '#ef4444', color: '#ffffff', borderColor: 'var(--background)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Story
                  </Button>
                </div>

                {!hasStories && (
                  <div className="mt-10 text-xs text-muted-foreground text-center">Sei der Erste</div>
                )}
              </div>

              {/* Willkommensnachricht rechts vom Profilbild */}
              <div className="flex-1 pt-2">
                {((event as any)?.profileDescription || welcomeMessage) && (
                  <div className="text-sm text-foreground leading-relaxed">
                    {(event as any)?.profileDescription || welcomeMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Sprechblase (Event-Info-Karte) unter Profilbild - nur Event-Info, kein Titel */}
            <div className="mt-20 w-full rounded-2xl border border-border bg-card shadow-lg px-4 py-4">
              <div className="text-base font-semibold text-foreground leading-snug">{event.title}</div>
              {hostName && (
                <div className="text-xs text-muted-foreground mt-1">von {hostName}</div>
              )}

              {(event.locationName || (event as any).locationGoogleMapsLink || event.dateTime) && (
                <div className="mt-3 text-xs text-muted-foreground">
                  {event.dateTime ? new Date(event.dateTime as any).toLocaleDateString('de-DE') : null}
                  {event.locationName ? ` · ${event.locationName}` : null}
                </div>
              )}

              {isStorageLocked && (
                <div className="mt-4 rounded-2xl bg-background border border-border px-4 py-3">
                  <p className="text-foreground text-sm font-semibold">Speicherzeit abgelaufen</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Fotos sind als Vorschau weiterhin sichtbar, aber unscharf.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={showStoryModal} onOpenChange={(open) => (open ? null : closeStoryModal())}>
          {showStoryModal && (
            <DialogContent className="bottom-4 top-auto translate-y-0 w-full max-w-md rounded-2xl bg-card border border-border p-4 shadow-xl">
              <DialogTitle className="sr-only">Story erstellen</DialogTitle>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-foreground">Story erstellen</div>
                  <DialogClose asChild>
                    <IconButton
                      onClick={closeStoryModal}
                      icon={<X className="w-5 h-5" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Schließen"
                      title="Schließen"
                      className="w-9 h-9"
                    />
                  </DialogClose>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-foreground">Dein Name (optional)</label>
                  <Input
                    type="text"
                    value={storyUploaderName}
                    onChange={(e) => setStoryUploaderName(e.target.value)}
                    placeholder="z.B. Max"
                    className="mt-1 w-full rounded-xl px-3 py-2"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Input
                    ref={storyCapturePhotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onStoryFileSelected}
                  />
                  <Input
                    ref={storyCaptureVideoInputRef}
                    type="file"
                    accept="video/*"
                    capture="environment"
                    className="hidden"
                    onChange={onStoryFileSelected}
                  />
                  <Input ref={storyPickPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={onStoryFileSelected} />
                  <Input ref={storyPickVideoInputRef} type="file" accept="video/*" className="hidden" onChange={onStoryFileSelected} />
                  <Button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => storyCapturePhotoInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    className="rounded-2xl px-3 py-3 text-left h-auto"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Camera className="w-5 h-5" />
                      Foto aufnehmen
                    </div>
                  </Button>
                  <Button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => storyCaptureVideoInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    className="rounded-2xl px-3 py-3 text-left h-auto"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Video className="w-5 h-5" />
                      Video aufnehmen
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">max 15s</div>
                  </Button>
                  <Button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => storyPickPhotoInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    className="rounded-2xl px-3 py-3 text-left h-auto"
                  >
                    <div className="text-sm font-semibold text-foreground">Foto auswählen</div>
                    <div className="mt-1 text-xs text-muted-foreground">Galerie</div>
                  </Button>
                  <Button
                    type="button"
                    disabled={storyUploading}
                    onClick={() => storyPickVideoInputRef.current?.click()}
                    variant="secondary"
                    size="sm"
                    className="rounded-2xl px-3 py-3 text-left h-auto"
                  >
                    <div className="text-sm font-semibold text-foreground">Video auswählen</div>
                    <div className="mt-1 text-xs text-muted-foreground">Galerie · max 15s</div>
                  </Button>
                </div>

                {storyUploadError && (
                  <div className="mt-4 rounded-xl bg-background border border-status-danger px-3 py-2 text-sm text-destructive">
                    {storyUploadError}
                  </div>
                )}

                <div className="mt-4 text-xs text-muted-foreground">Hinweis: Videos in Stories sind auf maximal 15 Sekunden begrenzt.</div>
              </motion.div>
            </DialogContent>
          )}
        </Dialog>

        <Dialog open={showStoryDisabled} onOpenChange={(open) => (open ? null : closeStoryDisabled())}>
          {showStoryDisabled && (
            <DialogContent className="bottom-4 top-auto translate-y-0 w-full max-w-md rounded-2xl bg-card border border-border p-4 shadow-xl">
              <DialogTitle className="sr-only">Story nicht möglich</DialogTitle>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
                <div className="text-sm font-semibold text-foreground">Story nicht möglich</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {isStorageLocked ? 'Die Speicherzeit ist abgelaufen.' : uploadDisabledReason || 'Uploads sind aktuell deaktiviert.'}
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    onClick={closeStoryDisabled}
                    variant="primary"
                    size="sm"
                    className="mt-4 w-full rounded-xl py-2 text-sm font-semibold h-auto"
                  >
                    OK
                  </Button>
                </DialogClose>
              </motion.div>
            </DialogContent>
          )}
        </Dialog>
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
            <h1 className="text-center text-background text-lg font-semibold tracking-wide">{appName}</h1>
          )}
        </div>
      </motion.div>

      <div className="bg-gradient-to-b from-background to-background">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card/90 backdrop-blur shadow-sm px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-status-warning p-0.5">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-background flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground leading-snug truncate">{event.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{hostName ? `von ${hostName}` : 'von Gastgeber'}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm text-foreground leading-relaxed">{welcomeMessage}</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


