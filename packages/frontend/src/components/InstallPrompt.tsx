import logger from '@/lib/logger';
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptProps {
  variant?: 'guest' | 'host';
}

export default function InstallPrompt({ variant = 'guest' }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Only show prompt if not already installed
    if (standalone) return;

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return; // Don't show again for 7 days
    }

    // Listen for beforeinstallprompt event (Android/Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual instructions after delay
    if (iOS && !standalone) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      logger.error('Install prompt error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50"
      >
        <div className="bg-app-card border-2 border-app-accent rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-app-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-app-fg">
                    {variant === 'guest' ? 'Zur Startseite hinzufügen' : 'Als App installieren'}
                  </h3>
                  <p className="text-xs text-app-muted">
                    {variant === 'guest' 
                      ? 'Schneller Zugriff zur Foto-Galerie' 
                      : 'Event-Verwaltung immer griffbereit'
                    }
                  </p>
                </div>
              </div>
              <IconButton
                icon={<X className="w-4 h-4" />}
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
                aria-label="Schließen"
                title="Schließen"
              />
            </div>

            {isIOS ? (
              // iOS manual instructions
              <div className="space-y-2 mb-3">
                <p className="text-sm text-app-muted">
                  Tippe auf <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-app-accent/10 text-app-accent font-mono text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Teilen
                  </span> und dann auf
                </p>
                <p className="text-sm font-semibold text-app-fg">
                  "Zum Home-Bildschirm"
                </p>
              </div>
            ) : deferredPrompt ? (
              // Android/Desktop install button
              <Button
                onClick={handleInstallClick}
                variant="primary"
                size="sm"
                className="w-full mb-2"
              >
                <Download className="w-4 h-4" />
                Jetzt installieren
              </Button>
            ) : null}

            <button
              onClick={handleDismiss}
              className="text-xs text-app-muted hover:text-app-fg transition-colors w-full text-center"
            >
              Vielleicht später
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
