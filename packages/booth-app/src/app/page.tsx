'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Wifi, WifiOff, Monitor, Camera } from 'lucide-react';
import BoothSetup from '@/components/BoothSetup';
import BoothRunner from '@/components/BoothRunner';

interface BoothConfig {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  flowType: string;
  apiUrl: string;
}

export default function BoothHome() {
  const [config, setConfig] = useState<BoothConfig | null>(null);
  const [showSetup, setShowSetup] = useState(true);
  const [online, setOnline] = useState(true);

  // Load saved config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('booth-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setShowSetup(false);
      }
    } catch {
      // No saved config
    }
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleConfigSave = (newConfig: BoothConfig) => {
    setConfig(newConfig);
    localStorage.setItem('booth-config', JSON.stringify(newConfig));
    setShowSetup(false);
  };

  const handleReset = () => {
    localStorage.removeItem('booth-config');
    setConfig(null);
    setShowSetup(true);
  };

  return (
    <div className="min-h-screen bg-booth-bg flex flex-col">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-booth-card/50 border-b border-booth-border">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-booth-accent" />
          <span className="font-bold text-sm">gästefotos.com Booth</span>
        </div>
        <div className="flex items-center gap-4">
          {config && (
            <span className="text-xs text-booth-muted">{config.eventTitle}</span>
          )}
          {online ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <button
            onClick={() => setShowSetup(true)}
            className="p-1.5 rounded-lg hover:bg-booth-card transition-colors"
          >
            <Settings className="w-4 h-4 text-booth-muted" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {showSetup ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-8"
            >
              <BoothSetup
                currentConfig={config}
                onSave={handleConfigSave}
                onCancel={config ? () => setShowSetup(false) : undefined}
                onReset={handleReset}
              />
            </motion.div>
          ) : config ? (
            <motion.div
              key="runner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full"
            >
              <BoothRunner config={config} online={online} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}
