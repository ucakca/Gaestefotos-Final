'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ArrowRight, ArrowLeft, Calendar, MapPin, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Dynamic import to avoid SSR issues with Leaflet
const LocationMap = dynamic(() => import('../LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl border-2 border-border bg-muted/50 flex items-center justify-center">
      <div className="text-muted-foreground/70 text-sm">Karte wird geladen...</div>
    </div>
  ),
});

interface DateLocationStepProps {
  dateTime: Date | null;
  location: string;
  onDateTimeChange: (date: Date | null) => void;
  onLocationChange: (location: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function DateLocationStep({
  dateTime,
  location,
  onDateTimeChange,
  onLocationChange,
  onNext,
  onBack,
  onSkip,
}: DateLocationStepProps) {
  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDateChange = (value: string) => {
    if (value) {
      // Validate year is max 4 digits
      const year = value.split('-')[0];
      if (year && year.length > 4) {
        return; // Don't accept years with more than 4 digits
      }
      const date = new Date(value);
      // Additional check: year must be reasonable (1900-2099)
      if (date.getFullYear() > 2099 || date.getFullYear() < 1900) {
        return;
      }
      onDateTimeChange(date);
    } else {
      onDateTimeChange(null);
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
          Wann & Wo? 📍
        </motion.h2>
        <p className="text-muted-foreground">Diese Angaben sind optional</p>
      </div>

      {/* Date Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/80 mb-2">
            <Calendar className="w-4 h-4" />
            Datum & Uhrzeit
          </label>
          <input
            type="datetime-local"
            value={formatDateForInput(dateTime)}
            onChange={(e) => handleDateChange(e.target.value)}
            min="2020-01-01T00:00"
            max="2099-12-31T23:59"
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-warning focus:ring-0 focus:outline-none bg-background text-foreground transition-colors"
          />
        </div>

        {/* Location Input */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-foreground/80 mb-2">
            <MapPin className="w-4 h-4" />
            Ort / Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="z.B. Schloss Neuschwanstein"
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:border-warning focus:ring-0 focus:outline-none bg-background text-foreground transition-colors"
          />
        </div>

        {/* Map */}
        {location && location.length > 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <LocationMap 
              location={location} 
              onLocationChange={(newLocation) => onLocationChange(newLocation)}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4"
      >
        <p className="text-sm text-foreground">
          💡 <strong>Tipp:</strong> Datum und Ort werden auf der Event-Seite angezeigt und helfen Gästen bei der Orientierung.
        </p>
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <div className="flex gap-3">
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
            className="flex-1 bg-warning hover:opacity-90 text-warning-foreground"
          >
            Weiter
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <button
          onClick={onSkip}
          className="w-full py-2 text-sm text-muted-foreground hover:text-foreground/80 flex items-center justify-center gap-1"
        >
          <SkipForward className="w-4 h-4" />
          Überspringen, später hinzufügen
        </button>
      </motion.div>
    </div>
  );
}
