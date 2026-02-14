'use client';

import { motion } from 'framer-motion';
import { EventCategory } from '../types';

interface TitleContentProps {
  title: string;
  eventType: EventCategory;
  onTitleChange: (title: string) => void;
  showHeader?: boolean;
}

const PLACEHOLDER_EXAMPLES: Record<EventCategory, string> = {
  wedding: 'z.B. Hochzeit Anna & Max',
  family: 'z.B. Taufe von Emma',
  milestone: 'z.B. 30. Geburtstag Lisa',
  business: 'z.B. Firmenevent 2026',
  party: 'z.B. Sommerfest 2026',
  custom: 'z.B. Mein Event',
};

export default function TitleContent({
  title,
  eventType,
  onTitleChange,
  showHeader = true,
}: TitleContentProps) {
  const placeholder = PLACEHOLDER_EXAMPLES[eventType] || PLACEHOLDER_EXAMPLES.custom;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground mb-2"
          >
            Wie heißt dein Event? ✨
          </motion.h2>
          <p className="text-muted-foreground">Gib deinem Event einen Namen</p>
        </div>
      )}

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
            className="w-full px-4 py-4 text-lg border-2 border-border bg-card text-foreground rounded-2xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-muted-foreground"
            autoFocus
          />
          {title.length > 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            >
              {title.length}/50
            </motion.span>
          )}
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-sm text-muted-foreground"
      >
        Der Titel wird auf der Event-Seite angezeigt
      </motion.p>
    </div>
  );
}

export function isTitleValid(title: string): boolean {
  return title.trim().length >= 3;
}
