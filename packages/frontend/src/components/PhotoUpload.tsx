'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check } from 'lucide-react';
import api, { formatApiError } from '@/lib/api';
import { IconButton } from '@/components/ui/IconButton';

interface PhotoUploadProps {
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

export default function PhotoUpload({ eventId, onUploadSuccess }: PhotoUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);

  const uploadPhoto = useCallback(
    async (fileIndex: number, file: File) => {
      setFiles((prev) => prev.map((f, i) => (i === fileIndex ? { ...f, uploading: true, progress: 0, error: undefined } : f)));

      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/events/${eventId}/photos/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const total = typeof evt.total === 'number' ? evt.total : 0;
            const loaded = typeof evt.loaded === 'number' ? evt.loaded : 0;
            if (!total || total <= 0) return;
            const pct = Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
            setFiles((prev) => prev.map((f, i) => (i === fileIndex ? { ...f, progress: pct } : f)));
          },
        });

        setFiles((prev) => prev.map((f, i) => (i === fileIndex ? { ...f, uploading: false, progress: 100, success: true } : f)));

        setTimeout(() => {
          setFiles((prev) => prev.filter((_, i) => i !== fileIndex));
          onUploadSuccess?.();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('photoUploaded'));
          }
        }, 1500);
      } catch (error: any) {
        const msg = formatApiError(error);
        setFiles((prev) => prev.map((f, i) => (i === fileIndex ? { ...f, uploading: false, error: msg } : f)));
      }
    },
    [eventId, onUploadSuccess]
  );

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      progress: 0,
    }));

    setFiles(prev => {
      const startIndex = prev.length;
      const next = [...prev, ...newFiles];
      // Kick off uploads with stable indices
      newFiles.forEach((uploadFile, offset) => {
        void uploadPhoto(startIndex + offset, uploadFile.file);
      });
      return next;
    });
  }, [uploadPhoto]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: true,
  });

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
    <div className="space-y-4">
      {/* Dropzone */}
      <div {...getRootProps()}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-background' 
              : 'border-border hover:border-primary hover:bg-background'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-foreground mb-2">
            {isDragActive ? 'Fotos hier ablegen' : 'Fotos hochladen'}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & Drop oder klicken zum Auswählen
          </p>
        </motion.div>
      </div>

      {/* Upload Progress */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-2"
          >
            {files.map((file, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-card rounded-lg p-4 shadow-sm border border-border"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-background flex-shrink-0">
                    <img
                      src={file.preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>

                    {/* Progress Bar */}
                    {file.uploading && (
                      <div className="mt-2 w-full bg-border rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${file.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}

                    {file.error && (
                      <p className="text-xs text-destructive mt-1">{file.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {file.success && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-8 h-8 rounded-full bg-status-success flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 text-background" />
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
                        className="w-8 h-8 rounded-full bg-background text-destructive border border-status-danger hover:opacity-90"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

