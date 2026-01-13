'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Check, Camera, Video } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';
import { enqueueUpload, processUploadQueue, getQueueCount } from '@/lib/uploadQueue';
import { uploadWithTus } from '@/lib/tusUpload';
import { trackUpload } from '@/lib/uploadMetrics';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface UploadButtonProps {
  eventId: string;
  onUploadSuccess?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'tile' | 'button' | 'fab';
  buttonLabel?: string;
}

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
  success?: boolean;
}

function createUploadId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

/**
 * Exponential backoff delay for retries.
 * Returns delay in ms: 1s, 2s, 4s, 8s, 16s (capped)
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 16000;
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Client-side resize to reduce upload size and bandwidth.
 * Resizes images to max 2500px before upload.
 * Backend will then create: Original (full quality) + Optimized (1920px) + Thumbnail (300px)
 */
async function resizeImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const MAX_DIMENSION = 2500;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;
      
      // Skip if already smaller than max
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      // Calculate new dimensions
      const scale = MAX_DIMENSION / Math.max(width, height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      // Resize using canvas
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

 const MotionButton = motion(Button);

export default function UploadButton({
  eventId,
  onUploadSuccess,
  disabled,
  disabledReason,
  variant = 'tile',
  buttonLabel = 'Foto/Video hochladen',
}: UploadButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploaderName, setUploaderName] = useState(() => {
    // Load saved name from localStorage on init
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guestUploaderName') || '';
    }
    return '';
  });
  const [uploaderNameError, setUploaderNameError] = useState<string | null>(null);

  // Persist name to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && uploaderName.trim()) {
      localStorage.setItem('guestUploaderName', uploaderName.trim());
    }
  }, [uploaderName]);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);

  const nameOk = uploaderName.trim().length > 0;
  const canPickFiles = !disabled && nameOk;

  const drainQueue = useCallback(async () => {
    try {
      const { processed } = await processUploadQueue({
        maxItems: 5,
        fetchFn: async (endpoint, body) => {
          await api.post(endpoint, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        },
      });

      if (processed > 0) {
        setQueueNotice(`${processed} Upload(s) aus der Offline-Queue gesendet.`);
        onUploadSuccess?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('photoUploaded'));
        }
        window.setTimeout(() => setQueueNotice(null), 3500);
      }
      await refreshQueueCount();
    } catch {
      // ignore
    }
  }, [onUploadSuccess]);

  const refreshQueueCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingQueueCount(count);
  }, []);

  useEffect(() => {
    // Try once on mount.
    void drainQueue();
    void refreshQueueCount();

    const onOnline = () => {
      void drainQueue();
      void refreshQueueCount();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
    }
  }, [drainQueue, refreshQueueCount]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const name = uploaderName.trim();
    if (!name) {
      setUploaderNameError('Bitte zuerst deinen Namen eingeben.');
      return;
    }

    const newFiles = acceptedFiles.map((file) => ({
      id: createUploadId(),
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files
    newFiles.forEach((uploadFile) => {
      uploadMedia(uploadFile.id, uploadFile.file);
    });
  }, [uploaderName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
    },
    multiple: true,
    disabled: !canPickFiles,
  });

  const capturePhotoInputRef = useRef<HTMLInputElement>(null);
  const captureVideoInputRef = useRef<HTMLInputElement>(null);

  const onCaptureFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // allow selecting the same file again
      e.target.value = '';
      if (!file) return;
      onDrop([file]);
    },
    [onDrop]
  );

  const capturePhoto = useCallback(() => {
    const name = uploaderName.trim();
    if (!name) {
      setUploaderNameError('Bitte zuerst deinen Namen eingeben.');
      return;
    }
    capturePhotoInputRef.current?.click();
  }, [uploaderName]);

  const captureVideo = useCallback(() => {
    const name = uploaderName.trim();
    if (!name) {
      setUploaderNameError('Bitte zuerst deinen Namen eingeben.');
      return;
    }
    captureVideoInputRef.current?.click();
  }, [uploaderName]);

  const uploadMedia = async (uploadId: string, originalFile: File) => {
    setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: true, progress: 0 } : f)));

    const startTime = Date.now();
    const originalSize = originalFile.size;

    // Client-side resize for bandwidth optimization
    const file = await resizeImageIfNeeded(originalFile);
    const resizedSize = file.size;

    const name = uploaderName.trim();
    const isVideo = typeof file.type === 'string' && file.type.startsWith('video/');

    // Check offline status first
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const endpoint = isVideo ? `/events/${eventId}/videos/upload` : `/events/${eventId}/photos/upload`;
      await enqueueUpload({
        endpoint,
        fields: name ? { uploaderName: name } : {},
        file,
      });
      setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 0, success: true } : f)));
      setQueueNotice('Offline: Upload wurde in die Queue gelegt und wird automatisch später gesendet.');
      await refreshQueueCount();
      window.setTimeout(() => setQueueNotice(null), 4500);
      return;
    }

    // Use Tus.io for resumable uploads (supports auto-resume on connection failure)
    try {
      await uploadWithTus(file, {
        eventId,
        uploadedBy: name,
        onProgress: (percent) => {
          setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, progress: Math.round(percent) } : f)));
        },
        onError: (error) => {
          console.error('Tus upload error:', error);
        },
      });

      // Success!
      setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 100, success: true } : f)));

      // Track successful upload
      trackUpload({
        originalSize,
        resizedSize,
        duration: Date.now() - startTime,
        success: true,
        fileType: originalFile.type,
        timestamp: Date.now(),
      });

      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== uploadId));
        onUploadSuccess?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('photoUploaded'));
        }
      }, 2000);
      return;

    } catch (tusError: any) {
      console.warn('Tus upload failed, falling back to standard upload:', tusError);
    }

    // Fallback to standard multipart upload
    const formData = new FormData();
    formData.append('file', file);
    if (name) {
      formData.append('uploaderName', name);
    }

    const endpoint = isVideo ? `/events/${eventId}/videos/upload` : `/events/${eventId}/photos/upload`;
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const retryFormData = new FormData();
        retryFormData.append('file', file);
        if (name) {
          retryFormData.append('uploaderName', name);
        }

        await api.post(endpoint, retryFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const total = typeof evt.total === 'number' ? evt.total : 0;
            const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
            if (!total || total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
            setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, progress: pct } : f)));
          },
        });

        // Success!
        setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 100, success: true } : f)));

        // Track successful fallback upload
        trackUpload({
          originalSize,
          resizedSize,
          duration: Date.now() - startTime,
          success: true,
          fileType: originalFile.type,
          timestamp: Date.now(),
        });

        setTimeout(() => {
          setFiles((prev) => prev.filter((f) => f.id !== uploadId));
          onUploadSuccess?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoUploaded'));
          }
        }, 2000);
        return;

      } catch (error: any) {
        lastError = error;
        const retryable = isRetryableUploadError(error);

        const isDisconnect = 
          error?.code === 'ERR_NETWORK' ||
          error?.message?.toLowerCase().includes('network') ||
          error?.message?.toLowerCase().includes('timeout') ||
          error?.name === 'AbortError';

        if (isDisconnect && attempt === 0) {
          try {
            await enqueueUpload({
              endpoint,
              fields: name ? { uploaderName: name } : {},
              file,
            });
            setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 0, success: true } : f)));
            setQueueNotice('Verbindungsabbruch: Upload in Queue gelegt.');
            await refreshQueueCount();
            window.setTimeout(() => setQueueNotice(null), 4500);
            return;
          } catch {
            // Fall through to retry logic
          }
        }

        if (!retryable || attempt >= MAX_RETRIES) {
          break;
        }

        const delay = getRetryDelay(attempt);
        setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, progress: 0 } : f)));
        await sleep(delay);
      }
    }

    // All retries failed - try to queue or show error
    const msg = formatApiError(lastError);
    const retryable = isRetryableUploadError(lastError);

    if (retryable) {
      try {
        await enqueueUpload({
          endpoint,
          fields: name ? { uploaderName: name } : {},
          file,
        });
        setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 0, success: true } : f)));
        setQueueNotice('Upload in Queue gelegt (wird automatisch erneut versucht).');
        await refreshQueueCount();
        window.setTimeout(() => setQueueNotice(null), 4500);
        return;
      } catch {
        // fall back to normal error UI
      }
    }

    // Track failed upload
    trackUpload({
      originalSize,
      resizedSize,
      duration: Date.now() - startTime,
      success: false,
      errorMessage: msg,
      fileType: originalFile.type,
      timestamp: Date.now(),
    });

    setFiles((prev) =>
      prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, error: retryable ? `${msg} (Retry möglich)` : msg } : f))
    );
  };

  const retryUpload = (uploadId: string) => {
    const entry = files.find((f) => f.id === uploadId);
    if (!entry) return;
    uploadMedia(uploadId, entry.file);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const file = newFiles[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  return (
    <>
      {variant === 'fab' ? (
        <div className="relative">
          <MotionButton
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            onClick={() => {
              if (disabled) return;
              setShowModal(true);
            }}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            variant="secondary"
            size="sm"
            className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center p-0 ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
          >
            <Plus className="w-6 h-6" strokeWidth={3} />
          </MotionButton>
          {pendingQueueCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-status-warning text-app-bg rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm"
            >
              {pendingQueueCount}
            </motion.div>
          )}
        </div>
      ) : variant === 'button' ? (
        <div className="relative w-full">
          <MotionButton
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: disabled ? 1 : 1.01 }}
            whileTap={{ scale: disabled ? 1 : 0.99 }}
            onClick={() => {
              if (disabled) return;
              setShowModal(true);
            }}
            disabled={disabled}
            title={disabled ? disabledReason : undefined}
            variant="secondary"
            size="sm"
            className={`w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 font-semibold shadow-sm h-auto ${
              disabled ? 'cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-5 h-5" />
            <span className="truncate">{buttonLabel}</span>
            {pendingQueueCount > 0 && (
              <span className="ml-1 bg-status-warning text-app-bg rounded-full px-2 py-0.5 text-xs font-bold">
                {pendingQueueCount}
              </span>
            )}
          </MotionButton>
        </div>
      ) : (
        <div className="relative">
          <MotionButton
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (disabled) return;
              setShowModal(true);
            }}
            disabled={disabled}
            variant="primary"
            size="sm"
            className={`aspect-square rounded-sm overflow-hidden group relative ${
              disabled ? 'bg-app-border cursor-not-allowed' : ''
            } p-0 h-auto`}
            title={disabled ? disabledReason : undefined}
          >
            <div className="w-full h-full flex items-center justify-center">
              <Plus className={`w-8 h-8 ${disabled ? 'text-app-muted' : 'text-app-bg'}`} strokeWidth={3} />
            </div>
            {!disabled && <div className="absolute inset-0 bg-app-fg/0 group-hover:bg-app-fg/10 transition-opacity" />}
          </MotionButton>
          {pendingQueueCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 bg-status-warning text-app-bg rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm"
            >
              {pendingQueueCount}
            </motion.div>
          )}
        </div>
      )}

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (open) return;
          setShowModal(false);
          setUploaderName('');
          setUploaderNameError(null);
        }}
      >
        <DialogContent className="max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
          <Input
            ref={capturePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCaptureFileSelected}
          />
          <Input
            ref={captureVideoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={onCaptureFileSelected}
          />
          <DialogClose asChild>
            <IconButton
              onClick={() => {
                setShowModal(false);
                setUploaderName('');
                setUploaderNameError(null);
              }}
              icon={<X className="w-5 h-5 text-app-fg" />}
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
              className="absolute top-4 right-4 p-1 rounded-full"
            />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold text-app-fg mb-6">Foto/Video hochladen</DialogTitle>

          {queueNotice && (
            <div className="mb-4 rounded-lg border border-status-success bg-app-bg px-3 py-2 text-sm text-status-success">
              {queueNotice}
            </div>
          )}

          {disabled && disabledReason && (
            <div className="mb-4 rounded-lg border border-status-warning bg-app-bg px-3 py-2 text-sm text-status-warning">
              {disabledReason}
            </div>
          )}

          {/* Uploader Name - Auffällig als Pflichtfeld */}
          <div className="mb-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <label className="block text-sm font-semibold text-app-fg">
                Dein Name <span className="text-status-danger">*</span>
              </label>
              <Input
                type="text"
                value={uploaderName}
                onChange={(e) => {
                  setUploaderName(e.target.value);
                  if (uploaderNameError) setUploaderNameError(null);
                }}
                placeholder="z.B. Max Mustermann"
                required
                className="w-full rounded-lg border-2 border-app-accent bg-app-card px-4 py-3 font-medium text-app-fg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-fg/15"
              />
              {uploaderNameError && <p className="text-xs text-status-danger">{uploaderNameError}</p>}
              <p className="text-xs text-app-muted">Damit der Gastgeber weiß, wer die Fotos hochgeladen hat</p>
            </motion.div>
          </div>

              <div
                {...getRootProps()}
                className={`mb-4 ${canPickFiles ? '' : 'opacity-60 cursor-not-allowed'}`}
              >
                <input {...getInputProps()} />
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive 
                      ? 'border-app-accent bg-app-bg' 
                      : 'border-app-border hover:border-app-accent hover:bg-app-bg'
                    }
                  `}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-app-muted" />
                  <p className="text-sm font-medium text-app-fg mb-2">
                    {!nameOk
                      ? 'Bitte zuerst deinen Namen eingeben'
                      : isDragActive
                        ? 'Fotos hier ablegen'
                        : 'Fotos hochladen'}
                  </p>
                  <p className="text-xs text-app-muted">
                    {!nameOk ? 'Dann kannst du Dateien auswählen' : 'Drag & Drop oder klicken'}
                  </p>
                </motion.div>
              </div>

              <div className="space-y-3">
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={capturePhoto}
                  disabled={!canPickFiles}
                  variant={canPickFiles ? 'primary' : 'secondary'}
                  size="sm"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                    !canPickFiles ? 'cursor-not-allowed opacity-60' : ''
                  } h-auto`}
                >
                  <Camera className="w-5 h-5" />
                  Foto aufnehmen
                </MotionButton>

                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={captureVideo}
                  disabled={!canPickFiles}
                  variant="secondary"
                  size="sm"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                    !canPickFiles ? 'cursor-not-allowed opacity-60' : ''
                  } h-auto`}
                >
                  <Video className="w-5 h-5" />
                  Video aufnehmen
                </MotionButton>
              </div>

              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2 max-h-48 overflow-y-auto"
                  >
                    {files.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-app-bg border border-app-border rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-app-card flex-shrink-0">
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-app-fg truncate">
                            {file.file.name}
                          </p>
                          {file.uploading && (
                            <div className="mt-1 w-full bg-app-border rounded-full h-1.5">
                              <motion.div
                                className="h-1.5 rounded-full bg-app-accent"
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                          {file.error && (
                            <div className="mt-1">
                              <p className="text-xs text-status-danger">{file.error}</p>
                              <Button
                                type="button"
                                onClick={() => retryUpload(file.id)}
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-xs font-semibold text-app-fg underline"
                              >
                                Erneut versuchen
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center">
                          {file.success && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-app-accent"
                            >
                              <Check className="w-4 h-4 text-app-bg" />
                            </motion.div>
                          )}
                          {!file.uploading && !file.success && (
                            <IconButton
                              onClick={() => removeFile(index)}
                              icon={<X className="w-4 h-4" />}
                              variant="ghost"
                              size="sm"
                              aria-label="Entfernen"
                              title="Entfernen"
                              className="w-6 h-6 rounded-full bg-app-card border border-app-border text-app-muted hover:opacity-80"
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

        </DialogContent>
      </Dialog>
    </>
  );
}

