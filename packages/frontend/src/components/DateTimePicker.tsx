'use client';

import { useState, useRef, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { de } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';

registerLocale('de', de);

interface DateTimePickerProps {
  value: string; // ISO string format
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
}

export default function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  className = '',
  disabled = false,
  minDate,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Convert ISO string to Date object
  const selectedDate = value ? new Date(value) : null;

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Convert to ISO string format that backend expects
      onChange(date.toISOString());
      setIsOpen(false);
    } else {
      onChange('');
    }
  };

  // Format date for display (DD.MM.YYYY HH:MM)
  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={className} ref={wrapperRef}>
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="flex items-center">
          <Input
            type="text"
            readOnly
            disabled={disabled}
            value={selectedDate ? formatDisplayDate(selectedDate) : ''}
            onClick={() => {
              if (disabled) return;
              setIsOpen(!isOpen);
            }}
            placeholder="DD.MM.YYYY HH:MM auswählen"
            className="pr-12 cursor-pointer"
          />
          <IconButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              setIsOpen(!isOpen);
            }}
            icon={<Calendar className="w-5 h-5" />}
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Kalender öffnen"
            title="Kalender öffnen"
            className="absolute right-3 text-muted-foreground hover:text-foreground"
          />
        </div>
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-2 shadow-2xl">
            <DatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="dd.MM.yyyy HH:mm"
              locale="de"
              inline
              minDate={minDate || new Date()}
              className="rounded-lg border border-border bg-card"
            />
          </div>
        )}
      </div>
    </div>
  );
}

