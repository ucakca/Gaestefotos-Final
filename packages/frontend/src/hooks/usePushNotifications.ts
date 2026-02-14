'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (eventId?: string, visitorId?: string) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial state
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PermissionState);

    // Check if already subscribed
    navigator.serviceWorker.ready.then(async (registration) => {
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    }).catch(() => {});
  }, []);

  const subscribe = useCallback(async (eventId?: string, visitorId?: string): Promise<boolean> => {
    if (permission === 'unsupported') return false;
    setIsLoading(true);

    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== 'granted') {
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key from backend
      const { data } = await api.get('/push/vapid-key');
      if (!data?.publicKey) {
        setIsLoading(false);
        return false;
      }

      // Subscribe via Push API
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as any,
      });

      // Send subscription to backend
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
        eventId: eventId || null,
        visitorId: visitorId || null,
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Push subscribe error:', err);
      setIsLoading(false);
      return false;
    }
  }, [permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify backend
        await api.delete('/push/subscribe', {
          data: { endpoint: subscription.endpoint },
        }).catch(() => {});

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setIsLoading(false);
      return false;
    }
  }, []);

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}
