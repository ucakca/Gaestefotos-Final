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

const CONSENT_STORAGE_KEY = 'face_search_consent_accepted_v1';

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
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === 'true') setConsentAccepted(true);
    } catch {
      // ignore
    }
  }, []);

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

  const setConsent = (next: boolean) => {
    setConsentAccepted(next);
    if (typeof window === 'undefined') return;
    try {
      if (next) window.localStorage.setItem(CONSENT_STORAGE_KEY, 'true');
      else window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    } catch {
      // ignore
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
      setError(err.response?.data?.error || 'Fehler bei der Suche');
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
                <h2 className="text-2xl font-bold text-app-fg">
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
                    className="p-2 hover:bg-app-bg"
                  />
                </DialogClose>
              </div>

              <div className="mb-4 rounded-lg border border-app-border bg-app-bg p-4">
                <div className="text-sm font-medium text-app-fg">Einwilligung (biometrische Daten)</div>
                <div className="mt-2 text-sm text-app-muted whitespace-pre-wrap">{effectiveNoticeText}</div>
                <label className="mt-3 flex items-start gap-3 text-sm text-app-fg">
                  <Checkbox checked={consentAccepted} onCheckedChange={(checked) => setConsent(checked)} className="mt-1" />
                  <span>{effectiveCheckboxLabel}</span>
                </label>
              </div>

              {!preview ? (
                <div className="space-y-4">
                  <p className="text-app-muted mb-4">
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
                      className="p-6 border-2 border-dashed border-app-border rounded-lg hover:border-app-accent hover:bg-app-bg transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-8 h-8 text-app-muted" />
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
                      className="p-6 border-2 border-dashed border-app-border rounded-lg hover:border-app-accent hover:bg-app-bg transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ImageIcon className="w-8 h-8 text-app-muted" />
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
                          className="px-4 py-3 bg-app-bg text-app-fg rounded-lg font-medium hover:opacity-90 transition-colors"
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
                      className="absolute top-2 right-2 bg-app-card border border-app-border shadow-md hover:bg-app-bg"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-app-bg border border-status-danger text-status-danger rounded-lg text-sm">
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
                      className="px-4 py-3 bg-app-bg text-app-fg rounded-lg font-medium hover:opacity-90 transition-colors"
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


