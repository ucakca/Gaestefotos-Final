'use client';

import { useEffect, useCallback } from 'react';
import { wsManager } from '@/lib/websocket';

interface UseRealtimePhotosOptions {
  eventId: string;
  onPhotoUploaded?: (photo: any) => void;
  onPhotoApproved?: (photo: any) => void;
  onPhotoRejected?: (photo: any) => void;
  onRefreshNeeded?: () => void;
}

/**
 * Hook for realtime photo updates via Socket.io.
 * Connects to the event room and listens for photo events.
 */
export function useRealtimePhotos({
  eventId,
  onPhotoUploaded,
  onPhotoApproved,
  onPhotoRejected,
  onRefreshNeeded,
}: UseRealtimePhotosOptions) {
  const handlePhotoUploaded = useCallback(
    (data: any) => {
      if (onPhotoUploaded && data?.photo) {
        onPhotoUploaded(data.photo);
      }
      onRefreshNeeded?.();
    },
    [onPhotoUploaded, onRefreshNeeded]
  );

  const handlePhotoApproved = useCallback(
    (data: any) => {
      if (onPhotoApproved && data?.photo) {
        onPhotoApproved(data.photo);
      }
      onRefreshNeeded?.();
    },
    [onPhotoApproved, onRefreshNeeded]
  );

  const handlePhotoRejected = useCallback(
    (data: any) => {
      if (onPhotoRejected && data?.photo) {
        onPhotoRejected(data.photo);
      }
      onRefreshNeeded?.();
    },
    [onPhotoRejected, onRefreshNeeded]
  );

  useEffect(() => {
    if (!eventId) return;

    // Connect and join event room
    wsManager.connect();
    wsManager.joinEvent(eventId);

    // Register event listeners
    const unsubUploaded = wsManager.on('photo_uploaded', handlePhotoUploaded);
    const unsubApproved = wsManager.on('photo_approved', handlePhotoApproved);
    const unsubRejected = wsManager.on('photo_rejected', handlePhotoRejected);

    return () => {
      // Cleanup listeners
      unsubUploaded();
      unsubApproved();
      unsubRejected();
      wsManager.leaveEvent(eventId);
    };
  }, [eventId, handlePhotoUploaded, handlePhotoApproved, handlePhotoRejected]);
}
