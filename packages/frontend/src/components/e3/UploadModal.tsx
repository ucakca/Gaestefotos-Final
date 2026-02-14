'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';
import { useUploadStore } from '@/store/uploadStore';

/**
 * UploadModal - v0-Style Upload Modal
 * 
 * Clean drag & drop upload modal with multi-file support.
 * Cleaner than existing UploadButton (31KB) + UploadModal (6KB)
 * 
 * Features:
 * - Drag & Drop zone
 * - Multi-file upload
 * - Image preview
 * - Progress tracking per file
 * - Category/Album selection
 * - Validation (file type, size)
 */

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  categories?: Array<{ id: string; name: string }>;
  challengeId?: string | null;
  challengeTitle?: string | null;
  onUploadSuccess?: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

export default function UploadModal({
  isOpen,
  onClose,
  eventId,
  categories = [],
  challengeId,
  challengeTitle,
  onUploadSuccess,
}: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploaderName, setUploaderName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('guestUploaderName') || '';
    }
    return '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Global upload store for background uploads
  const { addUpload, updateProgress, setStatus } = useUploadStore();

  // Handle file selection
  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: UploadFile[] = [];

    fileArray.forEach((file) => {
      // Validate file type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      validFiles.push({
        file,
        id: Math.random().toString(36),
        preview,
        status: 'pending',
        progress: 0,
      });
    });

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // File input click
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      // Revoke preview URL to free memory
      const removed = prev.find((f) => f.id === fileId);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  }, []);

  // Close modal
  const handleClose = useCallback(() => {
    // Revoke all preview URLs
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setSelectedCategory('');
    onClose();
  }, [files, onClose]);

  // Upload files - now uses global store for background uploads
  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;
    if (!uploaderName.trim()) return;

    // Save uploader name to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('guestUploaderName', uploaderName.trim());
    }

    // Add all files to global upload store
    const pendingFiles = files.filter(f => f.status === 'pending');
    pendingFiles.forEach(f => addUpload(f.id, f.file.name));
    
    // Close modal immediately - uploads continue in background
    const filesToUpload = [...pendingFiles];
    const categoryToUse = selectedCategory;
    const nameToUse = uploaderName.trim();
    handleClose();

    // Upload each file sequentially (less server load)
    for (const uploadFile of filesToUpload) {
      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', uploadFile.file);
        formData.append('uploaderName', nameToUse);
        if (categoryToUse) {
          formData.append('categoryId', categoryToUse);
        }
        if (challengeId) {
          formData.append('challengeId', challengeId);
        }

        // Upload with progress tracking to global store
        await api.post(`/events/${eventId}/photos/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            updateProgress(uploadFile.id, progress);
          },
        });

        // Mark as success in global store
        setStatus(uploadFile.id, 'success');
      } catch (error: any) {
        // Mark as error in global store
        setStatus(uploadFile.id, 'error', error?.response?.data?.error || 'Upload fehlgeschlagen');
      }
    }

    onUploadSuccess?.();
  }, [files, uploaderName, selectedCategory, eventId, challengeId, onUploadSuccess, addUpload, updateProgress, setStatus, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-2xl font-bold mb-4">
          {challengeTitle ? `Challenge: ${challengeTitle}` : 'Fotos hochladen'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {challengeTitle ? `Lade ein Foto für die Challenge "${challengeTitle}" hoch` : 'Lade Fotos für das Event hoch'}
        </DialogDescription>

        <div className="space-y-6">
          {/* Challenge Banner */}
          {challengeTitle && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-lg">🏆</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Nimm an der Challenge teil!</p>
                <p className="text-sm text-gray-600">Dein Foto wird mit einem Challenge-Badge markiert.</p>
              </div>
            </div>
          )}

          {/* Uploader Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Dein Name *</label>
            <Input
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              placeholder="Max Mustermann"
              disabled={isUploading}
            />
          </div>

          {/* Category Selection - hidden for challenge uploads */}
          {categories.length > 0 && !challengeId && (
            <div>
              <label className="block text-sm font-medium mb-2">Album (optional)</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isUploading}
              >
                <option value="">Kein Album</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isUploading}
            />

            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: isDragging ? 1.05 : 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>

              <div>
                <p className="text-lg font-medium mb-1">
                  {isDragging ? 'Loslassen zum Hochladen' : 'Ziehe Fotos hierher'}
                </p>
                <p className="text-sm text-muted-foreground">
                  oder{' '}
                  <button
                    onClick={handleBrowseClick}
                    className="text-primary hover:underline"
                    disabled={isUploading}
                  >
                    durchsuche deine Dateien
                  </button>
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, HEIC · Max 50MB pro Datei
              </p>
            </motion.div>
          </div>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">
                {files.length} Datei{files.length !== 1 ? 'en' : ''} ausgewählt
              </h3>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <AnimatePresence>
                  {files.map((uploadFile) => (
                    <motion.div
                      key={uploadFile.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-square rounded-lg overflow-hidden bg-card border border-border"
                    >
                      {/* Preview Image */}
                      <img
                        src={uploadFile.preview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />

                      {/* Status Overlay */}
                      {uploadFile.status !== 'pending' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          {uploadFile.status === 'uploading' && (
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                              <p className="text-white text-sm font-medium">
                                {uploadFile.progress}%
                              </p>
                            </div>
                          )}
                          {uploadFile.status === 'success' && (
                            <CheckCircle className="w-12 h-12 text-green-500" />
                          )}
                          {uploadFile.status === 'error' && (
                            <div className="text-center px-2">
                              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                              <p className="text-white text-xs">{uploadFile.error}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Remove Button */}
                      {uploadFile.status === 'pending' && !isUploading && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isUploading}
            >
              Abbrechen
            </Button>

            <Button
              onClick={uploadFiles}
              disabled={
                files.length === 0 ||
                !uploaderName.trim() ||
                isUploading ||
                files.every((f) => f.status !== 'pending')
              }
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird hochgeladen...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  {files.length} Foto{files.length !== 1 ? 's' : ''} hochladen
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
