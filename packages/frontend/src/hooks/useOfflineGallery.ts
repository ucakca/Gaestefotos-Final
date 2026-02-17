'use client';

import { useCallback } from 'react';

/**
 * Hook for pre-caching gallery photos for offline viewing.
 * Sends photo URLs to the service worker for background caching.
 */
export function useOfflineGallery() {
  const precachePhotos = useCallback((photoUrls: string[]) => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_PHOTOS',
      urls: photoUrls,
    });
  }, []);

  const clearPhotoCache = useCallback(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!navigator.serviceWorker.controller) return;

    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_PHOTO_CACHE',
    });
  }, []);

  return { precachePhotos, clearPhotoCache };
}
