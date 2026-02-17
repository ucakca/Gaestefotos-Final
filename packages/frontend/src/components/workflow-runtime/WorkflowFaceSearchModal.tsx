'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';
import { useWorkflow } from '@/hooks/useWorkflow';
import FaceSearch from '@/components/FaceSearch';

const WorkflowRunner = dynamic(
  () => import('@/components/workflow-runtime/WorkflowRunner'),
  { ssr: false }
);

interface WorkflowFaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
}

export default function WorkflowFaceSearchModal({
  isOpen,
  onClose,
  eventId,
}: WorkflowFaceSearchModalProps) {
  const { definition, loading: wfLoading, error: wfError } = useWorkflow(isOpen ? 'FACE_SEARCH' : null);

  const handleComplete = useCallback((_collectedData: Record<string, any>) => {
    onClose();
  }, [onClose]);

  // Fallback: If no workflow definition found, use standalone FaceSearch component
  if (wfError || (!wfLoading && !definition && isOpen)) {
    return (
      <FaceSearch
        eventId={eventId}
        open={isOpen}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border border-border rounded-2xl max-w-md w-full p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Finde meine Fotos</h2>
          <button
            onClick={onClose}
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

          <AnimatePresence mode="wait">
            {definition && !wfLoading && (
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
                  onComplete={handleComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
