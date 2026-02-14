'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, CheckCircle, X, Loader2 } from 'lucide-react';
import { useUploadStore } from '@/store/uploadStore';

export default function UploadProgressIndicator() {
  const { uploads, isUploading, totalProgress, clearCompleted } = useUploadStore();
  
  const successCount = uploads.filter((u) => u.status === 'success').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;
  const pendingCount = uploads.filter((u) => u.status === 'pending' || u.status === 'uploading').length;
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Show browser notification when all uploads complete
  useEffect(() => {
    if (!isUploading && successCount > 0 && pendingCount === 0) {
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Uploads abgeschlossen! 📸', {
          body: `${successCount} Foto${successCount !== 1 ? 's' : ''} erfolgreich hochgeladen`,
          icon: '/icons/icon-192x192.png',
        });
      }
      
      // Fire photoUploaded event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('photoUploaded'));
      }
      
      // Clear after delay
      const timer = setTimeout(() => {
        clearCompleted();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isUploading, successCount, pendingCount, clearCompleted]);
  
  if (uploads.length === 0) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-background/50">
            <div className="flex items-center gap-2">
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-app-accent animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              <span className="font-medium text-sm">
                {isUploading 
                  ? `${pendingCount} Upload${pendingCount !== 1 ? 's' : ''} läuft...`
                  : `${successCount} Foto${successCount !== 1 ? 's' : ''} hochgeladen`
                }
              </span>
            </div>
            {!isUploading && (
              <button
                onClick={clearCompleted}
                className="p-1 hover:bg-border rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          {isUploading && (
            <div className="px-3 pb-3">
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-app-accent to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${totalProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {totalProgress}% abgeschlossen
              </p>
            </div>
          )}
          
          {/* Error Summary */}
          {errorCount > 0 && (
            <div className="px-3 pb-3">
              <p className="text-xs text-red-500">
                {errorCount} Upload{errorCount !== 1 ? 's' : ''} fehlgeschlagen
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
