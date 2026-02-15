'use client';

import React, { useState, useEffect } from 'react';
import { Code2, Copy, Check, ExternalLink, Monitor, Smartphone, Link2, FileCode } from 'lucide-react';

interface EmbedData {
  eventId: string;
  eventTitle: string;
  slug: string;
  urls: { gallery: string; embed: string };
  embedCodes: { iframe: string; script: string; linkButton: string };
}

interface EventOption {
  id: string;
  title: string;
  slug: string;
}

export default function EmbedCodePage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [embedData, setEmbedData] = useState<EmbedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'iframe' | 'script' | 'link'>('iframe');

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

  async function fetchEmbedCode(eventId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/embed`, { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setEmbedData(data);
    } catch (err) {
      console.error('Failed to load embed code', err);
      setEmbedData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleEventChange(eventId: string) {
    setSelectedEventId(eventId);
    if (eventId) fetchEmbedCode(eventId);
    else setEmbedData(null);
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const tabs = [
    { key: 'iframe' as const, label: 'iFrame', icon: Monitor },
    { key: 'script' as const, label: 'Script Tag', icon: FileCode },
    { key: 'link' as const, label: 'Link Button', icon: Link2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Code2 className="h-6 w-6 text-indigo-600" />
            Gallery Embed Code
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bette deine Event-Galerie auf externen Websites ein
          </p>
        </div>
      </div>

      {/* Event Selector */}
      <div className="bg-card rounded-xl border p-6 shadow-sm">
        <label className="block text-sm font-medium text-foreground/80 mb-2">Event auswählen</label>
        <select
          value={selectedEventId}
          onChange={(e) => handleEventChange(e.target.value)}
          className="w-full max-w-md rounded-lg border-border border px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">— Event wählen —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title} ({ev.slug})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="bg-card rounded-xl border p-12 text-center shadow-sm">
          <div className="animate-spin h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Lade Embed-Code...</p>
        </div>
      )}

      {embedData && !loading && (
        <>
          {/* URLs */}
          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">URLs</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-28">Galerie:</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded-lg text-sm text-foreground font-mono truncate">
                  {embedData.urls.gallery}
                </code>
                <button
                  onClick={() => copyToClipboard(embedData.urls.gallery, 'gallery-url')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {copied === 'gallery-url' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground/70" />}
                </button>
                <a href={embedData.urls.gallery} target="_blank" rel="noopener" className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <ExternalLink className="h-4 w-4 text-muted-foreground/70" />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground w-28">Embed URL:</span>
                <code className="flex-1 bg-muted/50 px-3 py-2 rounded-lg text-sm text-foreground font-mono truncate">
                  {embedData.urls.embed}
                </code>
                <button
                  onClick={() => copyToClipboard(embedData.urls.embed, 'embed-url')}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {copied === 'embed-url' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground/70" />}
                </button>
              </div>
            </div>
          </div>

          {/* Embed Code Tabs */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="border-b flex">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                      : 'border-transparent text-muted-foreground hover:text-foreground/80 hover:bg-muted/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'iframe' && 'Kopiere diesen Code, um die Galerie als iFrame einzubetten.'}
                  {activeTab === 'script' && 'Leichtgewichtiger Script-Tag mit automatischer Größenanpassung.'}
                  {activeTab === 'link' && 'Einfacher Button-Link zur Galerie.'}
                </p>
                <button
                  onClick={() => {
                    const code = activeTab === 'iframe' ? embedData.embedCodes.iframe
                      : activeTab === 'script' ? embedData.embedCodes.script
                      : embedData.embedCodes.linkButton;
                    copyToClipboard(code, `code-${activeTab}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  {copied === `code-${activeTab}` ? (
                    <><Check className="h-3.5 w-3.5" /> Kopiert!</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Code kopieren</>
                  )}
                </button>
              </div>
              <pre className="bg-foreground text-success/80 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
                {activeTab === 'iframe' && embedData.embedCodes.iframe}
                {activeTab === 'script' && embedData.embedCodes.script}
                {activeTab === 'link' && embedData.embedCodes.linkButton}
              </pre>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="border-b px-6 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Vorschau</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewMode === 'desktop' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    previewMode === 'mobile' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Mobile
                </button>
              </div>
            </div>
            <div className="p-6 bg-muted/50 flex justify-center">
              <div
                className={`bg-card border rounded-xl overflow-hidden shadow-sm transition-all ${
                  previewMode === 'desktop' ? 'w-full max-w-4xl' : 'w-[375px]'
                }`}
              >
                <iframe
                  src={embedData.urls.embed}
                  width="100%"
                  height={previewMode === 'desktop' ? 500 : 600}
                  style={{ border: 'none' }}
                  title="Galerie Vorschau"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedEventId && !loading && (
        <div className="bg-card rounded-xl border p-12 text-center shadow-sm">
          <Code2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Wähle ein Event aus, um den Embed-Code zu generieren</p>
        </div>
      )}
    </div>
  );
}
