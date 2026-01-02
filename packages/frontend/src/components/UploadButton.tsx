'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Check, Camera, Video } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';
import { enqueueUpload, processUploadQueue } from '@/lib/uploadQueue';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';

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
  const [uploaderName, setUploaderName] = useState('');
  const [uploaderNameError, setUploaderNameError] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);

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
    } catch {
      // ignore
    }
  }, [onUploadSuccess]);

  useEffect(() => {
    // Try once on mount.
    void drainQueue();

    const onOnline = () => void drainQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      return () => window.removeEventListener('online', onOnline);
    }
  }, [drainQueue]);

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

  const uploadMedia = async (uploadId: string, file: File) => {
    setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: true, progress: 0 } : f)));

    const formData = new FormData();
    formData.append('file', file);
    const name = uploaderName.trim();
    if (name) {
      formData.append('uploaderName', name);
    }

    const isVideo = typeof file.type === 'string' && file.type.startsWith('video/');
    const endpoint = isVideo ? `/events/${eventId}/videos/upload` : `/events/${eventId}/photos/upload`;

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await enqueueUpload({
          endpoint,
          fields: name ? { uploaderName: name } : {},
          file,
        });
        setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 0, success: true } : f)));
        setQueueNotice('Offline: Upload wurde in die Queue gelegt und wird automatisch später gesendet.');
        window.setTimeout(() => setQueueNotice(null), 4500);
        return;
      }

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          const total = typeof evt.total === 'number' ? evt.total : 0;
          const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
          if (!total || total <= 0) return;
          const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
          setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, progress: pct } : f)));
        },
      });

      setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 100, success: true } : f)));

      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== uploadId));
        onUploadSuccess?.();
        // Dispatch event to reload photos
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('photoUploaded'));
        }
      }, 2000);
    } catch (error: any) {
      const msg = formatApiError(error);
      const retryable = isRetryableUploadError(error);

      if (retryable) {
        try {
          await enqueueUpload({
            endpoint,
            fields: name ? { uploaderName: name } : {},
            file,
          });
          setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, progress: 0, success: true } : f)));
          setQueueNotice('Upload in Queue gelegt (wird automatisch erneut versucht).');
          window.setTimeout(() => setQueueNotice(null), 4500);
          return;
        } catch {
          // fall back to normal error UI
        }
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, error: retryable ? `${msg} (Retry möglich)` : msg } : f))
      );
    }
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
      ) : variant === 'button' ? (
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
        </MotionButton>
      ) : (
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
          <input
            ref={capturePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCaptureFileSelected}
          />
          <input
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
              className="absolute top-4 right-4 p-1 hover:bg-app-bg rounded-full"
            />
          </DialogClose>

              <h2 className="text-xl font-semibold text-app-fg mb-6">Foto/Video hochladen</h2>

              {queueNotice && (
                <div className="mb-4 rounded-lg border border-[var(--status-success)] bg-app-bg px-3 py-2 text-sm text-[var(--status-success)]">
                  {queueNotice}
                </div>
              )}

              {disabled && disabledReason && (
                <div className="mb-4 rounded-lg border border-[var(--status-warning)] bg-app-bg px-3 py-2 text-sm text-[var(--status-warning)]">
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
                    Dein Name <span className="text-[var(--status-danger)]">*</span>
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
                    className="w-full px-4 py-3 border-2 border-tokens-brandGreen rounded-lg text-app-fg bg-app-card focus:outline-none focus:ring-2 focus:ring-tokens-brandGreen/30 focus:border-tokens-brandGreen font-medium"
                  />
                  {uploaderNameError && <p className="text-xs text-[var(--status-danger)]">{uploaderNameError}</p>}
                  <p className="text-xs text-app-muted">
                    Damit der Gastgeber weiß, wer die Fotos hochgeladen hat
                  </p>
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
                      ? 'border-tokens-brandGreen bg-app-bg' 
                      : 'border-app-border hover:border-tokens-brandGreen hover:bg-app-bg'
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
                  variant="ghost"
                  size="sm"
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                    !canPickFiles ? 'bg-app-border text-app-muted cursor-not-allowed' : 'bg-app-fg text-app-bg hover:opacity-90'
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
                                className="bg-tokens-brandGreen h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                          {file.error && (
                            <div className="mt-1">
                              <p className="text-xs text-[var(--status-danger)]">{file.error}</p>
                              <Button
                                type="button"
                                onClick={() => retryUpload(file.id)}
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-xs font-semibold text-tokens-brandGreen underline"
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
                              className="w-6 h-6 rounded-full bg-tokens-brandGreen flex items-center justify-center"
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

