'use client';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Calendar } from 'lucide-react';

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
