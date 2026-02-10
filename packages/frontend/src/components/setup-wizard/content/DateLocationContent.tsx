'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Calendar, MapPin } from 'lucide-react';

const LocationMap = dynamic(() => import('../LocationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-48 rounded-xl border-2 border-app-border bg-app-bg flex items-center justify-center">
      <div className="text-app-muted text-sm">Karte wird geladen...</div>
    </div>
  ),
});

interface DateLocationContentProps {
  dateTime: Date | null;
  location: string;
  onDateTimeChange: (date: Date | null) => void;
  onLocationChange: (location: string) => void;
  showHeader?: boolean;
  showTip?: boolean;
  dateLocked?: boolean;
}

export default function DateLocationContent({
  dateTime,
  location,
  onDateTimeChange,
  onLocationChange,
  showHeader = true,
  showTip = true,
  dateLocked = false,
}: DateLocationContentProps) {
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
      const year = value.split('-')[0];
      if (year && year.length > 4) return;
      const date = new Date(value);
      if (date.getFullYear() > 2099 || date.getFullYear() < 1900) return;
      onDateTimeChange(date);
    } else {
      onDateTimeChange(null);
    }
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center">
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-app-fg mb-2"
          >
            Wann & Wo? 📍
          </motion.h2>
          <p className="text-app-muted">Diese Angaben sind optional</p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-app-fg mb-2">
            <Calendar className="w-4 h-4" />
            Datum & Uhrzeit
          </label>
          <input
            type="datetime-local"
            value={formatDateForInput(dateTime)}
            onChange={(e) => handleDateChange(e.target.value)}
            min="2020-01-01T00:00"
            max="2099-12-31T23:59"
            disabled={dateLocked}
            className={`w-full px-4 py-3 border-2 border-app-border bg-app-card text-app-fg rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors ${dateLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {dateLocked && (
            <p className="mt-1 text-xs text-amber-600">Das Datum kann nicht mehr geändert werden, da das Event bereits gestartet ist.</p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-app-fg mb-2">
            <MapPin className="w-4 h-4" />
            Ort / Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="z.B. Schloss Neuschwanstein"
            className="w-full px-4 py-3 border-2 border-app-border bg-app-card text-app-fg rounded-xl focus:border-amber-500 focus:ring-0 focus:outline-none transition-colors placeholder:text-app-muted"
          />
        </div>

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

      {showTip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-100 rounded-xl p-4"
        >
          <p className="text-sm text-blue-700">
            💡 <strong>Tipp:</strong> Datum und Ort werden auf der Event-Seite angezeigt und helfen Gästen bei der Orientierung.
          </p>
        </motion.div>
      )}
    </div>
  );
}
