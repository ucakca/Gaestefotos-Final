'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

interface BasicInfoStepProps {
  title: string;
  dateTime: Date | null;
  location?: string;
  onTitleChange: (title: string) => void;
  onDateTimeChange: (dateTime: Date | null) => void;
  onLocationChange: (location: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function BasicInfoStep({
  title,
  dateTime,
  location,
  onTitleChange,
  onDateTimeChange,
  onLocationChange,
  onNext,
  onBack,
}: BasicInfoStepProps) {
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  // Geocode location when it changes (debounced)
  useEffect(() => {
    if (!location || location.trim().length < 3) {
      setMapCoords(null);
      return;
    }

    const timer = setTimeout(async () => {
      setMapLoading(true);
      try {
        const encoded = encodeURIComponent(location.trim());
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
          { headers: { 'User-Agent': 'GaesteFotos-App' } }
        );
        const data = await res.json();
        if (data && data[0]) {
          setMapCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
        } else {
          setMapCoords(null);
        }
      } catch {
        setMapCoords(null);
      } finally {
        setMapLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [location]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onDateTimeChange(date);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!dateTime) return;
    const [hours, minutes] = e.target.value.split(':');
    const newDate = new Date(dateTime);
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    onDateTimeChange(newDate);
  };

  const dateValue = dateTime ? dateTime.toISOString().split('T')[0] : '';
  const timeValue = dateTime
    ? `${String(dateTime.getHours()).padStart(2, '0')}:${String(dateTime.getMinutes()).padStart(2, '0')}`
    : '';

  const canProceed = title.trim().length > 0 && dateTime !== null;
  const titleError = title.length > 0 && title.trim().length === 0 ? 'Name darf nicht nur aus Leerzeichen bestehen' : '';

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Wie heißt dein Event?</h2>
        <p className="text-muted-foreground">Die wichtigsten Infos</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Event-Name
          </label>
          <Input
            id="title"
            type="text"
            placeholder="z.B. Anna & Max"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className={titleError ? 'border-red-500' : ''}
          />
          {titleError && (
            <p className="text-sm text-red-600 mt-1">{titleError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Wann findet es statt?</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-xs text-muted-foreground mb-1">
                📅 Datum
              </label>
              <Input id="date" type="date" value={dateValue} onChange={handleDateChange} />
            </div>
            <div>
              <label htmlFor="time" className="block text-xs text-muted-foreground mb-1">
                🕐 Uhrzeit (optional)
              </label>
              <Input id="time" type="time" value={timeValue} onChange={handleTimeChange} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium mb-2">
            📍 Wo? (optional)
          </label>
          <Input
            id="location"
            placeholder="z.B. Schloss Schönbrunn, Wien"
            value={location || ''}
            onChange={(e) => onLocationChange(e.target.value)}
          />
          
          {/* Map Preview */}
          {location && location.trim().length >= 3 && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
              {mapLoading ? (
                <div className="h-32 bg-gray-100 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                    <span>Karte wird geladen...</span>
                  </div>
                </div>
              ) : mapCoords ? (
                <div className="relative">
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="150"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.01}%2C${mapCoords.lat - 0.005}%2C${mapCoords.lon + 0.01}%2C${mapCoords.lat + 0.005}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lon}`}
                    className="w-full"
                  />
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${mapCoords.lat}&mlon=${mapCoords.lon}#map=16/${mapCoords.lat}/${mapCoords.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Größere Karte
                  </a>
                </div>
              ) : (
                <div className="h-24 bg-gray-50 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>Ort nicht gefunden</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>
          Zurück
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
