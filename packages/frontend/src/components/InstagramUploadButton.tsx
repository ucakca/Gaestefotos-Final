'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

interface InstagramUploadButtonProps {
  eventId: string;
  onUploadSuccess?: () => void;
  disabled?: boolean;
}

interface UploadFile {
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
  success?: boolean;
}

const MotionIconButton = motion(IconButton);
const MotionButton = motion(Button);

export default function InstagramUploadButton({ 
  eventId, 
  onUploadSuccess,
  disabled = false 
}: InstagramUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);

  const capturePhotoInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Upload files
    newFiles.forEach((uploadFile) => {
      uploadPhoto(uploadFile.file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: true,
    disabled,
  });

  const onCapturePhotoSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // allow selecting the same file again
      e.target.value = '';
      if (!file) return;
      onDrop([file]);
    },
    [onDrop]
  );

  // Mobile camera capture
  const capturePhoto = useCallback(() => {
    capturePhotoInputRef.current?.click();
  }, []);

  const uploadPhoto = async (file: File) => {
    const fileIndex = files.findIndex(f => f.file === file);
    
    setFiles(prev => prev.map((f, i) => 
      i === fileIndex ? { ...f, uploading: true, progress: 0 } : f
    ));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(() => {
        setFiles(prev => prev.map((f, i) => 
          i === fileIndex ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
        ));
      }, 200);

      const token = typeof window !== 'undefined'
        ? (sessionStorage.getItem('token') || localStorage.getItem('token'))
        : '';
      const response = await fetch(
        `/api/events/${eventId}/photos/upload`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        }
      );

      clearInterval(interval);

      if (!response.ok) {
        throw new Error('Upload fehlgeschlagen');
      }

      setFiles(prev => prev.map((f, i) => 
        i === fileIndex 
          ? { ...f, uploading: false, progress: 100, success: true }
          : f
      ));

      setTimeout(() => {
        setFiles(prev => prev.filter((_, i) => i !== fileIndex));
        onUploadSuccess?.();
      }, 2000);
    } catch (error: any) {
      setFiles(prev => prev.map((f, i) => 
        i === fileIndex 
          ? { ...f, uploading: false, error: error.message }
          : f
      ));
    }
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
      {/* Floating Action Button - Instagram Style */}
      <MotionButton
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        variant="primary"
        size="sm"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 disabled:opacity-50 disabled:cursor-not-allowed p-0"
      >
        <Camera className="w-6 h-6" />
      </MotionButton>

      {/* Upload Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-app-card border border-app-border rounded-lg max-w-md w-full p-6">
          <input
            ref={capturePhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onCapturePhotoSelected}
          />
          <DialogHeader>
            <div className="flex items-center justify-between mb-6">
              <DialogTitle className="text-xl font-semibold text-app-fg">Foto hochladen</DialogTitle>
              <DialogClose asChild>
                <MotionIconButton
                  onClick={() => setIsOpen(false)}
                  icon={<X className="w-5 h-5" />}
                  variant="ghost"
                  size="sm"
                  aria-label="Schließen"
                  title="Schließen"
                  className="p-1"
                />
              </DialogClose>
            </div>
          </DialogHeader>

          {/* Dropzone */}
          <div {...getRootProps()} className="mb-4">
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
                {isDragActive ? 'Fotos hier ablegen' : 'Fotos hochladen'}
              </p>
              <p className="text-xs text-app-muted">
                Drag & Drop oder klicken
              </p>
            </motion.div>
          </div>

          {/* Camera Button */}
          <MotionButton
            onClick={capturePhoto}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            variant="primary"
            size="sm"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium mb-4 h-auto"
          >
            <Camera className="w-5 h-5" />
            <span>Foto mit Kamera aufnehmen</span>
          </MotionButton>

          {/* Upload Progress */}
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
                      <p className="text-xs font-medium text-app-fg truncate">{file.file.name}</p>
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
                      {file.error && <p className="text-xs text-status-danger mt-1">{file.error}</p>}
                    </div>

                    <div className="flex items-center">
                      {file.success && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-app-accent flex items-center justify-center"
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
                          className="w-6 h-6 rounded-full"
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
