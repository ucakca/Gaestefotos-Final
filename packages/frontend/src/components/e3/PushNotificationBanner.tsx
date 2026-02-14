'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationBannerProps {
  eventId: string;
  visitorId?: string;
}

export default function PushNotificationBanner({ eventId, visitorId }: PushNotificationBannerProps) {
  const { permission, isSubscribed, isLoading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if push is supported, not yet subscribed, not denied, and not dismissed
    if (permission === 'unsupported' || permission === 'denied') return;
    if (isSubscribed) return;

    // Check if user already dismissed this session
    const key = `push_dismissed_${eventId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return;

    // Show after 10 seconds delay (don't interrupt initial experience)
    const timer = setTimeout(() => setShow(true), 10000);
    return () => clearTimeout(timer);
  }, [permission, isSubscribed, eventId]);

  const handleSubscribe = async () => {
    const ok = await subscribe(eventId, visitorId);
    if (ok) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`push_dismissed_${eventId}`, '1');
    }
  };

  if (dismissed || isSubscribed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 z-[60] max-w-sm mx-auto"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Benachrichtigungen aktivieren?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Erhalte Updates wenn neue Fotos hochgeladen werden
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isLoading ? 'Aktiviere...' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                  >
                    Später
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-muted/50 transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
