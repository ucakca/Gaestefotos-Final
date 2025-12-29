'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

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

export default function InstagramUploadButton({ 
  eventId, 
  onUploadSuccess,
  disabled = false 
}: InstagramUploadButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);

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

  // Mobile camera capture
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
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001')
        .replace(/\/+$/, '')
        .replace(/\/api$/, '');
      const response = await fetch(
        `${apiBase}/api/events/${eventId}/photos/upload`,
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
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-center text-white z-40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="w-6 h-6" />
      </motion.button>

      {/* Upload Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Foto hochladen</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
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

              {/* Camera Button */}
              <motion.button
                onClick={capturePhoto}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium mb-4"
              >
                <Camera className="w-5 h-5" />
                <span>Foto mit Kamera aufnehmen</span>
              </motion.button>

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



