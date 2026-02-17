'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Copy, Check, Settings, Loader2, Hash } from 'lucide-react';
import api from '@/lib/api';

interface HashtagConfig {
  hashtagEnabled: boolean;
  hashtagText: string;
  hashtagLogoOverlay: boolean;
}

interface HashtagStats {
  totalImported: number;
  lastImportAt: string | null;
}

interface HashtagWidgetProps {
  eventId: string;
  onCopy: (text: string, msg: string) => void;
}

export default function HashtagWidget({ eventId, onCopy }: HashtagWidgetProps) {
  const [config, setConfig] = useState<HashtagConfig | null>(null);
  const [stats, setStats] = useState<HashtagStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editOverlay, setEditOverlay] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [configRes, statsRes] = await Promise.all([
        api.get(`/events/${eventId}/hashtag`),
        api.get(`/events/${eventId}/hashtag/stats`).catch(() => ({ data: null })),
      ]);
      const cfg = configRes.data?.config || configRes.data;
      setConfig(cfg);
      setStats(statsRes.data);
      setEditText(cfg?.hashtagText || '#gästefotos');
      setEditOverlay(cfg?.hashtagLogoOverlay !== false);
    } catch {
      // Fallback defaults
      setConfig({ hashtagEnabled: true, hashtagText: '#gästefotos', hashtagLogoOverlay: true });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const hashtag = editText.trim().startsWith('#') ? editText.trim() : `#${editText.trim()}`;
      await api.put(`/events/${eventId}/hashtag`, {
        hashtagText: hashtag,
        hashtagLogoOverlay: editOverlay,
      });
      setConfig(prev => prev ? { ...prev, hashtagText: hashtag, hashtagLogoOverlay: editOverlay } : prev);
      setEditText(hashtag);
      setEditing(false);
    } catch {
      // Error silently
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
      </div>
    );
  }

  const hashtag = config?.hashtagText || '#gästefotos';

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm text-teal-900 flex items-center gap-1.5">
              Hashtag-Import
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 font-bold">FREE</span>
            </div>
            <p className="text-[11px] text-teal-700">
              {stats?.totalImported ? `${stats.totalImported} Fotos importiert` : 'Fotos per Hashtag importieren'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="p-1.5 rounded-lg hover:bg-teal-100 transition-colors text-teal-600"
          title="Einstellungen"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-teal-800 mb-1 block">Eigener Hashtag</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400" />
                <input
                  type="text"
                  value={editText.replace(/^#/, '')}
                  onChange={(e) => setEditText(`#${e.target.value.replace(/^#/, '')}`)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-teal-200 bg-card text-sm font-mono text-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-300"
                  placeholder="meinEvent2026"
                />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-teal-800 cursor-pointer">
            <input
              type="checkbox"
              checked={editOverlay}
              onChange={(e) => setEditOverlay(e.target.checked)}
              className="rounded border-teal-300 text-teal-600 focus:ring-teal-300"
            />
            gästefotos.com Logo-Overlay auf importierte Fotos
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Speichern
            </button>
            <button
              onClick={() => { setEditing(false); setEditText(hashtag); }}
              className="px-3 py-2 rounded-lg bg-teal-100 text-teal-700 text-xs font-medium hover:bg-teal-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-card border border-teal-200 rounded-lg px-3 py-2 font-mono text-sm font-bold text-teal-800">
              {hashtag}
            </div>
            <button
              onClick={() => onCopy(hashtag, 'Hashtag kopiert!')}
              className="p-2 rounded-lg bg-teal-100 hover:bg-teal-200 transition-colors text-teal-700"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-teal-600 mt-2">
            Gäste posten Fotos mit diesem Hashtag → manueller Import in eure Galerie.
            {config?.hashtagLogoOverlay !== false && ' Inkl. gästefotos.com Logo-Overlay.'}
          </p>
        </>
      )}
    </div>
  );
}
