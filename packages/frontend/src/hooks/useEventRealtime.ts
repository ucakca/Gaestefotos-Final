import { useEffect, useState } from 'react';
import { wsManager } from '@/lib/websocket';
import { Photo } from '@gaestefotos/shared';

export function useEventRealtime(
  eventId: string,
  initialPhotos: Photo[] = [],
  opts?: {
    enabled?: boolean;
  }
) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  useEffect(() => {
    const enabled = opts?.enabled !== false;
    if (!enabled) return;
    if (!eventId) return;

    // Connect WebSocket
    wsManager.connect();

    // Join event room
    wsManager.joinEvent(eventId);

    // Listen for new photos
    const unsubscribePhotoUploaded = wsManager.on('photo_uploaded', (data: { photo: Photo }) => {
      setPhotos(prev => [data.photo, ...prev]);
    });

    // Listen for photo approval
    const unsubscribePhotoApproved = wsManager.on('photo_approved', (data: { photo: Photo }) => {
      setPhotos(prev => prev.map(p => 
        p.id === data.photo.id ? data.photo : p
      ));
    });

    // Listen for guestbook entries with photos (for wall feed)
    const unsubscribeGuestbook = wsManager.on('guestbook_entry_added', (data: any) => {
      if (data.photoUrl) {
        const guestbookPhoto = {
          id: `guestbook-${data.id}`,
          storagePath: data.photoUrl,
          description: data.message,
          uploadedBy: data.authorName,
          createdAt: data.createdAt,
          status: 'APPROVED',
        } as any;
        setPhotos(prev => [guestbookPhoto, ...prev]);
      }
    });

    // Cleanup
    return () => {
      unsubscribePhotoUploaded();
      unsubscribePhotoApproved();
      unsubscribeGuestbook();
      wsManager.leaveEvent(eventId);
    };
  }, [eventId, opts?.enabled]);

  // Update photos when initialPhotos change
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  return photos;
}

