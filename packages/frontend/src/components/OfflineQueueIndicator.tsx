'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudOff, RefreshCw, Trash2, X, Upload } from 'lucide-react';
import { listQueuedUploads, deleteQueuedUpload, processUploadQueue, getQueueCount, QueuedUploadItem } from '@/lib/uploadQueue';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface OfflineQueueIndicatorProps {
  onUploadSuccess?: () => void;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OfflineQueueIndicator({ onUploadSuccess }: OfflineQueueIndicatorProps) {
  const [queueCount, setQueueCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [items, setItems] = useState<QueuedUploadItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const refreshQueue = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setQueueCount(count);
      if (showModal) {
        const list = await listQueuedUploads();
        setItems(list);
      }
    } catch {
      // ignore
    }
  }, [showModal]);

  useEffect(() => {
    refreshQueue();

    // Check online status
    const updateOnlineStatus = () => {
      setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    };
    updateOnlineStatus();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        updateOnlineStatus();
        refreshQueue();
      });
      window.addEventListener('offline', updateOnlineStatus);
      
      // Refresh queue periodically
      const interval = setInterval(refreshQueue, 10000);
      return () => {
        clearInterval(interval);
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, [refreshQueue]);

  useEffect(() => {
    if (showModal) {
      refreshQueue();
    }
  }, [showModal, refreshQueue]);

  const handleRetryAll = async () => {
    if (processing || !isOnline) return;
    
    setProcessing(true);
    try {
      const { processed } = await processUploadQueue({
        maxItems: 50,
        fetchFn: async (endpoint, body) => {
          await api.post(endpoint, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        },
      });
      
      if (processed > 0) {
        onUploadSuccess?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('photoUploaded'));
        }
      }
    } catch {
      // ignore
    } finally {
      setProcessing(false);
      await refreshQueue();
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteQueuedUpload(id);
      await refreshQueue();
    } catch {
      // ignore
    }
  };

  // Don't show if queue is empty
  if (queueCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Badge */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-status-warning px-4 py-2 text-background shadow-lg"
      >
        <CloudOff className="w-4 h-4" />
        <span className="text-sm font-medium">{queueCount} in Queue</span>
      </motion.button>

      {/* Queue Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CloudOff className="w-5 h-5" />
              Offline-Queue
            </DialogTitle>
            <DialogClose asChild>
              <IconButton
                icon={<X className="w-5 h-5" />}
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                title="Schließen"
              />
            </DialogClose>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-status-success' : 'bg-status-danger'}`} />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            
            {isOnline && queueCount > 0 && (
              <Button
                onClick={handleRetryAll}
                disabled={processing}
                variant="primary"
                size="sm"
                className="w-full"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Alle {queueCount} jetzt hochladen
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                Queue ist leer
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                      {item.status === 'UPLOADING' && ' • Wird hochgeladen...'}
                      {item.lastError && ` • Fehler: ${item.lastError}`}
                    </p>
                  </div>
                  <IconButton
                    onClick={() => handleDeleteItem(item.id)}
                    icon={<Trash2 className="w-4 h-4" />}
                    variant="ghost"
                    size="sm"
                    aria-label="Löschen"
                    title="Aus Queue entfernen"
                    className="text-destructive"
                  />
                </div>
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Uploads werden automatisch gesendet, sobald die Verbindung wiederhergestellt ist.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
