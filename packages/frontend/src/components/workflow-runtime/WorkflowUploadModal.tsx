'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { useWorkflow } from '@/hooks/useWorkflow';
import api from '@/lib/api';
import { useUploadStore } from '@/store/uploadStore';

const WorkflowRunner = dynamic(
  () => import('@/components/workflow-runtime/WorkflowRunner'),
  { ssr: false }
);

interface WorkflowUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  categories?: Array<{ id: string; name: string }>;
  challengeId?: string | null;
  challengeTitle?: string | null;
  onUploadSuccess?: () => void;
  /** Override flowType (default: UPLOAD) */
  flowType?: string;
}

export default function WorkflowUploadModal({
  isOpen,
  onClose,
  eventId,
  categories = [],
  challengeId,
  challengeTitle,
  onUploadSuccess,
  flowType = 'UPLOAD',
}: WorkflowUploadModalProps) {
  const { definition, loading: wfLoading, error: wfError } = useWorkflow(isOpen ? flowType : null);
  const { addUpload, updateProgress, setStatus } = useUploadStore();
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setUploadState('idle');
    setUploadError(null);
    onClose();
  }, [onClose]);

  const handleWorkflowComplete = useCallback(async (collectedData: Record<string, any>) => {
    try {
      setUploadState('uploading');

      // Extract data from workflow steps
      const uploaderName = collectedData.text || collectedData.u2_text || '';
      const photoDataUrl = collectedData.photo;
      const hasPhoto = collectedData.hasPhoto;

      if (!hasPhoto || !photoDataUrl) {
        setUploadState('error');
        setUploadError('Kein Foto ausgewählt');
        return;
      }

      // Convert data URL to blob
      const response = await fetch(photoDataUrl);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'photo.jpg');
      if (uploaderName.trim()) {
        formData.append('uploaderName', uploaderName.trim());
      }

      // Album selection — look for selection data from SelectionScreen step
      const albumSelection = collectedData.selection || collectedData.selectionLabel || '';
      if (albumSelection && categories.length > 0) {
        const matchedCat = categories.find(c => c.name === albumSelection || c.id === albumSelection);
        if (matchedCat) {
          formData.append('categoryId', matchedCat.id);
        }
      }

      if (challengeId) {
        formData.append('challengeId', challengeId);
      }

      // Track in global upload store
      const uploadId = Math.random().toString(36);
      addUpload(uploadId, 'photo.jpg');

      // Perform upload
      await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          updateProgress(uploadId, progress);
        },
      });

      setStatus(uploadId, 'success');
      setUploadState('success');

      // Save uploader name
      if (typeof window !== 'undefined' && uploaderName.trim()) {
        localStorage.setItem('guestUploaderName', uploaderName.trim());
      }

      // Auto-close after success
      setTimeout(() => {
        handleClose();
        onUploadSuccess?.();
      }, 1500);
    } catch (err: any) {
      setUploadState('error');
      setUploadError(err?.response?.data?.error || 'Upload fehlgeschlagen');
    }
  }, [eventId, categories, challengeId, addUpload, updateProgress, setStatus, handleClose, onUploadSuccess]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">
            {challengeTitle || 'Foto hochladen'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 60px)' }}>
          {wfLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {wfError && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-muted-foreground text-sm">{wfError}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {uploadState === 'uploading' && (
              <motion.div
                key="uploading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-foreground font-medium">Wird hochgeladen...</p>
              </motion.div>
            )}

            {uploadState === 'success' && (
              <motion.div
                key="success"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <CheckCircle className="w-16 h-16 text-success" />
                <p className="text-foreground font-bold text-lg">Hochgeladen!</p>
              </motion.div>
            )}

            {uploadState === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <AlertTriangle className="w-12 h-12 text-destructive" />
                <p className="text-destructive font-medium">{uploadError}</p>
                <button
                  onClick={() => setUploadState('idle')}
                  className="px-6 py-2 bg-muted rounded-xl text-foreground text-sm font-medium"
                >
                  Nochmal versuchen
                </button>
              </motion.div>
            )}

            {uploadState === 'idle' && definition && !wfLoading && (
              <motion.div
                key="workflow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WorkflowRunner
                  definition={definition}
                  eventId={eventId}
                  autoStart
                  onComplete={handleWorkflowComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
