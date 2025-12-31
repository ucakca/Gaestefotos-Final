'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Smile } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import api, { formatApiError, isRetryableUploadError } from '@/lib/api';

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

  const capturePhoto = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if ('capture' in input) {
      (input as any).capture = 'environment';
    }
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        onDrop([file]);
      }
    };
    input.click();
  }, [onDrop]);

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
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-lg font-medium flex items-center gap-2 hover:opacity-90 transition-colors"
      >
        <Upload className="w-4 h-4" />
        <span>Foto hinzufügen</span>
      </motion.button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-app-fg/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-app-card border border-app-border rounded-lg max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => {
                  setShowModal(false);
                  setFiles([]);
                  setDescription('');
                }}
                className="absolute top-4 right-4 p-1 hover:bg-app-bg rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-semibold mb-6">Foto hinzufügen</h2>

              {/* Description with Emoji Picker */}
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-app-fg mb-2">
                  Beschreibung (optional)
                </label>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Füge eine Beschreibung hinzu... 😊"
                    className="w-full px-3 py-2 pr-10 border border-app-border rounded-lg text-app-fg bg-app-card focus:outline-none focus:ring-2 focus:ring-app-fg/30 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute bottom-2 right-2 p-1 hover:bg-app-bg rounded-full"
                  >
                    <Smile className="w-5 h-5 text-app-muted" />
                  </button>
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
                      ? 'border-tokens-brandGreen bg-app-bg' 
                      : 'border-app-border hover:border-tokens-brandGreen hover:bg-app-bg'
                    }
                  `}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-app-muted" />
                  <p className="text-sm font-medium text-app-fg mb-2">
                    {isDragActive ? 'Fotos hier ablegen' : 'Fotos hochladen'}
                  </p>
                  <p className="text-xs text-app-muted">
                    Drag & Drop oder klicken
                  </p>
                </motion.div>
              </div>

              <motion.button
                onClick={capturePhoto}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-app-bg text-app-fg rounded-lg font-medium mb-4 hover:opacity-90 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Foto mit Kamera aufnehmen</span>
              </motion.button>

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
                        className="bg-app-bg rounded-lg p-3 flex items-center gap-3 border border-app-border"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-app-border flex-shrink-0">
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
                              <button
                                type="button"
                                onClick={() => retryUpload(index)}
                                className="mt-1 text-xs font-semibold text-tokens-brandGreen underline"
                              >
                                Erneut versuchen
                              </button>
                            </div>
                          )}
                        </div>

                        {!file.uploading && !file.success && (
                          <button
                            onClick={() => removeFile(index)}
                            className="w-6 h-6 rounded-full bg-app-bg text-[var(--status-danger)] border border-[var(--status-danger)] hover:opacity-90 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Button */}
              {files.length > 0 && (
                <motion.button
                  onClick={uploadPhotos}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={files.some(f => f.uploading)}
                  className="w-full px-4 py-3 bg-tokens-brandGreen text-app-bg rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {files.some(f => f.uploading) ? 'Wird hochgeladen...' : `${files.length} Foto(s) hochladen`}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

