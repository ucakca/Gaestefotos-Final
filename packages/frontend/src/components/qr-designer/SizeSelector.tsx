'use client';

import { QRSizePreset } from '@gaestefotos/shared';

interface SizeSelectorProps {
  selected: QRSizePreset;
  onChange: (sizePreset: QRSizePreset) => void;
}

const SIZE_OPTIONS: { value: QRSizePreset; label: string; description: string }[] = [
  { value: 'table', label: 'Tischaufsteller', description: 'A6 (105×148 mm)' },
  { value: 'a6', label: 'A6', description: '105×148 mm' },
  { value: 'a5', label: 'A5', description: '148×210 mm' },
  { value: 'a4', label: 'A4', description: '210×297 mm' },
  { value: 'square', label: 'Quadrat', description: '20×20 cm' },
  { value: 'poster', label: 'Poster', description: '30×40 cm' },
];

export function SizeSelector({ selected, onChange }: SizeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-3">Größe</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SIZE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`p-3 rounded-lg border transition-colors text-left ${
              selected === option.value
                ? 'border-rose bg-rose/5'
                : 'border-border hover:border-rose/30'
            }`}
          >
            <div className="font-medium text-sm">{option.label}</div>
            <div className="text-xs text-muted-foreground">{option.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
