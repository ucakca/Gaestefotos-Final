'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import AIAssistantCard from '../AIAssistantCard';

interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ColorSchemeStepProps {
  colorScheme: string;
  customColors?: CustomColors;
  coverImagePreview: string | null;
  onColorSchemeChange: (scheme: string, customColors?: CustomColors) => void;
  onNext: () => void;
  onBack: () => void;
}

const COLOR_SCHEMES = [
  { id: 'elegant', label: 'Elegant', gradient: 'from-amber-100 to-amber-50', accent: '#f59e0b' },
  { id: 'romantic', label: 'Romantisch', gradient: 'from-rose-100 to-pink-50', accent: '#f43f5e' },
  { id: 'modern', label: 'Modern', gradient: 'from-slate-200 to-slate-100', accent: '#64748b' },
  { id: 'ocean', label: 'Ozean', gradient: 'from-blue-100 to-cyan-50', accent: '#0ea5e9' },
  { id: 'forest', label: 'Natur', gradient: 'from-green-100 to-emerald-50', accent: '#10b981' },
  { id: 'sunset', label: 'Sonnenuntergang', gradient: 'from-orange-100 to-rose-100', accent: '#f97316' },
  { id: 'lavender', label: 'Lavendel', gradient: 'from-purple-100 to-violet-50', accent: '#8b5cf6' },
  { id: 'midnight', label: 'Mitternacht', gradient: 'from-indigo-200 to-slate-200', accent: '#6366f1' },
  { id: 'custom', label: 'Benutzerdefiniert', gradient: 'from-gray-100 to-gray-50', accent: '#6b7280', isCustom: true },
];

export default function ColorSchemeStep({
  colorScheme,
  customColors: initialCustomColors,
  coverImagePreview,
  onColorSchemeChange,
  onNext,
  onBack,
}: ColorSchemeStepProps) {
  const [showAI, setShowAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<CustomColors | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [customColors, setCustomColors] = useState<CustomColors>(initialCustomColors || {
    primary: '#f59e0b',
    secondary: '#fef3c7', 
    accent: '#d97706',
  });

  const handleAISuggest = async () => {
    if (!coverImagePreview) return;
    
    setShowAI(true);
    setIsLoadingAI(true);
    
    // Extract dominant colors from image
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = coverImagePreview;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);
      
      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      const colors: { r: number; g: number; b: number; count: number }[] = [];
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
        const existing = colors.find(c => Math.abs(c.r - r) < 30 && Math.abs(c.g - g) < 30 && Math.abs(c.b - b) < 30);
        if (existing) existing.count++;
        else colors.push({ r, g, b, count: 1 });
      }
      
      colors.sort((a, b) => b.count - a.count);
      const top3 = colors.slice(0, 3);
      
      const toHex = (c: { r: number; g: number; b: number }) => 
        `#${c.r.toString(16).padStart(2, '0')}${c.g.toString(16).padStart(2, '0')}${c.b.toString(16).padStart(2, '0')}`;
      
      setAiSuggestion({
        primary: toHex(top3[0] || { r: 245, g: 158, b: 11 }),
        secondary: toHex(top3[1] || { r: 254, g: 243, b: 199 }),
        accent: toHex(top3[2] || { r: 217, g: 119, b: 6 }),
      });
    } catch (e) {
      setAiSuggestion({ primary: '#f59e0b', secondary: '#fef3c7', accent: '#d97706' });
    }
    setIsLoadingAI(false);
  };

  const selectedScheme = COLOR_SCHEMES.find(s => s.id === colorScheme);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Wähle dein Farbschema 🎨
        </motion.h2>
        <p className="text-muted-foreground">Die Farben für deine Event-Seite</p>
      </div>

      {/* AI Suggestion (if cover image exists) */}
      {coverImagePreview && !showAI && !aiSuggestion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-purple-50 border border-purple-200 rounded-xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-purple-900 font-medium mb-1">
                KI-Farbanalyse verfügbar
              </p>
              <p className="text-xs text-purple-700 mb-3">
                Dein Titelbild wird analysiert um passende Farben vorzuschlagen.
              </p>
              <button
                onClick={handleAISuggest}
                className="text-sm font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Farben extrahieren
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {showAI && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4"
        >
          {isLoadingAI ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-purple-900 font-medium">Analysiere Bilder...</p>
                <p className="text-xs text-purple-600">Titelbild wird ausgewertet</p>
              </div>
            </div>
          ) : aiSuggestion ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-900 font-medium">Benutzerdefinierte Farben extrahiert</p>
                  <p className="text-xs text-purple-600">Basierend auf deinem Titelbild</p>
                </div>
              </div>
              {/* Preview extracted colors */}
              <div className="flex gap-2">
                <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: aiSuggestion.primary }} />
                <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: aiSuggestion.secondary }} />
                <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: aiSuggestion.accent }} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCustomColors(aiSuggestion);
                    onColorSchemeChange('custom', aiSuggestion);
                    setShowAI(false);
                  }}
                  className="flex-1 py-2 px-4 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Akzeptieren
                </button>
                <button
                  onClick={() => setShowAI(false)}
                  className="py-2 px-4 text-purple-600 text-sm font-medium rounded-lg border border-purple-200 hover:bg-purple-50 transition-colors"
                >
                  Selbst wählen
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Color Scheme Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-3"
      >
        {COLOR_SCHEMES.map((scheme, index) => {
          const isSelected = colorScheme === scheme.id;
          
          return (
            <motion.button
              key={scheme.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onColorSchemeChange(scheme.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-foreground shadow-lg'
                  : 'border-border/50 hover:border-border'
              }`}
            >
              {/* Color Preview */}
              <div className={`h-12 rounded-xl bg-gradient-to-br ${scheme.gradient} mb-2`}>
                <div 
                  className="h-full w-1/3 rounded-l-xl"
                  style={{ backgroundColor: scheme.accent, opacity: 0.3 }}
                />
              </div>
              
              {/* Label */}
              <p className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {scheme.label}
              </p>

              {/* Selected Check */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Custom Color Picker - shown when 'custom' is selected */}
      {colorScheme === 'custom' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-muted/50 rounded-2xl p-4 space-y-4"
        >
          <p className="text-sm font-medium text-foreground/80">Eigene Farben wählen</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Primär</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.primary}
                  onChange={(e) => {
                    const newColors = { ...customColors, primary: e.target.value };
                    setCustomColors(newColors);
                    onColorSchemeChange('custom', newColors);
                  }}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-muted-foreground">{customColors.primary}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Sekundär</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.secondary}
                  onChange={(e) => {
                    const newColors = { ...customColors, secondary: e.target.value };
                    setCustomColors(newColors);
                    onColorSchemeChange('custom', newColors);
                  }}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-muted-foreground">{customColors.secondary}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Akzent</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.accent}
                  onChange={(e) => {
                    const newColors = { ...customColors, accent: e.target.value };
                    setCustomColors(newColors);
                    onColorSchemeChange('custom', newColors);
                  }}
                  className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                />
                <span className="text-xs font-mono text-muted-foreground">{customColors.accent}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview */}
      {selectedScheme && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`rounded-2xl p-4 bg-gradient-to-br ${selectedScheme.gradient}`}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: selectedScheme.accent }}
            />
            <div>
              <p className="font-semibold text-foreground">Vorschau</p>
              <p className="text-sm text-muted-foreground">So wird dein Event aussehen</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        <Button onClick={onBack} variant="outline" className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
        >
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
