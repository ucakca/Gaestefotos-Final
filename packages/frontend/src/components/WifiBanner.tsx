'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wifi, X, Copy, Check } from 'lucide-react';
import api from '@/lib/api';

interface WifiBannerProps {
  eventId: string;
  onWifiAvailable?: (available: boolean) => void;
}

interface WifiInfo {
  name: string;
  password: string | null;
}

export function WifiBanner({ eventId, onWifiAvailable }: WifiBannerProps) {
  const [wifi, setWifi] = useState<WifiInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState<'name' | 'password' | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [autoExpandTimer, setAutoExpandTimer] = useState<NodeJS.Timeout | null>(null);

  const loadWifi = async (silentOnly = false) => {
    try {
      const { data } = await api.get(`/events/${eventId}/wifi`);
      if (data.wifi) {
        setWifi(data.wifi);
        onWifiAvailable?.(true);
      }
    } catch {
      // Silent fail - WiFi is optional
    }
  };

  useEffect(() => {
    const dismissedKey = `wifi-dismissed-${eventId}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      // Still load wifi to notify parent about availability
      loadWifi(true);
      return;
    }

    loadWifi(false);
  }, [eventId]);

  // Auto-expand after 2 seconds for better visibility
  useEffect(() => {
    if (wifi && !dismissed && !expanded) {
      const timer = setTimeout(() => {
        setExpanded(true);
      }, 2000);
      setAutoExpandTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [wifi, dismissed]);

  // Keep expanded view open for at least 8 seconds
  useEffect(() => {
    if (expanded && autoExpandTimer) {
      clearTimeout(autoExpandTimer);
      setAutoExpandTimer(null);
    }
  }, [expanded]);

  const handleDismiss = () => {
    sessionStorage.setItem(`wifi-dismissed-${eventId}`, 'true');
    setDismissed(true);
  };

  const handleCopy = async (text: string, type: 'name' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  if (!wifi || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm animate-in slide-in-from-top-4">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
        {/* Collapsed view */}
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-between p-3 text-white"
          >
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              <span className="font-medium">📶 WLAN verfügbar</span>
            </div>
            <span className="text-sm opacity-80">Tippen für Details</span>
          </button>
        ) : (
          /* Expanded view */
          <div className="p-4 text-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                <span className="font-semibold">WLAN für Gäste</span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-card/20 rounded-lg transition-colors"
                aria-label="Schließen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* WiFi Name */}
            <div className="mb-3">
              <p className="text-xs opacity-80 mb-1">Netzwerk-Name</p>
              <button
                onClick={() => handleCopy(wifi.name, 'name')}
                className="w-full flex items-center justify-between bg-card/20 hover:bg-card/30 rounded-lg px-3 py-2 transition-colors"
              >
                <span className="font-mono font-medium truncate">{wifi.name}</span>
                {copied === 'name' ? (
                  <Check className="w-4 h-4 text-success/70 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 opacity-70 flex-shrink-0" />
                )}
              </button>
            </div>

            {/* WiFi Password */}
            {wifi.password && (
              <div className="mb-3">
                <p className="text-xs opacity-80 mb-1">Passwort</p>
                <button
                  onClick={() => handleCopy(wifi.password!, 'password')}
                  className="w-full flex items-center justify-between bg-card/20 hover:bg-card/30 rounded-lg px-3 py-2 transition-colors"
                >
                  <span className="font-mono font-medium truncate">{wifi.password}</span>
                  {copied === 'password' ? (
                    <Check className="w-4 h-4 text-success/70 flex-shrink-0" />
                  ) : (
                    <Copy className="w-4 h-4 opacity-70 flex-shrink-0" />
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => setExpanded(false)}
              className="w-full text-center text-sm opacity-80 hover:opacity-100 mt-2"
            >
              Minimieren
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
