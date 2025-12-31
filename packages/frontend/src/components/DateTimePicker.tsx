'use client';

import { useState, useRef, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { de } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar } from 'lucide-react';

registerLocale('de', de);

interface DateTimePickerProps {
  value: string; // ISO string format
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  className = '',
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
        <label className="block text-sm font-medium mb-2 text-tokens-brandGreen">
          {label}
          {required && <span className="text-[var(--status-danger)] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <div className="flex items-center">
          <input
            type="text"
            readOnly
            value={selectedDate ? formatDisplayDate(selectedDate) : ''}
            onClick={() => setIsOpen(!isOpen)}
            placeholder="DD.MM.YYYY HH:MM auswählen"
            className="w-full px-4 py-3 pr-12 border border-app-border rounded-lg focus:ring-2 focus:outline-none focus:ring-app-fg/30 focus:border-transparent transition-all cursor-pointer text-app-fg bg-app-card"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="absolute right-3 text-tokens-brandGreen hover:opacity-80 focus:outline-none"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
        {isOpen && (
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
              minDate={new Date()}
              className="border border-app-border rounded-lg bg-app-card"
            />
          </div>
        )}
      </div>
    </div>
  );
}

