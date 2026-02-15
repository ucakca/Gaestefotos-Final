'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsManager } from '@/lib/websocket';

interface RealtimeNotification {
  id: string;
  type: 'like' | 'comment' | 'share' | 'upload';
  user: {
    name: string;
    avatar: string;
  };
  content?: string;
  photo?: string;
}

/**
 * Hook that listens to WebSocket events and converts them into
 * SocialProofToast-compatible notifications + tracks new photo arrivals.
 */
export function useRealtimeNotifications(eventId: string, enabled = true) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [newPhotoCount, setNewPhotoCount] = useState(0);
  const counterRef = useRef(0);

  const clearNewPhotos = useCallback(() => {
    setNewPhotoCount(0);
  }, []);

  useEffect(() => {
    if (!enabled || !eventId) return;

    wsManager.connect();
    wsManager.joinEvent(eventId);

    // New photo uploaded
    const unsubPhoto = wsManager.on('photo_uploaded', (data: any) => {
      counterRef.current += 1;
      setNewPhotoCount(counterRef.current);

      const uploaderName = data.photo?.uploaderName
        || data.photo?.uploader?.firstName
        || data.uploaderName
        || 'Ein Gast';

      setNotifications(prev => [
        {
          id: `upload-${Date.now()}`,
          type: 'upload' as const,
          user: { name: uploaderName, avatar: '/placeholder.svg' },
          photo: data.photo?.thumbnailUrl || data.photo?.url,
        },
        ...prev,
      ].slice(0, 10));
    });

    // Photo liked
    const unsubLike = wsManager.on('photo_liked', (data: any) => {
      const userName = data.userName || data.visitorName || 'Jemand';
      setNotifications(prev => [
        {
          id: `like-${Date.now()}`,
          type: 'like' as const,
          user: { name: userName, avatar: '/placeholder.svg' },
          photo: data.thumbnailUrl || data.photoUrl,
        },
        ...prev,
      ].slice(0, 10));
    });

    // Comment added
    const unsubComment = wsManager.on('comment_added', (data: any) => {
      const authorName = data.authorName || 'Jemand';
      setNotifications(prev => [
        {
          id: `comment-${Date.now()}`,
          type: 'comment' as const,
          user: { name: authorName, avatar: '/placeholder.svg' },
          content: data.comment?.substring(0, 50),
        },
        ...prev,
      ].slice(0, 10));
    });

    // Guestbook entry
    const unsubGuestbook = wsManager.on('guestbook_entry_added', (data: any) => {
      const authorName = data.authorName || 'Ein Gast';
      setNotifications(prev => [
        {
          id: `guestbook-${Date.now()}`,
          type: 'comment' as const,
          user: { name: authorName, avatar: '/placeholder.svg' },
          content: data.message?.substring(0, 50),
        },
        ...prev,
      ].slice(0, 10));
    });

    return () => {
      unsubPhoto();
      unsubLike();
      unsubComment();
      unsubGuestbook();
      wsManager.leaveEvent(eventId);
    };
  }, [eventId, enabled]);

  return { notifications, newPhotoCount, clearNewPhotos };
}
