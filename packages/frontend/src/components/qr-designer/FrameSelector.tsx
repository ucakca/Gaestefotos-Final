'use client';

import { QRFrameStyle } from '@gaestefotos/shared';

interface FrameSelectorProps {
  selected: QRFrameStyle;
  onChange: (frameStyle: QRFrameStyle) => void;
}

const FRAME_OPTIONS: { value: QRFrameStyle; label: string }[] = [
  { value: 'none', label: 'Kein Rahmen' },
  { value: 'rounded', label: 'Abgerundet' },
  { value: 'ornate', label: 'Verziert' },
  { value: 'floral', label: 'Floral' },
  { value: 'geometric', label: 'Geometrisch' },
];

export function FrameSelector({ selected, onChange }: FrameSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-3">Rahmen-Stil</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FRAME_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
              selected === option.value
                ? 'border-rose bg-rose text-white'
                : 'border-border hover:border-rose/50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
