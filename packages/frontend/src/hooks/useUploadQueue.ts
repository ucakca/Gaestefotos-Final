'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  enqueueUpload,
  listQueuedUploads,
  getQueueCount,
  processUploadQueue,
  deleteQueuedUpload,
  QueuedUploadItem,
} from '@/lib/uploadQueue';

interface UseUploadQueueReturn {
  queueCount: number;
  queueItems: QueuedUploadItem[];
  isProcessing: boolean;
  addToQueue: (endpoint: string, fields: Record<string, string>, file: File) => Promise<void>;
  processQueue: () => Promise<{ processed: number; failed: number }>;
  removeFromQueue: (id: string) => Promise<void>;
  refreshQueue: () => Promise<void>;
}

export function useUploadQueue(): UseUploadQueueReturn {
  const [queueCount, setQueueCount] = useState(0);
  const [queueItems, setQueueItems] = useState<QueuedUploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      const items = await listQueuedUploads();
      setQueueItems(items);
      setQueueCount(items.filter(i => i.status === 'PENDING').length);
    } catch {
      setQueueItems([]);
      setQueueCount(0);
    }
  }, []);

  // Initial load + listen for SW messages
  useEffect(() => {
    refreshQueue();

    // Listen for background sync completion from SW
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'UPLOAD_QUEUE_PROCESSED') {
        refreshQueue();
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handler);
    }

    return () => {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handler);
      }
    };
  }, [refreshQueue]);

  // Re-check queue when coming back online
  useEffect(() => {
    const onOnline = () => {
      // Try to process immediately + register background sync
      processQueue();
      registerBackgroundSync();
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const registerBackgroundSync = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('upload-queue');
      }
    } catch {
      // Background Sync not supported — fallback to manual processing
    }
  }, []);

  const addToQueue = useCallback(async (
    endpoint: string,
    fields: Record<string, string>,
    file: File
  ) => {
    await enqueueUpload({ endpoint, fields, file });
    await refreshQueue();

    // Try to process immediately if online
    if (navigator.onLine) {
      processQueue();
    } else {
      // Register background sync for when connectivity returns
      registerBackgroundSync();
    }
  }, [refreshQueue, registerBackgroundSync]);

  const processQueue = useCallback(async () => {
    if (isProcessing) return { processed: 0, failed: 0 };
    setIsProcessing(true);

    try {
      const result = await processUploadQueue({
        fetchFn: async (endpoint: string, body: FormData) => {
          const resp = await fetch(endpoint, {
            method: 'POST',
            body,
            credentials: 'include',
          });
          if (!resp.ok) {
            throw new Error(`Upload failed: HTTP ${resp.status}`);
          }
        },
        maxItems: 5,
      });

      await refreshQueue();
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, refreshQueue]);

  const removeFromQueue = useCallback(async (id: string) => {
    await deleteQueuedUpload(id);
    await refreshQueue();
  }, [refreshQueue]);

  return {
    queueCount,
    queueItems,
    isProcessing,
    addToQueue,
    processQueue,
    removeFromQueue,
    refreshQueue,
  };
}
