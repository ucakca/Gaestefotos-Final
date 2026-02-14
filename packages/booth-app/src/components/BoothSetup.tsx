'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Save, X, RotateCcw, Camera } from 'lucide-react';
import api from '@/lib/api';

interface BoothConfig {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  flowType: string;
  apiUrl: string;
}

interface BoothSetupProps {
  currentConfig: BoothConfig | null;
  onSave: (config: BoothConfig) => void;
  onCancel?: () => void;
  onReset: () => void;
}

const FLOW_TYPES = [
  { value: 'BOOTH', label: 'Photo Booth', icon: '📷' },
  { value: 'MIRROR_BOOTH', label: 'Mirror Booth', icon: '🪞' },
  { value: 'KI_BOOTH', label: 'KI Booth', icon: '🤖' },
  { value: 'MOSAIC', label: 'Mosaic / Print', icon: '🧩' },
  { value: 'CUSTOM', label: 'Custom Workflow', icon: '⚙️' },
];

export default function BoothSetup({ currentConfig, onSave, onCancel, onReset }: BoothSetupProps) {
  const [eventSlug, setEventSlug] = useState(currentConfig?.eventSlug || '');
  const [flowType, setFlowType] = useState(currentConfig?.flowType || 'BOOTH');
  const [apiUrl, setApiUrl] = useState(currentConfig?.apiUrl || 'https://api.xn--gstefotos-v2a.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!eventSlug.trim()) {
      setError('Event-Slug ist erforderlich');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify event exists
      const { data } = await api.get(`/events/by-slug/${eventSlug.trim()}`);
      if (!data?.event) {
        setError('Event nicht gefunden');
        return;
      }

      onSave({
        eventId: data.event.id,
        eventSlug: eventSlug.trim(),
        eventTitle: data.event.title || eventSlug.trim(),
        flowType,
        apiUrl,
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Verbindung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-booth-card border border-booth-border rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-booth-accent/20 flex items-center justify-center">
          <Monitor className="w-6 h-6 text-booth-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-booth-fg">Booth Setup</h2>
          <p className="text-sm text-booth-muted">Konfiguriere diesen Booth für ein Event</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* API URL */}
        <div>
          <label className="block text-sm font-medium text-booth-fg mb-2">Server URL</label>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-4 py-3 bg-booth-bg border border-booth-border rounded-xl text-booth-fg placeholder:text-booth-muted focus:outline-none focus:ring-2 focus:ring-booth-accent"
            placeholder="https://api.gästefotos.com"
          />
        </div>

        {/* Event Slug */}
        <div>
          <label className="block text-sm font-medium text-booth-fg mb-2">Event-Slug</label>
          <input
            type="text"
            value={eventSlug}
            onChange={(e) => setEventSlug(e.target.value)}
            className="w-full px-4 py-3 bg-booth-bg border border-booth-border rounded-xl text-booth-fg placeholder:text-booth-muted focus:outline-none focus:ring-2 focus:ring-booth-accent"
            placeholder="hochzeit-mueller-2026"
            autoFocus
          />
        </div>

        {/* Flow Type */}
        <div>
          <label className="block text-sm font-medium text-booth-fg mb-2">Booth-Typ</label>
          <div className="grid grid-cols-2 gap-2">
            {FLOW_TYPES.map((ft) => (
              <button
                key={ft.value}
                onClick={() => setFlowType(ft.value)}
                className={`py-3 px-4 rounded-xl text-left transition-all border-2 ${
                  flowType === ft.value
                    ? 'bg-booth-accent/20 border-booth-accent text-booth-fg'
                    : 'bg-booth-bg border-booth-border text-booth-muted hover:border-booth-accent/30'
                }`}
              >
                <span className="mr-2">{ft.icon}</span>
                <span className="text-sm font-medium">{ft.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-booth-accent text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">Verbinde...</span>
            ) : (
              <>
                <Save className="w-4 h-4" /> Speichern & Starten
              </>
            )}
          </motion.button>

          {onCancel && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="py-3 px-5 bg-booth-bg border border-booth-border rounded-xl text-booth-muted hover:text-booth-fg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {currentConfig && (
          <button
            onClick={onReset}
            className="w-full py-2 text-sm text-booth-muted hover:text-red-400 transition-colors flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Booth zurücksetzen
          </button>
        )}
      </div>
    </div>
  );
}
