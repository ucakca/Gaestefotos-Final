'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { EVENT_TYPES, EventCategory } from '../presets/eventTypes';
import { Button } from '@/components/ui/Button';

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
  const eventConfig = EVENT_TYPES[selectedType];
  const hasSubtypes = eventConfig.subtypes && eventConfig.subtypes.length > 0;

  const handleTypeSelect = (type: EventCategory) => {
    onSelectType(type);
    onSelectSubtype(undefined);
  };

  const categories: EventCategory[] = ['wedding', 'family', 'milestone', 'business', 'party', 'custom'];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Was feierst du?</h2>
        <p className="text-muted-foreground">Wähle den Anlass für dein Event</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((type) => {
          const config = EVENT_TYPES[type];
          const IconComponent = Icons[config.icon] as Icons.LucideIcon;
          const isSelected = selectedType === type;

          return (
            <button
              key={type}
              onClick={() => handleTypeSelect(type)}
              className={`
                flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? `border-${config.color}-500 bg-${config.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <IconComponent className={`w-12 h-12 mb-3 ${isSelected ? `text-${config.color}-600` : 'text-gray-600'}`} />
              <span className={`font-medium ${isSelected ? `text-${config.color}-900` : 'text-gray-900'}`}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {hasSubtypes && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Welche Art?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventConfig.subtypes!.map((subtype) => {
              const isSelected = selectedSubtype === subtype.id;
              return (
                <button
                  key={subtype.id}
                  onClick={() => onSelectSubtype(subtype.id)}
                  className={`
                    px-4 py-3 rounded-lg border-2 transition-all text-left
                    ${
                      isSelected
                        ? `border-${eventConfig.color}-500 bg-${eventConfig.color}-50`
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <span className={isSelected ? `text-${eventConfig.color}-900` : 'text-gray-900'}>
                    {subtype.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} size="lg">
          Weiter
        </Button>
      </div>
    </div>
  );
}
