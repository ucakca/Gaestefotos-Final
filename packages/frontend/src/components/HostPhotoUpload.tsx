'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Smile } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

const MotionButton = motion(Button);

interface HostPhotoUploadProps {
  eventId: string;
  onUploadSuccess?: () => void;
}

interface UploadFile {
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
  success?: boolean;
}

export default function HostPhotoUpload({ eventId, onUploadSuccess }: HostPhotoUploadProps) {
  const [showModal, setShowModal] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [description, setDescription] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const capturePhotoInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: true,
  });

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
    capturePhotoInputRef.current?.click();
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setDescription(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const uploadOne = useCallback(
    async (fileIndex: number, file: File) => {
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === fileIndex ? { ...f, uploading: true, progress: 0, error: undefined, success: false } : f
        )
      );

      const formData = new FormData();
      formData.append('file', file);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('uploadedBy', 'Gastgeber');

      try {
        await api.post(`/events/${eventId}/photos/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const total = typeof evt.total === 'number' ? evt.total : 0;
            const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
            if (!total || total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
            setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, progress: pct } : f)));
          },
        });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === fileIndex ? { ...f, uploading: false, progress: 100, success: true } : f))
        );
        return true;
      } catch (error: any) {
        const msg = formatApiError(error);
        const retryable = isRetryableUploadError(error);
        setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, uploading: false, error: msg } : f)));
        if (retryable) {
          setFiles((prev) => prev.map((f, idx) => (idx === fileIndex ? { ...f, error: `${msg} (Retry möglich)` } : f)));
        }
        return false;
      }
    },
    [description, eventId]
  );

  const uploadPhotos = async () => {
    if (files.length === 0) return;

    const snapshot = files;
    const allOk = await snapshot.reduce<Promise<boolean>>(async (prevPromise, uploadFile, index) => {
      const prevOk = await prevPromise;
      const ok = await uploadOne(index, uploadFile.file);
      return prevOk && ok;
    }, Promise.resolve(true));

    if (!allOk) return;

    setTimeout(() => {
      setFiles([]);
      setDescription('');
      setShowModal(false);
      onUploadSuccess?.();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('photoUploaded'));
      }
    }, 1500);
  };

  const retryUpload = (index: number) => {
    const file = files[index]?.file;
    if (!file) return;
    void uploadOne(index, file);
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

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (showEmojiPicker) {
      const handleClickOutside = (e: MouseEvent) => {
        if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
          setShowEmojiPicker(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  return (
    <>
      <MotionButton
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        variant="primary"
        size="sm"
        className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        <Upload className="w-4 h-4" />
        <span>Foto hinzufügen</span>
      </MotionButton>

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (open) return;
          setShowModal(false);
          setFiles([]);
          setDescription('');
          setShowEmojiPicker(false);
        }}
      >
        <DialogContent className="max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
          <Input
            ref={capturePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCaptureFileSelected}
          />
          <DialogClose asChild>
            <IconButton
              onClick={() => {
                setShowModal(false);
                setFiles([]);
                setDescription('');
                setShowEmojiPicker(false);
              }}
              icon={<X className="w-5 h-5" />}
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
              className="absolute top-4 right-4 p-1 rounded-full"
            />
          </DialogClose>

          <DialogTitle className="text-xl font-semibold mb-6">Foto hinzufügen</DialogTitle>

          {/* Description with Emoji Picker */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-foreground mb-2">Beschreibung (optional)</label>
            <div className="relative">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Füge eine Beschreibung hinzu... 😊"
                className="w-full px-3 py-2 pr-10 resize-none"
                rows={3}
              />
              <IconButton
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                icon={<Smile className="w-5 h-5 text-muted-foreground" />}
                variant="ghost"
                size="sm"
                aria-label="Emoji auswählen"
                title="Emoji auswählen"
                className="absolute bottom-2 right-2 p-1 rounded-full"
              />
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-10">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={350}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Dropzone */}
          <div {...getRootProps()} className="mb-4">
            <input {...getInputProps()} />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive
                  ? 'border-app-accent bg-background'
                  : 'border-border hover:border-app-accent hover:bg-background'
                }
              `}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground mb-2">
                {isDragActive ? 'Fotos hier ablegen' : 'Fotos hochladen'}
              </p>
              <p className="text-xs text-muted-foreground">Drag & Drop oder klicken</p>
            </motion.div>
          </div>

              <MotionButton
                onClick={capturePhoto}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                variant="ghost"
                size="sm"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium mb-4 hover:opacity-90 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Foto mit Kamera aufnehmen</span>
              </MotionButton>

              {/* File List */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2 max-h-48 overflow-y-auto mb-4"
                  >
                    {files.map((file, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-background rounded-lg p-3 flex items-center gap-3 border border-border"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-app-border flex-shrink-0">
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
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
                              <p className="text-xs text-destructive">{file.error}</p>
                              <Button
                                type="button"
                                onClick={() => retryUpload(index)}
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-xs font-semibold underline"
                              >
                                Erneut versuchen
                              </Button>
                            </div>
                          )}
                        </div>

                        {!file.uploading && !file.success && (
                          <IconButton
                            onClick={() => removeFile(index)}
                            icon={<X className="w-4 h-4" />}
                            variant="danger"
                            size="sm"
                            aria-label="Entfernen"
                            title="Entfernen"
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Button */}
              {files.length > 0 && (
                <MotionButton
                  onClick={uploadPhotos}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={files.some(f => f.uploading)}
                  variant="primary"
                  size="sm"
                  className="w-full px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hochladen
                </MotionButton>
              )}
        </DialogContent>
      </Dialog>
    </>
  );
}
