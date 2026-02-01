'use client';

import { useEffect, useState } from 'react';
import { Palette, RefreshCw, Save, RotateCcw, Eye, Plus, Trash2 } from 'lucide-react';

interface ThemeToken {
  key: string;
  value: string;
}

const DEFAULT_TOKENS: ThemeToken[] = [
  { key: '--app-accent', value: '#E91E63' },
  { key: '--app-accent-hover', value: '#C2185B' },
  { key: '--app-bg', value: '#FAFAFA' },
  { key: '--app-card', value: '#FFFFFF' },
  { key: '--app-fg', value: '#1A1A1A' },
  { key: '--app-muted', value: '#6B7280' },
  { key: '--app-border', value: '#E5E7EB' },
];

const COMMON_COLORS = [
  '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', 
  '#00BCD4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#795548', '#607D8B',
];

export default function ThemeSettingsPage() {
  const [tokens, setTokens] = useState<ThemeToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/theme', { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      
      const loadedTokens: ThemeToken[] = [];
      for (const [key, value] of Object.entries(data.tokens || {})) {
        if (typeof key === 'string' && typeof value === 'string') {
          loadedTokens.push({ key, value });
        }
      }
      
      setTokens(loadedTokens.length > 0 ? loadedTokens : DEFAULT_TOKENS);
    } catch (err: any) {
      setError(err?.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function saveTheme() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const tokenObj: Record<string, string> = {};
      for (const t of tokens) {
        if (t.key.trim() && t.value.trim()) {
          tokenObj[t.key.trim()] = t.value.trim();
        }
      }

      const res = await fetch('/api/admin/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tokens: tokenObj }),
      });

      if (!res.ok) throw new Error('Fehler beim Speichern');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  function updateToken(index: number, field: 'key' | 'value', newValue: string) {
    setTokens(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: newValue };
      return copy;
    });
  }

  function addToken() {
    setTokens(prev => [...prev, { key: '--custom-', value: '#000000' }]);
  }

  function removeToken(index: number) {
    setTokens(prev => prev.filter((_, i) => i !== index));
  }

  function resetToDefaults() {
    setTokens(DEFAULT_TOKENS);
  }

  function applyPreview() {
    const root = document.documentElement;
    for (const t of tokens) {
      if (t.key.trim() && t.value.trim()) {
        root.style.setProperty(t.key.trim(), t.value.trim());
      }
    }
    setPreviewMode(true);
  }

  function removePreview() {
    const root = document.documentElement;
    for (const t of tokens) {
      root.style.removeProperty(t.key.trim());
    }
    setPreviewMode(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Palette className="w-6 h-6 text-pink-600" />
            Theme Settings
          </h1>
          <p className="text-gray-500 mt-1">
            CSS-Variablen für App-Farben anpassen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTheme}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Neu laden"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
          Theme erfolgreich gespeichert!
        </div>
      )}

      {/* Color Preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Vorschau</h2>
        <div className="flex flex-wrap gap-3">
          {tokens.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg border-2 border-white shadow-md"
                style={{ backgroundColor: t.value }}
              />
              <span className="text-xs text-gray-500 font-mono">{t.key}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          {previewMode ? (
            <button
              onClick={removePreview}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1"
            >
              <Eye className="w-4 h-4" /> Vorschau beenden
            </button>
          ) : (
            <button
              onClick={applyPreview}
              className="px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-sm flex items-center gap-1"
            >
              <Eye className="w-4 h-4" /> Live-Vorschau
            </button>
          )}
        </div>
      </div>

      {/* Token Editor */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold">CSS-Variablen</h2>
          <div className="flex gap-2">
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            >
              <RotateCcw className="w-4 h-4" /> Zurücksetzen
            </button>
            <button
              onClick={addToken}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {tokens.map((token, index) => (
            <div key={index} className="p-4 flex items-center gap-4">
              {/* Color Picker */}
              <input
                type="color"
                value={token.value}
                onChange={(e) => updateToken(index, 'value', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
              />

              {/* Key Input */}
              <input
                type="text"
                value={token.key}
                onChange={(e) => updateToken(index, 'key', e.target.value)}
                placeholder="--variable-name"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              {/* Value Input */}
              <input
                type="text"
                value={token.value}
                onChange={(e) => updateToken(index, 'value', e.target.value)}
                placeholder="#000000"
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              {/* Quick Colors */}
              <div className="hidden lg:flex gap-1">
                {COMMON_COLORS.slice(0, 8).map(color => (
                  <button
                    key={color}
                    onClick={() => updateToken(index, 'value', color)}
                    className="w-5 h-5 rounded-full border border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Delete */}
              <button
                onClick={() => removeToken(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={saveTheme}
          disabled={saving}
          className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white rounded-xl font-medium flex items-center gap-2 transition-colors"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Hinweis:</strong> Änderungen werden nach dem Speichern für alle Benutzer wirksam. 
        Die Variablen werden automatisch auf der gesamten App angewendet (Host-Dashboard, Gäste-Seiten).
      </div>
    </div>
  );
}
