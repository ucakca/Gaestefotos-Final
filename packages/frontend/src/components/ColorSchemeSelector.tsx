'use client';

import { useState } from 'react';
import { Sparkles, Check, RefreshCw, Palette } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  name: string;
}

interface ColorSchemeSelectorProps {
  eventType?: string;
  onSelect: (scheme: ColorScheme) => void;
  currentPrimary?: string;
}

export function ColorSchemeSelector({ 
  eventType = 'wedding', 
  onSelect,
  currentPrimary 
}: ColorSchemeSelectorProps) {
  const [schemes, setSchemes] = useState<ColorScheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mood, setMood] = useState('');

  const generateSchemes = async () => {
    setLoading(true);
    setSelectedIndex(null);
    try {
      const { data } = await api.post('/ai/suggest-colors', {
        eventType,
        mood: mood.trim() || undefined,
      });
      setSchemes(data.schemes || []);
    } catch (error) {
      console.error('Error generating color schemes:', error);
      // Use fallback schemes
      setSchemes([
        { primary: '#E91E63', secondary: '#FCE4EC', accent: '#FFD700', background: '#FFF8F0', name: 'Romantisches Rosa' },
        { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FF9800', background: '#FAFAFA', name: 'Elegantes Blau' },
        { primary: '#4CAF50', secondary: '#E8F5E9', accent: '#FFC107', background: '#FFFDE7', name: 'Natürliches Grün' },
        { primary: '#9C27B0', secondary: '#F3E5F5', accent: '#00BCD4', background: '#FAFAFA', name: 'Kreatives Lila' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (scheme: ColorScheme, index: number) => {
    setSelectedIndex(index);
    onSelect(scheme);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-app-fg">
        <Palette className="w-5 h-5 text-app-accent" />
        <h3 className="font-semibold">KI-Farbschema Generator</h3>
      </div>
      
      <p className="text-sm text-app-muted">
        Lass dir passende Farbschemata für dein Event vorschlagen.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="Stimmung (z.B. romantisch, elegant, modern)"
          className="flex-1 px-3 py-2 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent/50"
        />
        <Button
          type="button"
          onClick={generateSchemes}
          disabled={loading}
          variant="secondary"
          className="flex items-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {schemes.length > 0 ? 'Neu generieren' : 'Generieren'}
        </Button>
      </div>

      {schemes.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {schemes.map((scheme, index) => (
            <button
              key={index}
              onClick={() => handleSelect(scheme, index)}
              className={`relative p-3 rounded-xl border-2 transition-all ${
                selectedIndex === index
                  ? 'border-app-accent shadow-lg scale-[1.02]'
                  : currentPrimary === scheme.primary
                  ? 'border-app-accent/50'
                  : 'border-app-border hover:border-app-accent/30'
              }`}
            >
              {selectedIndex === index && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-app-accent rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Color Preview */}
              <div className="flex gap-1 mb-2">
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: scheme.primary }}
                  title="Primärfarbe"
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: scheme.secondary }}
                  title="Sekundärfarbe"
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: scheme.accent }}
                  title="Akzentfarbe"
                />
                <div
                  className="w-8 h-8 rounded-lg shadow-sm border border-app-border"
                  style={{ backgroundColor: scheme.background }}
                  title="Hintergrund"
                />
              </div>
              
              {/* Preview Card */}
              <div
                className="rounded-lg p-2 mb-2"
                style={{ backgroundColor: scheme.background }}
              >
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: scheme.primary }}
                >
                  Beispiel Button
                </div>
                <div
                  className="text-[10px] px-2 py-1 rounded inline-block"
                  style={{ 
                    backgroundColor: scheme.primary,
                    color: '#fff'
                  }}
                >
                  Klick mich
                </div>
              </div>
              
              <p className="text-xs font-medium text-app-fg truncate">
                {scheme.name}
              </p>
            </button>
          ))}
        </div>
      )}

      {schemes.length === 0 && !loading && (
        <div className="text-center py-6 text-app-muted">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Klicke auf "Generieren" für KI-Vorschläge</p>
        </div>
      )}
    </div>
  );
}
