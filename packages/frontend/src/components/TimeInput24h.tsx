'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';

interface TimeInput24hProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export default function TimeInput24h({
  id,
  value,
  onChange,
  required = false,
  className = '',
  style,
  placeholder = 'HH:MM',
}: TimeInput24hProps) {
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [rawValue, setRawValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value (HH:MM format)
  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      setHours(h || '');
      setMinutes(m || '');
      setRawValue(value);
    } else {
      setHours('');
      setMinutes('');
      setRawValue('');
    }
  }, [value]);

  // Update parent when hours or minutes change
  useEffect(() => {
    const hNum = parseInt(hours, 10);
    const mNum = parseInt(minutes, 10);

    const hoursComplete = hours.length === 2 && !isNaN(hNum) && hNum >= 0 && hNum <= 23;
    const minutesComplete = minutes.length === 2 && !isNaN(mNum) && mNum >= 0 && mNum <= 59;

    if (hoursComplete && minutesComplete) {
      const h = hours.padStart(2, '0');
      const m = minutes.padStart(2, '0');
      const next = `${h}:${m}`;
      onChange(next);
      setRawValue(next);
      return;
    }

    // Keep parent empty until we have a complete valid time, but allow clearing.
    if (rawValue === '') {
      onChange('');
    }
  }, [hours, minutes, onChange]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleHourChange = (h: string) => {
    const num = parseInt(h);
    if (isNaN(num) || num < 0) {
      setHours('');
      return;
    }
    if (num > 23) {
      setHours('23');
      return;
    }
    setHours(h);
  };

  const handleMinuteChange = (m: string) => {
    const num = parseInt(m);
    if (isNaN(num) || num < 0) {
      setMinutes('');
      return;
    }
    if (num > 59) {
      setMinutes('59');
      return;
    }
    setMinutes(m);
  };

  const selectHour = (h: number) => {
    const next = h.toString().padStart(2, '0');
    setHours(next);
    setRawValue((prev) => {
      if (prev.includes(':')) {
        const parts = prev.split(':');
        return `${next}:${(parts[1] || '').slice(0, 2)}`;
      }
      return next;
    });
  };

  const selectMinute = (m: number) => {
    const next = m.toString().padStart(2, '0');
    setMinutes(next);
    setRawValue((prev) => {
      if (prev.includes(':')) {
        const parts = prev.split(':');
        return `${(parts[0] || '').slice(0, 2)}:${next}`;
      }
      const h = (hours || '').slice(0, 2);
      return h ? `${h}:${next}` : `:${next}`;
    });
  };

  const displayHours = hours || '00';
  const displayMinutes = minutes || '00';

  const handleTypedChange = (nextRaw: string) => {
    // Allow only digits and a single colon, max length 5 (HH:MM)
    const cleaned = nextRaw
      .replace(/[^0-9:]/g, '')
      .replace(/:{2,}/g, ':')
      .slice(0, 5);

    // If user types without colon, auto-insert ':' after HH.
    if (!cleaned.includes(':')) {
      if (cleaned.length <= 2) {
        setRawValue(cleaned);
        setHours(cleaned);
        setMinutes('');
        return;
      }

      const h = cleaned.slice(0, 2);
      const m = cleaned.slice(2, 4);
      const next = `${h}:${m}`;
      setRawValue(next);
      setHours(h);
      setMinutes(m);
      return;
    }

    setRawValue(cleaned);

    const [hRaw, mRaw] = cleaned.split(':');
    const h = (hRaw || '').slice(0, 2);
    const m = (mRaw || '').slice(0, 2);

    setHours(h);
    setMinutes(m);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          required={required}
          value={rawValue}
          onChange={(e) => handleTypedChange(e.target.value)}
          placeholder={placeholder}
          className={`${className} bg-card text-foreground pr-10`}
          style={style}
        />
        <IconButton
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          icon={<Clock className="w-5 h-5 text-foreground" />}
          variant="ghost"
          size="sm"
          aria-label="Uhrzeit auswählen"
          title="Uhrzeit auswählen"
          className="absolute right-3 top-1/2 -translate-y-1/2"
        />
      </div>

      {showPicker && (
        <div className="absolute z-50 mt-2 bg-card border-2 border-border rounded-lg shadow-xl p-4 w-64">
          <div className="flex gap-4">
            {/* Hours */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2 text-center">Stunden</div>
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => (
                  <Button
                    key={i}
                    type="button"
                    onClick={() => {
                      selectHour(i);
                      setShowPicker(false);
                    }}
                    variant={parseInt(displayHours) === i ? 'primary' : 'ghost'}
                    size="sm"
                    className="w-full px-3 py-2 text-sm transition-colors"
                  >
                    {i.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="flex-1">
              <div className="text-xs font-semibold text-muted-foreground mb-2 text-center">Minuten</div>
              <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {Array.from({ length: 60 }, (_, i) => (
                  <Button
                    key={i}
                    type="button"
                    onClick={() => {
                      selectMinute(i);
                      setShowPicker(false);
                    }}
                    variant={parseInt(displayMinutes) === i ? 'primary' : 'ghost'}
                    size="sm"
                    className="w-full px-3 py-2 text-sm transition-colors"
                  >
                    {i.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Input */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => handleHourChange(e.target.value)}
                placeholder="HH"
                className="flex-1 max-w-[80px] px-3 py-2 border border-border bg-card text-foreground rounded-lg text-center text-sm focus:ring-2 focus:outline-none focus:ring-foreground/30"
              />
              <span className="text-muted-foreground font-semibold">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => handleMinuteChange(e.target.value)}
                placeholder="MM"
                className="flex-1 max-w-[80px] px-3 py-2 border border-border bg-card text-foreground rounded-lg text-center text-sm focus:ring-2 focus:outline-none focus:ring-foreground/30"
              />
              <Button
                type="button"
                onClick={() => setShowPicker(false)}
                variant="primary"
                size="sm"
                className="px-3 py-2 rounded-lg text-sm transition-colors"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
