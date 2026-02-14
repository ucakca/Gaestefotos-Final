'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Check,
  Edit2,
  Heart,
  Image as ImageIcon,
  Globe,
  Lock,
  Mic,
  Send,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface GuestbookEntry {
  id: string;
  authorName: string;
  message: string;
  photoUrl?: string | null;
  audioUrl?: string | null;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  guestId?: string | null;
}

interface GuestbookProps {
  eventId: string;
  isHost?: boolean;
  eventTitle?: string;
}

const DEFAULT_HOST_MESSAGE = 'Vielen Dank, dass ihr da seid! Hinterlasst gerne eine Nachricht im Gästebuch.';

export default function Guestbook({ eventId, isHost: propIsHost = false, eventTitle }: GuestbookProps) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [hostMessage, setHostMessage] = useState<string | null>(null);
  const [isEditingHostMessage, setIsEditingHostMessage] = useState(false);
  const [editedHostMessage, setEditedHostMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(propIsHost);

  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoStoragePath, setPhotoStoragePath] = useState<string | null>(null);
  const [photoSizeBytes, setPhotoSizeBytes] = useState<string | null>(null);
  const [photoUploadId, setPhotoUploadId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioStoragePath, setAudioStoragePath] = useState<string | null>(null);
  const [audioSizeBytes, setAudioSizeBytes] = useState<string | null>(null);
  const [audioUploadId, setAudioUploadId] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    loadEntries();
  }, [eventId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [entries, hostMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/events/${eventId}/guestbook`);
      setEntries(response.data.entries || []);
      setHostMessage(response.data.hostMessage || DEFAULT_HOST_MESSAGE);
      setEditedHostMessage(response.data.hostMessage || DEFAULT_HOST_MESSAGE);
      
      // Use isHost from backend (more reliable than prop)
      if (response.data.isHost !== undefined) {
        setIsHost(response.data.isHost);
      } else {
        setIsHost(propIsHost);
      }
    } catch (err: any) {
      void err;
      setError('Fehler beim Laden der Einträge');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPhoto(file);
    // Create object URL for preview
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);

    // Upload photo immediately
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await api.post(`/events/${eventId}/guestbook/upload-photo`, formData);

      // Update preview with server URL if available, otherwise keep blob URL
      if (response.data.photoUrl) {
        // Revoke old blob URL to free memory
        if (photoPreview && photoPreview.startsWith('blob:')) {
          URL.revokeObjectURL(photoPreview);
        }
        setPhotoUrl(response.data.photoUrl);
        setPhotoPreview(response.data.photoUrl);
      }
      setPhotoStoragePath(response.data.storagePath);
      setPhotoSizeBytes(typeof response.data.photoSizeBytes === 'string' ? response.data.photoSizeBytes : null);
      setPhotoUploadId(typeof response.data.uploadId === 'string' ? response.data.uploadId : null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Hochladen des Fotos';
      setError(errorMessage);
      // Revoke blob URL if it exists
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setPhotoUrl(null);
      setPhotoStoragePath(null);
      setPhotoSizeBytes(null);
      setPhotoUploadId(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    // Revoke blob URL if it exists
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setPhotoStoragePath(null);
    setPhotoSizeBytes(null);
    setPhotoUploadId(null);
  };

  const uploadAudioBlob = async (blob: Blob) => {
    try {
      setUploadingAudio(true);
      const file = new File([blob], `guestbook-audio-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      });

      const formData = new FormData();
      formData.append('audio', file);
      if (audioDurationMs !== null) {
        formData.append('durationMs', String(audioDurationMs));
      }
      const response = await api.post(`/events/${eventId}/guestbook/upload-audio`, formData);

      setAudioPreviewUrl(typeof response.data.audioUrl === 'string' ? response.data.audioUrl : null);
      setAudioStoragePath(typeof response.data.storagePath === 'string' ? response.data.storagePath : null);
      setAudioSizeBytes(typeof response.data.audioSizeBytes === 'string' ? response.data.audioSizeBytes : null);
      setAudioUploadId(typeof response.data.uploadId === 'string' ? response.data.uploadId : null);
      setAudioMimeType(typeof response.data.audioMimeType === 'string' ? response.data.audioMimeType : null);
      setAudioDurationMs(typeof response.data.audioDurationMs === 'number' ? response.data.audioDurationMs : audioDurationMs);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Hochladen des Audios';
      setError(errorMessage);
      setAudioPreviewUrl(null);
      setAudioStoragePath(null);
      setAudioSizeBytes(null);
      setAudioUploadId(null);
      setAudioMimeType(null);
      setAudioDurationMs(null);
    } finally {
      setUploadingAudio(false);
    }
  };

  const getAudioDurationMs = (blobUrl: string): Promise<number | null> =>
    new Promise((resolve) => {
      try {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.src = blobUrl;
        const cleanup = () => {
          audio.src = '';
        };
        audio.onloadedmetadata = () => {
          const d = Number(audio.duration);
          cleanup();
          if (!Number.isFinite(d) || d <= 0) return resolve(null);
          resolve(Math.floor(d * 1000));
        };
        audio.onerror = () => {
          cleanup();
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });

  const startRecording = async () => {
    try {
      setError('');
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        setError('Audio-Aufnahme wird in diesem Browser nicht unterstützt');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) {
          audioChunksRef.current.push(evt.data);
        }
      };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());

          const blobUrl = URL.createObjectURL(blob);
          const dur = await getAudioDurationMs(blobUrl);
          URL.revokeObjectURL(blobUrl);

          if (dur !== null && dur > 60_000) {
            setAudioDurationMs(null);
            setError('Audio ist zu lang (max. 60 Sekunden)');
            return;
          }

          setAudioDurationMs(dur);
          await uploadAudioBlob(blob);
        } catch (e: any) {
          setError(e?.message || 'Fehler bei der Audio-Aufnahme');
        } finally {
          setIsRecording(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      setError(err?.message || 'Mikrofon-Zugriff fehlgeschlagen');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {
      setIsRecording(false);
    }
  };

  const removeAudio = () => {
    setAudioPreviewUrl(null);
    setAudioStoragePath(null);
    setAudioSizeBytes(null);
    setAudioUploadId(null);
    setAudioMimeType(null);
    setAudioDurationMs(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Bitte gib eine Nachricht ein');
      return;
    }

    if (!authorName.trim()) {
      setError('Bitte gib deinen Namen ein');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      // Only send photoStoragePath, not photoUrl (to avoid sending blob URLs)
      // The backend will generate the URL from storagePath
      await api.post(`/events/${eventId}/guestbook`, {
        authorName: authorName.trim(),
        message: message.trim(),
        photoUrl: null, // Don't send blob URLs - backend will generate from storagePath
        photoStoragePath: photoStoragePath || null,
        photoSizeBytes: photoSizeBytes || null,
        photoUploadId: photoUploadId || null,
        audioUrl: null,
        audioStoragePath: audioStoragePath || null,
        audioSizeBytes: audioSizeBytes || null,
        audioUploadId: audioUploadId || null,
        audioMimeType: audioMimeType || null,
        audioDurationMs: null,
        isPublic: isPublic,
      });

      // Reset form
      setAuthorName('');
      setMessage('');
      setSelectedPhoto(null);
      // Revoke blob URL if it exists
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
      setPhotoUrl(null);
      setPhotoStoragePath(null);
      setPhotoSizeBytes(null);
      setPhotoUploadId(null);
      removeAudio();
      setIsPublic(true);
      
      // Reload entries
      await loadEntries();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen des Eintrags');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHostMessage = async () => {
    try {
      await api.put(`/events/${eventId}/guestbook/host-message`, {
        message: editedHostMessage.trim() || null,
      });
      setHostMessage(editedHostMessage.trim() || DEFAULT_HOST_MESSAGE);
      setIsEditingHostMessage(false);
    } catch (err: any) {
      setError('Fehler beim Speichern der Nachricht');
    }
  };

  const handleCancelEdit = () => {
    setEditedHostMessage(hostMessage || DEFAULT_HOST_MESSAGE);
    setIsEditingHostMessage(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'gerade eben';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `vor ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `vor ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const displayHostMessage = hostMessage || DEFAULT_HOST_MESSAGE;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Scrollable Container with Sticky Host Message */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-background overscroll-contain">
        {/* Sticky Host Message */}
        {displayHostMessage && (
          <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 shadow-sm">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-app-accent to-app-fg flex items-center justify-center">
                  <User className="w-5 h-5 text-app-bg" />
                </div>
              </div>
              <div className="flex-1 max-w-[75%]">
                <div className="bg-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-border">
                  {isEditingHostMessage && isHost ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedHostMessage}
                        onChange={(e) => setEditedHostMessage(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-fg/30 text-sm resize-none bg-card text-foreground"
                        placeholder="Host-Nachricht..."
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={handleSaveHostMessage}
                          variant="primary"
                          size="sm"
                          className="text-xs gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Speichern
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCancelEdit}
                          size="sm"
                          className="text-xs gap-1"
                        >
                          <X className="w-3 h-3" />
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words flex-1">
                        {displayHostMessage}
                      </p>
                      {isHost && (
                        <IconButton
                          onClick={() => {
                            setIsEditingHostMessage(true);
                          }}
                          icon={<Edit2 className="w-4 h-4 text-foreground" />}
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0 border border-border"
                          aria-label="Nachricht bearbeiten"
                          title="Nachricht bearbeiten"
                        />
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">{eventTitle || 'Event'}</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Guest Entries */}
        <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-fg"></div>
          </div>
        ) : (
          <>

            {/* Guest Entries - Right Side */}
            {entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-1">Noch keine Einträge</p>
                <p className="text-xs opacity-70">Sei der Erste, der eine Nachricht hinterlässt!</p>
              </div>
            ) : (
              entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 justify-end"
                >
                  <div className="flex-1 max-w-[75%] flex flex-col items-end">
                    <div className="bg-app-accent text-app-bg rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{entry.authorName}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{entry.message}</p>

                      {entry.audioUrl && (
                        <div className="mt-3 w-full">
                          <audio controls preload="none" className="w-full">
                            <source src={entry.audioUrl} />
                          </audio>
                        </div>
                      )}

                      {entry.photoUrl && (
                        <div className="mt-3">
                          <img
                            src={entry.photoUrl}
                            alt="Gästebuch Foto"
                            className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setSelectedImage(entry.photoUrl || null)}
                            onError={(e) => {
                              // Fallback: versuche absolute URL wenn relative
                              const img = e.target as HTMLImageElement;
                              if (entry.photoUrl && entry.photoUrl.startsWith('/api/')) {
                                const absoluteUrl = window.location.origin + entry.photoUrl;
                                if (img.src !== absoluteUrl) {
                                  img.src = absoluteUrl;
                                }
                              } else if (entry.photoUrl && !entry.photoUrl.startsWith('http')) {
                                // Relative URL ohne /api/
                                const absoluteUrl = window.location.origin + (entry.photoUrl.startsWith('/') ? '' : '/') + entry.photoUrl;
                                if (img.src !== absoluteUrl) {
                                  img.src = absoluteUrl;
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground mt-1">{formatDate(entry.createdAt)}</span>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-app-accent to-app-fg flex items-center justify-center">
                      <User className="w-5 h-5 text-app-bg" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
        </div>
      </div>

      {/* Input Form - Everyone can add messages - Fixed at bottom */}
      <div className="border-t border-border p-4 bg-card flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-background border border-status-danger text-destructive text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            
            <Input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Dein Name"
              className="w-full px-4 py-2 text-sm"
              disabled={submitting}
              maxLength={100}
            />
            
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Schreibe eine Nachricht..."
              rows={3}
              className="w-full px-4 py-2 text-sm resize-none"
              disabled={submitting}
              maxLength={2000}
            />

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sprachnachricht (optional)
              </label>

              {!audioPreviewUrl ? (
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <Button
                      type="button"
                      onClick={startRecording}
                      disabled={submitting || uploadingAudio}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-2 px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Aufnahme starten"
                    >
                      <Mic className="w-5 h-5 text-foreground" />
                      <span className="text-sm text-foreground">Aufnehmen</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopRecording}
                      disabled={submitting || uploadingAudio}
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-2 px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Aufnahme stoppen"
                    >
                      <Square className="w-5 h-5" />
                      <span className="text-sm">Stop</span>
                    </Button>
                  )}

                  {uploadingAudio && (
                    <div className="text-sm text-muted-foreground">Audio wird hochgeladen…</div>
                  )}
                </div>
              ) : null}
            </div>

            {audioPreviewUrl && (
              <div className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-muted-foreground">Audio</div>
                  <IconButton
                    type="button"
                    onClick={removeAudio}
                    icon={<Trash2 className="w-4 h-4" />}
                    variant="danger"
                    size="sm"
                    className="rounded-lg"
                    disabled={submitting || uploadingAudio}
                    aria-label="Audio entfernen"
                    title="Audio entfernen"
                  />
                </div>
                <audio controls preload="none" className="w-full">
                  <source src={audioPreviewUrl} />
                </audio>
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Foto hinzufügen (optional)
              </label>
              {photoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={photoPreview}
                    alt="Vorschau"
                    className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedImage(photoPreview)}
                  />
                  <div className="absolute -top-2 -right-2">
                    <IconButton
                      type="button"
                      onClick={handleRemovePhoto}
                      icon={<X className="w-3 h-3" />}
                      variant="danger"
                      size="sm"
                      className="shadow-lg"
                      aria-label="Foto entfernen"
                      title="Foto entfernen"
                    />
                  </div>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-app-accent transition-colors">
                  <span className="text-sm text-muted-foreground">
                    {uploadingPhoto ? 'Wird hochgeladen...' : 'Foto auswählen'}
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={uploadingPhoto || submitting}
                  />
                </label>
              )}
            </div>

            {/* Public/Private Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked)} disabled={submitting} />
                <div className="flex items-center gap-1">
                  {isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">Im Feed anzeigen</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground">Nur im Gästebuch</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            
            <Button
              type="submit"
              disabled={submitting || uploadingPhoto || uploadingAudio || isRecording || !message.trim() || !authorName.trim()}
              variant="primary"
              size="sm"
              className="w-full py-3 px-4 font-medium flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-app-bg"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Nachricht senden
                </>
              )}
            </Button>
          </form>
        </div>

      {/* Image Lightbox Modal */}
      <Dialog open={selectedImage !== null} onOpenChange={(open) => (open ? null : setSelectedImage(null))}>
        {selectedImage !== null && (
          <DialogContent className="bg-app-fg/75 max-w-4xl w-full max-h-[90vh] p-0">
            <DialogTitle className="sr-only">Bild Vorschau</DialogTitle>
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img src={selectedImage} alt="Vollbild" className="max-w-full max-h-full object-contain rounded-lg" />
              <div className="absolute top-4 right-4">
                <DialogClose asChild>
                  <IconButton
                    onClick={() => setSelectedImage(null)}
                    icon={<X className="w-6 h-6" />}
                    variant="ghost"
                    size="md"
                    className="bg-card/90 hover:bg-card shadow-lg border border-border"
                    aria-label="Schließen"
                    title="Schließen"
                  />
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
