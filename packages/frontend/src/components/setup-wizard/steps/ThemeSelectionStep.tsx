'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles, Loader2, Palette, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemePreviewCard } from '@/components/event-theme/ThemePreviewCard';
import { useThemeApi } from '@/hooks/useThemeApi';
import type { EventTheme, GeneratedTheme } from '@/types/theme';

type ThemeSource = 'preset' | 'ai';

interface ThemeSelectionStepProps {
  eventType: string;
  selectedThemeId: string | null;
  onThemeSelect: (themeId: string | null, themeData?: EventTheme | null) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ThemeSelectionStep({
  eventType,
  selectedThemeId,
  onThemeSelect,
  onNext,
  onBack,
}: ThemeSelectionStepProps) {
  const { themes, generatedThemes, loading, error, fetchThemes, generateThemes } = useThemeApi();
  const [source, setSource] = useState<ThemeSource>('preset');
  const [selectedGenerated, setSelectedGenerated] = useState<GeneratedTheme | null>(null);

  // Load preset themes on mount / eventType change
  useEffect(() => {
    fetchThemes({ eventType: eventType || undefined });
  }, [eventType, fetchThemes]);

  const handleGenerateAI = async () => {
    setSource('ai');
    await generateThemes({ eventType: eventType || 'custom' });
  };

  const handleSelectPreset = (theme: EventTheme) => {
    setSelectedGenerated(null);
    onThemeSelect(theme.id, theme);
  };

  const handleSelectGenerated = (theme: GeneratedTheme) => {
    setSelectedGenerated(theme);
    // Pass null as ID since it's not saved yet — will be saved on event creation
    onThemeSelect(null, {
      id: '',
      slug: '',
      name: theme.name,
      eventType,
      season: null,
      locationStyle: null,
      colors: theme.colors,
      animations: theme.animations,
      fonts: theme.fonts,
      wallLayout: theme.wallLayout,
      previewImage: null,
      description: null,
      tags: ['ai-generated'],
      usageCount: 0,
      isPremium: false,
      isPublic: false,
      isAiGenerated: true,
    } as EventTheme);
  };

  const handleSkip = () => {
    onThemeSelect(null, null);
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Event-Theme wählen 🎨
        </motion.h2>
        <p className="text-muted-foreground">
          Wähle ein Design-Theme oder lass die KI eines generieren
        </p>
      </div>

      {/* Source Toggle */}
      <div className="flex gap-2 bg-muted/50 rounded-xl p-1">
        <button
          onClick={() => setSource('preset')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            source === 'preset'
              ? 'bg-white dark:bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" />
          Vorlagen
        </button>
        <button
          onClick={handleGenerateAI}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            source === 'ai'
              ? 'bg-white dark:bg-card shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          KI-generiert
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {source === 'preset' ? (
          <motion.div
            key="preset"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {loading && themes.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : themes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Themes für diesen Event-Typ verfügbar
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {themes.map((theme, i) => (
                  <motion.div
                    key={theme.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ThemePreviewCard
                      name={theme.name}
                      colors={theme.colors}
                      fonts={theme.fonts}
                      wallLayout={theme.wallLayout}
                      selected={selectedThemeId === theme.id}
                      onClick={() => handleSelectPreset(theme)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-3"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="relative">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <Sparkles className="w-4 h-4 text-purple-400 absolute -top-1 -right-1" />
                </div>
                <p className="text-sm text-muted-foreground">KI generiert Themes...</p>
              </div>
            ) : generatedThemes.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <Wand2 className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-foreground font-medium mb-1">KI-Theme generieren</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Passend zu deinem {eventType === 'wedding' ? 'Hochzeits' : eventType === 'party' ? 'Party' : eventType === 'business' ? 'Business' : 'Event'}-Typ
                </p>
                <Button
                  onClick={handleGenerateAI}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Themes generieren
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3">
                  {generatedThemes.map((theme, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <ThemePreviewCard
                        name={theme.name}
                        colors={theme.colors}
                        fonts={theme.fonts}
                        wallLayout={theme.wallLayout}
                        tasteScore={theme.tasteScore}
                        selected={selectedGenerated?.name === theme.name}
                        onClick={() => handleSelectGenerated(theme)}
                      />
                    </motion.div>
                  ))}
                </div>
                <button
                  onClick={handleGenerateAI}
                  className="w-full py-2 text-sm text-purple-500 hover:text-purple-400 font-medium flex items-center justify-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Neu generieren
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-500 text-center"
        >
          {error}
        </motion.p>
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
          disabled={!selectedThemeId && !selectedGenerated}
          className="flex-1 bg-warning hover:opacity-90 text-warning-foreground"
        >
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>

      {/* Skip link */}
      <div className="text-center">
        <button
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Überspringen — Standard-Design verwenden
        </button>
      </div>
    </div>
  );
}
