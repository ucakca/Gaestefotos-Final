'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Upload, Check, Camera, Video } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import api from '@/lib/api';

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
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

  const captureVideo = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
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

  const uploadMedia = async (uploadId: string, file: File) => {
    setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: true, progress: 0 } : f)));

    const formData = new FormData();
    formData.append('file', file);
    if (uploaderName.trim()) {
      formData.append('uploaderName', uploaderName.trim());
    }

    const isVideo = typeof file.type === 'string' && file.type.startsWith('video/');
    const endpoint = isVideo ? `/events/${eventId}/videos/upload` : `/events/${eventId}/photos/upload`;

    try {
      const interval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => (f.id === uploadId ? { ...f, progress: Math.min(f.progress + 10, 90) } : f))
        );
      }, 200);

      await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearInterval(interval);

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
      setFiles((prev) => prev.map((f) => (f.id === uploadId ? { ...f, uploading: false, error: error.message } : f)));
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
      {variant === 'fab' ? (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: disabled ? 1 : 0.96 }}
          onClick={() => {
            if (disabled) return;
            setShowModal(true);
          }}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          className={`w-14 h-14 rounded-full shadow-lg border flex items-center justify-center transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </motion.button>
      ) : variant === 'button' ? (
        <motion.button
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
          className={`w-full rounded-2xl px-4 py-3 flex items-center justify-center gap-2 font-semibold shadow-sm border transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-900 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-5 h-5" />
          <span className="truncate">{buttonLabel}</span>
        </motion.button>
      ) : (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (disabled) return;
            setShowModal(true);
          }}
          disabled={disabled}
          className={`aspect-square rounded-sm overflow-hidden group relative ${
            disabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}
          title={disabled ? disabledReason : undefined}
        >
          <div className="w-full h-full flex items-center justify-center">
            <Plus className={`w-8 h-8 ${disabled ? 'text-gray-500' : 'text-white'}`} strokeWidth={3} />
          </div>
          {!disabled && <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />}
        </motion.button>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => {
                setShowModal(false);
                setUploaderName('');
              }}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

              <h2 className="text-xl font-semibold mb-6">Foto/Video hochladen</h2>

              {/* Uploader Name - Auffällig als Pflichtfeld */}
              <div className="mb-4">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="block text-sm font-semibold text-gray-900">
                    Dein Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder="z.B. Max Mustermann"
                    required
                    className="w-full px-4 py-3 border-2 border-[#295B4D] rounded-lg text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#295B4D] focus:border-[#295B4D] font-medium"
                  />
                  <p className="text-xs text-gray-600">
                    Damit der Gastgeber weiß, wer die Fotos hochgeladen hat
                  </p>
                </motion.div>
              </div>

              <div {...getRootProps()} className="mb-4">
                <input {...getInputProps()} />
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
                    }
                  `}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {isDragActive ? 'Fotos hier ablegen' : 'Fotos hochladen'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Drag & Drop oder klicken
                  </p>
                </motion.div>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={capturePhoto}
                  disabled={disabled}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                    disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#295B4D] text-white hover:bg-[#1f4438]'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  Foto aufnehmen
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={captureVideo}
                  disabled={disabled}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-colors ${
                    disabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  Video aufnehmen
                </motion.button>
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
                        className="bg-gray-50 rounded-lg p-3 flex items-center gap-3"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                          <img
                            src={file.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {file.file.name}
                          </p>
                          {file.uploading && (
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                              <motion.div
                                className="bg-purple-500 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                          {file.error && (
                            <p className="text-xs text-red-600 mt-1">{file.error}</p>
                          )}
                        </div>

                        <div className="flex items-center">
                          {file.success && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                            >
                              <Check className="w-4 h-4 text-white" />
                            </motion.div>
                          )}
                          {!file.uploading && !file.success && (
                            <button
                              onClick={() => removeFile(index)}
                              className="w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

