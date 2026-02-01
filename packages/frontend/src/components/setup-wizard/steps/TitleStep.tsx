'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EventCategory } from '../types';

interface TitleStepProps {
  title: string;
  eventType: EventCategory;
  onTitleChange: (title: string) => void;
  onNext: () => void;
  onBack: () => void;
}

// Placeholder examples per event type
const PLACEHOLDER_EXAMPLES: Record<EventCategory, string> = {
  wedding: 'z.B. Hochzeit Anna & Max',
  family: 'z.B. Taufe von Emma',
  milestone: 'z.B. 30. Geburtstag Lisa',
  business: 'z.B. Firmenevent 2026',
  party: 'z.B. Sommerfest 2026',
  custom: 'z.B. Mein Event',
};

export default function TitleStep({
  title,
  eventType,
  onTitleChange,
  onNext,
  onBack,
}: TitleStepProps) {
  const isValid = title.trim().length >= 3;
  const placeholder = PLACEHOLDER_EXAMPLES[eventType] || PLACEHOLDER_EXAMPLES.custom;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Wie heißt dein Event? ✨
        </motion.h2>
        <p className="text-gray-500">Gib deinem Event einen Namen</p>
      </div>

      {/* Title Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="relative">
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors"
            autoFocus
          />
          {title.length > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400"
            >
              {title.length}/50
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-sm text-gray-400"
      >
        Der Titel wird auf der Event-Seite angezeigt
      </motion.p>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Weiter
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
