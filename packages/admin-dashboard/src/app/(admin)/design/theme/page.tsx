'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Save,
  RotateCcw,
  Eye,
  Check,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface ThemeTokens {
  '--app-accent': string;
  '--app-accent-hover': string;
  '--primary': string;
  '--primary-foreground': string;
}

const DEFAULT_TOKENS: ThemeTokens = {
  '--app-accent': '#E91E63',
  '--app-accent-hover': '#C2185B',
  '--primary': '330 81% 60%',
  '--primary-foreground': '0 0% 100%',
};

const PRESET_COLORS = [
  { name: 'Pink', color: '#E91E63' },
  { name: 'Lila', color: '#9C27B0' },
  { name: 'Blau', color: '#2196F3' },
  { name: 'Grün', color: '#4CAF50' },
  { name: 'Orange', color: '#FF9800' },
  { name: 'Rot', color: '#F44336' },
  { name: 'Türkis', color: '#00BCD4' },
  { name: 'Gold', color: '#FFD700' },
];

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function darkenHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

export default function ThemeSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#E91E63');
  const [originalColor, setOriginalColor] = useState('#E91E63');
  const [hasChanges, setHasChanges] = useState(false);

  const loadTheme = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ tokens: Record<string, string> }>('/admin/theme');
      const accent = res.data.tokens?.['--app-accent'] || DEFAULT_TOKENS['--app-accent'];
      setPrimaryColor(accent);
      setOriginalColor(accent);
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    setHasChanges(primaryColor !== originalColor);
  }, [primaryColor, originalColor]);

  const handleColorChange = (color: string) => {
    setPrimaryColor(color);
    // Live preview
    document.documentElement.style.setProperty('--app-accent', color);
    document.documentElement.style.setProperty('--app-accent-hover', darkenHex(color, 15));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tokens: ThemeTokens = {
        '--app-accent': primaryColor,
        '--app-accent-hover': darkenHex(primaryColor, 15),
        '--primary': hexToHsl(primaryColor),
        '--primary-foreground': '0 0% 100%',
      };

      await api.put('/admin/theme', { tokens });
      setOriginalColor(primaryColor);
      setHasChanges(false);
      toast.success('Theme gespeichert!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    handleColorChange(DEFAULT_TOKENS['--app-accent']);
  };

  const handleRevert = () => {
    handleColorChange(originalColor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Palette className="w-6 h-6 text-app-accent" />
            Theme Settings
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Passe die Grundfarben für Host- und Gäste-Seite an
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" variant="outline" onClick={handleRevert}>
              <RotateCcw className="w-4 h-4 mr-1" />
              Verwerfen
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Speichern
          </Button>
        </div>
      </div>

      {/* Main Color Picker */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <h2 className="text-lg font-semibold mb-4">Primärfarbe</h2>
        <p className="text-sm text-app-muted mb-6">
          Diese Farbe wird für Buttons, Links und Akzente verwendet.
        </p>

        {/* Color Input */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-16 h-16 rounded-xl border-2 border-app-border cursor-pointer"
            />
          </div>
          <div>
            <input
              type="text"
              value={primaryColor.toUpperCase()}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  handleColorChange(e.target.value);
                }
              }}
              className="w-28 px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg font-mono text-sm"
              placeholder="#E91E63"
            />
            <p className="text-xs text-app-muted mt-1">HEX Farbcode</p>
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="text-sm font-medium mb-3">Vorlagen</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset.color}
                onClick={() => handleColorChange(preset.color)}
                className={`relative w-10 h-10 rounded-lg border-2 transition-all ${
                  primaryColor.toLowerCase() === preset.color.toLowerCase()
                    ? 'border-app-fg scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              >
                {primaryColor.toLowerCase() === preset.color.toLowerCase() && (
                  <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Live Vorschau
        </h2>

        <div className="space-y-4 p-6 rounded-xl bg-app-bg border border-app-border">
          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              + Foto hochladen
            </button>
            <button
              className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              Weiter →
            </button>
            <button
              className="px-4 py-2 rounded-lg font-medium text-sm border-2 transition-colors"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Abbrechen
            </button>
          </div>

          {/* Links */}
          <div className="flex gap-4">
            <a href="#" style={{ color: primaryColor }} className="text-sm hover:underline">
              Link Beispiel
            </a>
            <a href="#" style={{ color: primaryColor }} className="text-sm hover:underline">
              Datenschutz
            </a>
          </div>

          {/* Badge */}
          <div className="flex gap-2">
            <span
              className="px-2 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Neu
            </span>
            <span
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
            >
              Beliebt
            </span>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <p className="text-sm text-app-muted">Upload Fortschritt</p>
            <div className="h-2 rounded-full bg-app-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ backgroundColor: primaryColor, width: '65%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Apply To */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <h2 className="text-lg font-semibold mb-4">Anwenden auf</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked disabled className="w-4 h-4 accent-app-accent" />
            <span className="text-sm">Gäste-Seite (Upload, Galerie)</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked disabled className="w-4 h-4 accent-app-accent" />
            <span className="text-sm">Host-Dashboard</span>
          </label>
          <label className="flex items-center gap-3 cursor-not-allowed opacity-50">
            <input type="checkbox" disabled className="w-4 h-4" />
            <span className="text-sm">Admin-Dashboard (separates Theme)</span>
          </label>
        </div>
        <p className="text-xs text-app-muted mt-4">
          Änderungen werden nach dem Speichern sofort auf allen Seiten sichtbar.
        </p>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset} className="text-sm">
          <RotateCcw className="w-4 h-4 mr-1" />
          Auf Standard zurücksetzen
        </Button>
      </div>
    </div>
  );
}
