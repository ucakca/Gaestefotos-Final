'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Search, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

const MotionButton = motion(Button);

const DEFAULT_NOTICE_TEXT =
  'Hinweis: Für die Funktion „Finde Bilder von mir“ wird ein Referenzfoto (Selfie) verarbeitet, um passende Fotos zu finden. Dabei können biometrische Daten (Gesichtsmerkmale) verarbeitet werden. Bitte nutze diese Funktion nur mit deiner ausdrücklichen Einwilligung.';

const DEFAULT_CHECKBOX_LABEL =
  'Ich willige ein, dass mein Referenzfoto zum Zweck der Gesichtssuche verarbeitet wird.';

interface FaceSearchProps {
  eventId: string;
  onResults?: (results: any[]) => void;
  onClose?: () => void;
  open?: boolean;
  showButton?: boolean;
}

interface SearchResult {
  photoId: string;
  photoUrl: string;
  similarity: number;
  facePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function FaceSearch({ eventId, onResults, onClose, open, showButton = false }: FaceSearchProps) {
  const [showModal, setShowModal] = useState(open || false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentNoticeText, setConsentNoticeText] = useState('');
  const [consentCheckboxLabel, setConsentCheckboxLabel] = useState('');
  
  useEffect(() => {
    if (open !== undefined) {
      setShowModal(open);
    }
  }, [open]);

  useEffect(() => {
    let mounted = true;
    if (!showModal) return;
    (async () => {
      try {
        const res = await api.get(`/events/${eventId}/face-search-consent`);
        if (!mounted) return;
        setConsentAccepted(!!res.data?.accepted);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showModal, eventId]);

  useEffect(() => {
    let mounted = true;
    if (!showModal) return;
    (async () => {
      try {
        const res = await api.get('/face-search-consent');
        const noticeText = (res.data?.noticeText || '') as string;
        const checkboxLabel = (res.data?.checkboxLabel || '') as string;
        if (!mounted) return;
        setConsentNoticeText(noticeText);
        setConsentCheckboxLabel(checkboxLabel);
      } catch {
        // ignore
      }
    })();

    return () => {
      mounted = false;
    };
  }, [showModal]);

  const [capturing, setCapturing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const effectiveNoticeText = (consentNoticeText || '').trim() || DEFAULT_NOTICE_TEXT;
  const effectiveCheckboxLabel = (consentCheckboxLabel || '').trim() || DEFAULT_CHECKBOX_LABEL;

  const setConsent = async (next: boolean) => {
    setError('');
    try {
      if (next) {
        await api.post(`/events/${eventId}/face-search-consent`);
        setConsentAccepted(true);
      } else {
        await api.delete(`/events/${eventId}/face-search-consent`);
        setConsentAccepted(false);
        reset();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Einwilligung konnte nicht gespeichert werden');
    }
  };

  const startCamera = async () => {
    if (!consentAccepted) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCapturing(true);
    } catch (err) {
      setError('Kamera konnte nicht geöffnet werden. Bitte Berechtigung erteilen.');
      void err;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCapturing(false);
  };

  const capturePhoto = () => {
    if (!consentAccepted) return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg');
    setPreview(dataUrl);
    stopCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!consentAccepted) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const searchPhotos = async () => {
    if (!consentAccepted) return;
    if (!preview) return;

    setSearching(true);
    setError('');
    setResults([]);

    try {
      // Convert data URL to blob
      const response = await fetch(preview);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('reference', blob, 'reference.jpg');
      formData.append('minSimilarity', '0.6');

      const { data } = await api.post(`/events/${eventId}/face-search`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setResults(data.results || []);
      onResults?.(data.results || []);
      
      if (data.results.length === 0) {
        setError('Keine Fotos mit diesem Gesicht gefunden. Versuche es mit einem anderen Foto!');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 403) {
        setConsentAccepted(false);
        setError(err.response?.data?.error || 'Einwilligung erforderlich');
      } else {
        setError(err.response?.data?.error || 'Fehler bei der Suche');
      }
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setResults([]);
    setError('');
    stopCamera();
  };

  const closeModal = () => {
    reset();
    setShowModal(false);
    onClose?.();
  };

  return (
    <>
      {showButton && (
        <MotionButton
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          variant="primary"
          size="sm"
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Search className="w-5 h-5" />
          Finde Bilder von mir
        </MotionButton>
      )}

      <Dialog open={showModal} onOpenChange={(open) => (open ? null : closeModal())}>
        <DialogContent className="max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                  Finde Bilder von mir
                </h2>
                <DialogClose asChild>
                  <IconButton
                    onClick={closeModal}
                    icon={<X className="w-5 h-5" />}
                    variant="ghost"
                    size="sm"
                    aria-label="Schließen"
                    title="Schließen"
                    className="p-2 hover:bg-background"
                  />
                </DialogClose>
              </div>

              <div className="mb-4 rounded-lg border border-border bg-background p-4">
                <div className="text-sm font-medium text-foreground">Einwilligung (biometrische Daten)</div>
                <div className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{effectiveNoticeText}</div>
                <label className="mt-3 flex items-start gap-3 text-sm text-foreground">
                  <Checkbox checked={consentAccepted} onCheckedChange={(checked) => void setConsent(checked)} className="mt-1" />
                  <span>{effectiveCheckboxLabel}</span>
                </label>
              </div>

              {!preview ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground mb-4">
                    Mache ein Selfie oder lade ein Foto hoch, um alle Fotos zu finden, auf denen du zu sehen bist!
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={startCamera}
                      disabled={!consentAccepted}
                      variant="ghost"
                      size="sm"
                      className="p-6 border-2 border-dashed border-border rounded-lg hover:border-app-accent hover:bg-background transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-8 h-8 text-muted-foreground" />
                      <span className="font-medium">Selfie aufnehmen</span>
                    </MotionButton>

                    <MotionButton
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (!consentAccepted) return;
                        fileInputRef.current?.click();
                      }}
                      disabled={!consentAccepted}
                      variant="ghost"
                      size="sm"
                      className="p-6 border-2 border-dashed border-border rounded-lg hover:border-app-accent hover:bg-background transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      <span className="font-medium">Foto hochladen</span>
                    </MotionButton>
                  </div>

                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {capturing && (
                    <div className="mt-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full rounded-lg"
                      />
                      <div className="mt-4 flex gap-2">
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={capturePhoto}
                          variant="primary"
                          size="sm"
                          className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors"
                        >
                          Foto aufnehmen
                        </MotionButton>
                        <MotionButton
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={stopCamera}
                          variant="ghost"
                          size="sm"
                          className="px-4 py-3 bg-background text-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
                        >
                          Abbrechen
                        </MotionButton>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Referenzbild"
                      className="w-full rounded-lg"
                    />
                    <IconButton
                      onClick={reset}
                      icon={<X className="w-4 h-4" />}
                      variant="ghost"
                      size="sm"
                      aria-label="Zurücksetzen"
                      title="Zurücksetzen"
                      className="absolute top-2 right-2 bg-card border border-border shadow-md hover:bg-background"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-background border border-status-danger text-destructive rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {results.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">
                        {results.length} Foto{results.length !== 1 ? 's' : ''} gefunden!
                      </h3>
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {results.map((result) => (
                          <div key={result.photoId} className="relative">
                            <img
                              src={result.photoUrl}
                              alt="Gefundenes Foto"
                              className="w-full aspect-square object-cover rounded"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-app-fg/60 text-app-bg text-xs p-1 text-center">
                              {Math.round(result.similarity * 100)}% ähnlich
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={searchPhotos}
                      disabled={searching || !consentAccepted}
                      variant="primary"
                      size="sm"
                      className="flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searching ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Suche...
                        </>
                      ) : (
                        <>
                          <Search className="w-5 h-5" />
                          Fotos suchen
                        </>
                      )}
                    </MotionButton>
                    <MotionButton
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={reset}
                      variant="ghost"
                      size="sm"
                      className="px-4 py-3 bg-background text-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
                    >
                      Neues Foto
                    </MotionButton>
                  </div>
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
}


