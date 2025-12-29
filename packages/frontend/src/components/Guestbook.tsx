'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Heart, User, Edit2, Check, X, Image as ImageIcon, Globe, Lock, Mic, Square, Trash2 } from 'lucide-react';
import api from '@/lib/api';

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
  
  // Debug: Log isHost value
  useEffect(() => {
    console.log('Guestbook isHost:', isHost);
  }, [isHost]);
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
      console.error('Fehler beim Laden der Gästebuch-Einträge:', err);
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
      console.error('Fehler beim Hochladen des Fotos:', err);
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
      console.error('Fehler beim Hochladen des Audios:', err);
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
          console.error('Fehler beim Stop/Upload Audio:', e);
          setError(e?.message || 'Fehler bei der Audio-Aufnahme');
        } finally {
          setIsRecording(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Fehler beim Starten der Aufnahme:', err);
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
      console.error('Fehler beim Erstellen des Eintrags:', err);
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
      console.error('Fehler beim Speichern der Host-Nachricht:', err);
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
    <div className="flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
      {/* Scrollable Container with Sticky Host Message */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}>
        {/* Sticky Host Message */}
        {displayHostMessage && (
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#295B4D] to-[#1f4238] flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 max-w-[75%]">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-200">
                  {isEditingHostMessage && isHost ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedHostMessage}
                        onChange={(e) => setEditedHostMessage(e.target.value)}
                        rows={3}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295B4D] text-sm resize-none"
                        placeholder="Host-Nachricht..."
                        maxLength={2000}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveHostMessage}
                          className="px-3 py-1 bg-[#295B4D] text-white text-xs rounded-lg hover:bg-[#1f4238] flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Speichern
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded-lg hover:bg-gray-50 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap break-words flex-1">
                        {displayHostMessage}
                      </p>
                      {isHost && (
                        <button
                          onClick={() => {
                            console.log('Edit button clicked, isHost:', isHost);
                            setIsEditingHostMessage(true);
                          }}
                          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors border border-gray-200"
                          title="Nachricht bearbeiten"
                        >
                          <Edit2 className="w-4 h-4 text-[#295B4D]" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500 mt-1 block">{eventTitle || 'Event'}</span>
              </div>
            </motion.div>
          </div>
        )}

        {/* Guest Entries */}
        <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>

            {/* Guest Entries - Right Side */}
            {entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
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
                    <div className="bg-[#295B4D] text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {entry.authorName}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {entry.message}
                      </p>
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
                              console.error('Fehler beim Laden des Bildes:', entry.photoUrl);
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
                    <span className="text-xs text-gray-500 mt-1">
                      {formatDate(entry.createdAt)}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
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
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Dein Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295B4D] text-sm"
              disabled={submitting}
              maxLength={100}
            />
            
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Schreibe eine Nachricht..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#295B4D] text-sm resize-none"
              disabled={submitting}
              maxLength={2000}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sprachnachricht (optional)
              </label>

              {!audioPreviewUrl ? (
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={submitting || uploadingAudio}
                      className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Aufnahme starten"
                    >
                      <Mic className="w-5 h-5 text-gray-700" />
                      <span className="text-sm text-gray-700">Aufnehmen</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      disabled={submitting || uploadingAudio}
                      className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Aufnahme stoppen"
                    >
                      <Square className="w-5 h-5" />
                      <span className="text-sm">Stop</span>
                    </button>
                  )}

                  {uploadingAudio && (
                    <div className="text-sm text-gray-600">Audio wird hochgeladen…</div>
                  )}
                </div>
              ) : null}
            </div>

            {audioPreviewUrl && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-xs text-gray-600">Audio</div>
                  <button
                    type="button"
                    onClick={removeAudio}
                    className="p-2 hover:bg-white rounded-lg border border-gray-200"
                    disabled={submitting || uploadingAudio}
                    title="Audio entfernen"
                  >
                    <Trash2 className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
                <audio controls preload="none" className="w-full">
                  <source src={audioPreviewUrl} />
                </audio>
              </div>
            )}

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#295B4D] transition-colors">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploadingPhoto ? 'Wird hochgeladen...' : 'Foto auswählen'}
                  </span>
                  <input
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
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded"
                  disabled={submitting}
                />
                <div className="flex items-center gap-1">
                  {isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Im Feed anzeigen</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700">Nur im Gästebuch</span>
                    </>
                  )}
                </div>
              </label>
            </div>
            
            <button
              type="submit"
              disabled={submitting || uploadingPhoto || uploadingAudio || isRecording || !message.trim() || !authorName.trim()}
              className="w-full bg-[#295B4D] text-white py-3 px-4 rounded-lg hover:bg-[#1f4238] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Nachricht senden
                </>
              )}
            </button>
          </form>
        </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Vollbild"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 rounded-full p-2 shadow-lg transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
