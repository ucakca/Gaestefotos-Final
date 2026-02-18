'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ArrowRight, ArrowLeft, Calendar, MapPin, SkipForward, Clock, Plus, X, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location?: string;
}

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
  schedule?: ScheduleItem[];
  onDateTimeChange: (date: Date | null) => void;
  onLocationChange: (location: string) => void;
  onScheduleChange?: (schedule: ScheduleItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function DateLocationStep({
  dateTime,
  location,
  schedule = [],
  onDateTimeChange,
  onLocationChange,
  onScheduleChange,
  onNext,
  onBack,
  onSkip,
}: DateLocationStepProps) {
  const [showSchedule, setShowSchedule] = useState(schedule.length > 0);
  const [newTime, setNewTime] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const addScheduleItem = () => {
    if (!newTime || !newTitle.trim()) return;
    const newItem: ScheduleItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      time: newTime,
      title: newTitle.trim(),
      location: newLocation.trim() || undefined,
    };
    onScheduleChange?.([...schedule, newItem]);
    setNewTime('');
    setNewTitle('');
    setNewLocation('');
  };

  const removeScheduleItem = (id: string) => {
    onScheduleChange?.(schedule.filter(item => item.id !== id));
  };

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

        {/* Schedule / Timeline Toggle */}
        <button
          type="button"
          onClick={() => setShowSchedule(!showSchedule)}
          className="w-full flex items-center justify-between px-4 py-3 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Clock className="w-4 h-4" />
            Zeitplan / Ablauf hinzufügen
          </span>
          {showSchedule ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Schedule Section */}
        <AnimatePresence>
          {showSchedule && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {/* Existing schedule items */}
              {schedule.length > 0 && (
                <div className="space-y-2">
                  {schedule.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg group"
                    >
                      <span className="text-sm font-mono font-medium text-primary min-w-[50px]">
                        {item.time}
                      </span>
                      <span className="flex-1 text-sm text-foreground truncate">
                        {item.title}
                      </span>
                      {item.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeScheduleItem(item.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new item form */}
              <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-2">
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-24 px-2 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                    placeholder="14:00"
                  />
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="z.B. Trauung, Empfang, Dinner..."
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addScheduleItem()}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Raum/Halle (optional)"
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addScheduleItem()}
                  />
                  <button
                    type="button"
                    onClick={addScheduleItem}
                    disabled={!newTime || !newTitle.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Hinzufügen
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
