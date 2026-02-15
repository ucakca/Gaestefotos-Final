'use client';

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

interface DateRangeFilterProps {
  onApply: (startDate: Date | null, endDate: Date | null) => void;
  onClear: () => void;
}

export default function DateRangeFilter({ onApply, onClear }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleApply = () => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && end && start > end) {
      alert('Startdatum muss vor Enddatum liegen');
      return;
    }
    
    onApply(start, end);
    setIsOpen(false);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onClear();
    setIsOpen(false);
  };

  const hasActiveFilter = startDate || endDate;

  return (
    <div className="relative">
      <Button
        variant={hasActiveFilter ? 'primary' : 'secondary'}
        onClick={() => setIsOpen(!isOpen)}
        className={`gap-2 ${hasActiveFilter ? 'bg-primary' : ''}`}
        size="sm"
      >
        <Calendar className="w-4 h-4" />
        Datumsfilter
        {hasActiveFilter && (
          <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
            aktiv
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 right-0 bg-card border border-border rounded-lg shadow-xl p-4 min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              <Calendar className="w-4 h-4 inline mr-2" />
              Zeitraum filtern
            </h3>
            <IconButton
              icon={<X className="w-4 h-4" />}
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              title="Schließen"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Von (inkl.)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Bis (inkl.)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleClear}
              variant="ghost"
              className="flex-1 text-sm"
              size="sm"
              disabled={!hasActiveFilter}
            >
              Zurücksetzen
            </Button>
            <Button
              onClick={handleApply}
              variant="primary"
              className="flex-1 text-sm bg-primary hover:opacity-90"
              size="sm"
            >
              Anwenden
            </Button>
          </div>

          {hasActiveFilter && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {startDate && endDate && (
                  <>Zeige Fotos vom {new Date(startDate).toLocaleDateString('de-DE')} bis {new Date(endDate).toLocaleDateString('de-DE')}</>
                )}
                {startDate && !endDate && (
                  <>Zeige Fotos ab {new Date(startDate).toLocaleDateString('de-DE')}</>
                )}
                {!startDate && endDate && (
                  <>Zeige Fotos bis {new Date(endDate).toLocaleDateString('de-DE')}</>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
