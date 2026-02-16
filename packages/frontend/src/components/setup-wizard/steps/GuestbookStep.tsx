'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, BookOpen, Sparkles, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import AIAssistantCard from '../AIAssistantCard';
import { useAISuggestions } from '../hooks/useAISuggestions';

interface GuestbookStepProps {
  enabled: boolean;
  message: string;
  eventType: string;
  eventTitle: string;
  onEnabledChange: (enabled: boolean) => void;
  onMessageChange: (message: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function GuestbookStep({
  enabled,
  message,
  eventType,
  eventTitle,
  onEnabledChange,
  onMessageChange,
  onNext,
  onBack,
  onSkip,
}: GuestbookStepProps) {
  const [showAI, setShowAI] = useState(false);
  const { isLoading: isLoadingAI, suggestGuestbook } = useAISuggestions();

  const handleGenerateAI = async () => {
    setShowAI(true);
    try {
      const suggestion = await suggestGuestbook(eventType, eventTitle);
      onMessageChange(suggestion);
      setShowAI(false);
    } catch (error) {
      onMessageChange('Herzlich willkommen im Gästebuch! Hinterlasst eure Glückwünsche und Grüße. 💝');
      setShowAI(false);
    }
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
          Gästebuch 📖
        </motion.h2>
        <p className="text-muted-foreground">Lass Gäste Grüße hinterlassen</p>
      </div>

      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border-2 transition-colors ${
          enabled ? 'border-warning/30 bg-warning/10' : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className={`w-6 h-6 ${enabled ? 'text-warning' : 'text-muted-foreground'}`} />
            <div>
              <p className="font-medium text-foreground">Gästebuch aktivieren</p>
              <p className="text-sm text-muted-foreground">Gäste können Nachrichten schreiben</p>
            </div>
          </div>
          <button
            onClick={() => onEnabledChange(!enabled)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              enabled ? 'bg-warning' : 'bg-background'
            }`}
          >
            <motion.div
              className="w-5 h-5 bg-card rounded-full absolute top-1"
              animate={{ left: enabled ? '26px' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Welcome Message */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <label className="block text-sm font-medium text-foreground">
            Willkommensnachricht
          </label>
          
          {!message && !showAI && (
            <button
              onClick={handleGenerateAI}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">KI-Text generieren</span>
            </button>
          )}

          {showAI && (
            <div className="flex items-center justify-center py-4 text-purple-500">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mr-2" />
              <span className="text-sm">KI generiert Text...</span>
            </div>
          )}

          {message && (
            <div className="space-y-2">
              <textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="z.B. Herzlich willkommen! Schreibt uns eure Glückwünsche..."
                className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-warning focus:outline-none resize-none bg-background text-foreground"
                rows={3}
              />
              <button
                onClick={handleGenerateAI}
                disabled={isLoadingAI}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Neu generieren</span>
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Info */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
        >
          <p className="text-sm text-foreground">
            💡 <strong>Tipp:</strong> Gästebuch-Einträge können Text und optional Sprachnachrichten enthalten.
          </p>
        </motion.div>
      )}

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
          <Button
            onClick={onNext}
            className="flex-1 bg-warning hover:opacity-90 text-warning-foreground"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen
        </button>
      </motion.div>
    </div>
  );
}
