'use client';

import React, { useState, useEffect } from 'react';
import { Presentation, Play, Pause, Settings, ExternalLink, Copy, Check, Monitor, Smartphone } from 'lucide-react';

interface EventOption {
  id: string;
  title: string;
  slug: string;
}

interface SlideshowConfig {
  interval: number;        // seconds between slides
  transition: 'fade' | 'slide' | 'zoom' | 'none';
  showCaptions: boolean;
  showEventTitle: boolean;
  autoPlay: boolean;
  shuffle: boolean;
  maxPhotos: number;
  theme: 'dark' | 'light' | 'minimal';
}

const DEFAULT_CONFIG: SlideshowConfig = {
  interval: 5,
  transition: 'fade',
  showCaptions: false,
  showEventTitle: true,
  autoPlay: true,
  shuffle: false,
  maxPhotos: 100,
  theme: 'dark',
};

export default function SlideshowPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [config, setConfig] = useState<SlideshowConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch('/api/events?limit=100&active=true', { credentials: 'include' });
      const data = await res.json();
      setEvents((data.events || data || []).map((e: any) => ({ id: e.id, title: e.title, slug: e.slug })));
    } catch (err) {
      console.error('Failed to load events', err);
    }
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('dash.', '') : 'https://gästefotos.com';

  function getSlideshowUrl() {
    if (!selectedEvent) return '';
    const params = new URLSearchParams();
    if (config.interval !== 5) params.set('interval', String(config.interval));
    if (config.transition !== 'fade') params.set('transition', config.transition);
    if (config.showCaptions) params.set('captions', '1');
    if (!config.showEventTitle) params.set('title', '0');
    if (!config.autoPlay) params.set('autoplay', '0');
    if (config.shuffle) params.set('shuffle', '1');
    if (config.maxPhotos !== 100) params.set('max', String(config.maxPhotos));
    if (config.theme !== 'dark') params.set('theme', config.theme);
    const qs = params.toString();
    return `${baseUrl}/slideshow/${selectedEvent.slug}${qs ? `?${qs}` : ''}`;
  }

  async function copyUrl() {
    const url = getSlideshowUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Presentation className="h-6 w-6 text-purple-600" />
          Slideshow Modus
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Vollbild-Diashow für Events — ideal für Beamer und große Bildschirme
        </p>
      </div>

      {/* Event Selector */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Event auswählen</label>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full max-w-md rounded-lg border-gray-300 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        >
          <option value="">— Event wählen —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({ev.slug})
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Config */}
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-400" />
              Einstellungen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Intervall (Sekunden)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.interval}
                  onChange={(e) => setConfig({ ...config, interval: parseInt(e.target.value) || 5 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              {/* Transition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Übergang</label>
                <select
                  value={config.transition}
                  onChange={(e) => setConfig({ ...config, transition: e.target.value as any })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                  <option value="none">Ohne</option>
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <select
                  value={config.theme}
                  onChange={(e) => setConfig({ ...config, theme: e.target.value as any })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="dark">Dunkel</option>
                  <option value="light">Hell</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Max Photos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Fotos</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={config.maxPhotos}
                  onChange={(e) => setConfig({ ...config, maxPhotos: parseInt(e.target.value) || 100 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoPlay}
                    onChange={(e) => setConfig({ ...config, autoPlay: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Auto-Play</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.shuffle}
                    onChange={(e) => setConfig({ ...config, shuffle: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Zufällige Reihenfolge</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showEventTitle}
                    onChange={(e) => setConfig({ ...config, showEventTitle: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Event-Titel anzeigen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showCaptions}
                    onChange={(e) => setConfig({ ...config, showCaptions: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Bildunterschriften</span>
                </label>
              </div>
            </div>
          </div>

          {/* Generated URL */}
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Slideshow URL</h2>
            <div className="flex items-center gap-3">
              <code className="flex-1 bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-mono text-gray-800 truncate">
                {getSlideshowUrl()}
              </code>
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                {copied ? <><Check className="h-4 w-4" /> Kopiert!</> : <><Copy className="h-4 w-4" /> Kopieren</>}
              </button>
              <a
                href={getSlideshowUrl()}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" /> Öffnen
              </a>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tipp: Drücke F11 im Browser für echten Vollbildmodus
            </p>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="border-b px-6 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Vorschau</h2>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewMode === 'desktop' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewMode === 'mobile' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            </div>
            <div className="p-6 bg-gray-900 flex justify-center">
              <div
                className={`bg-black rounded-lg overflow-hidden shadow-2xl transition-all ${
                  previewMode === 'desktop' ? 'w-full max-w-4xl aspect-video' : 'w-[375px] aspect-[9/16]'
                }`}
              >
                <iframe
                  src={getSlideshowUrl()}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="Slideshow Vorschau"
                  allow="fullscreen"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedEventId && (
        <div className="bg-white rounded-xl border p-12 text-center shadow-sm">
          <Presentation className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Wähle ein Event aus, um die Slideshow zu konfigurieren</p>
        </div>
      )}
    </div>
  );
}
