'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { EventCategory } from '../types';
import { Button } from '@/components/ui/Button';

interface EventTypeConfig {
  label: string;
  icon: keyof typeof Icons;
  description: string;
  subtypes?: { id: string; label: string }[];
}

const EVENT_TYPES: Record<EventCategory, EventTypeConfig> = {
  wedding: {
    label: 'Hochzeit',
    icon: 'Heart',
    description: 'Der schönste Tag im Leben',
    subtypes: [
      { id: 'civil', label: 'Standesamtliche Trauung' },
      { id: 'church', label: 'Kirchliche Trauung' },
      { id: 'free', label: 'Freie Trauung' },
      { id: 'full', label: 'Komplette Hochzeit' },
    ],
  },
  family: {
    label: 'Familie',
    icon: 'Users',
    description: 'Taufe, Kommunion, Konfirmation',
    subtypes: [
      { id: 'baptism', label: 'Taufe' },
      { id: 'communion', label: 'Kommunion' },
      { id: 'confirmation', label: 'Konfirmation' },
      { id: 'reunion', label: 'Familientreffen' },
    ],
  },
  milestone: {
    label: 'Jubiläum',
    icon: 'Award',
    description: 'Geburtstage, Jubiläen',
    subtypes: [
      { id: 'birthday', label: 'Geburtstag' },
      { id: 'anniversary', label: 'Hochzeitstag' },
      { id: 'graduation', label: 'Abschlussfeier' },
    ],
  },
  business: {
    label: 'Business',
    icon: 'Briefcase',
    description: 'Firmenfeiern, Konferenzen',
    subtypes: [
      { id: 'conference', label: 'Konferenz' },
      { id: 'team', label: 'Teambuilding' },
      { id: 'launch', label: 'Produktlaunch' },
    ],
  },
  party: {
    label: 'Party',
    icon: 'PartyPopper',
    description: 'Feste, Feiern, Mottopartys',
  },
  custom: {
    label: 'Sonstiges',
    icon: 'Sparkles',
    description: 'Individuelles Event',
  },
};

interface EventTypeStepProps {
  selectedType: EventCategory;
  selectedSubtype?: string;
  onSelectType: (type: EventCategory) => void;
  onSelectSubtype: (subtype: string | undefined) => void;
  onNext: () => void;
}

export default function EventTypeStep({
  selectedType,
  selectedSubtype,
  onSelectType,
  onSelectSubtype,
  onNext,
}: EventTypeStepProps) {
  const categories: EventCategory[] = ['wedding', 'family', 'milestone', 'business', 'party', 'custom'];
  const eventConfig = EVENT_TYPES[selectedType];
  const hasSubtypes = eventConfig.subtypes && eventConfig.subtypes.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-app-fg mb-2"
        >
          Was feierst du? 🎉
        </motion.h2>
        <p className="text-app-muted">Wähle den Anlass für dein Event</p>
      </div>

      {/* Event Type Grid */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((type, index) => {
          const config = EVENT_TYPES[type];
          const IconComponent = Icons[config.icon] as Icons.LucideIcon;
          const isSelected = selectedType === type;

          return (
            <motion.button
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                onSelectType(type);
                onSelectSubtype(undefined);
              }}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-100'
                  : 'border-app-border bg-app-card hover:border-app-border hover:bg-app-bg'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                isSelected ? 'bg-amber-500' : 'bg-app-bg'
              }`}>
                <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-app-muted'}`} />
              </div>
              <p className={`font-semibold ${isSelected ? 'text-amber-900' : 'text-app-fg'}`}>
                {config.label}
              </p>
              <p className="text-xs text-app-muted mt-0.5">{config.description}</p>
              
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
                >
                  <Icons.Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Subtypes */}
      {hasSubtypes && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <p className="text-sm font-medium text-app-fg">Welche Art?</p>
          <div className="grid grid-cols-2 gap-2">
            {eventConfig.subtypes!.map((subtype) => {
              const isSelected = selectedSubtype === subtype.id;
              return (
                <motion.button
                  key={subtype.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectSubtype(subtype.id)}
                  className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-app-border hover:border-app-border'
                  }`}
                >
                  <span className={`text-sm font-medium ${isSelected ? 'text-amber-700' : 'text-app-fg'}`}>
                    {subtype.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Next Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={onNext}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3"
        >
          Weiter
          <Icons.ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
