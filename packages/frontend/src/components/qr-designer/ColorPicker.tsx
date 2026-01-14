'use client';

import { QRDesignColors } from '@gaestefotos/shared';

interface ColorPickerProps {
  colors: QRDesignColors;
  onChange: (colors: QRDesignColors) => void;
}

export function ColorPicker({ colors, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium">Farben</label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-2">QR-Code</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colors.foreground}
              onChange={(e) => onChange({ ...colors, foreground: e.target.value })}
              className="w-12 h-12 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={colors.foreground}
              onChange={(e) => onChange({ ...colors, foreground: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-rose"
              placeholder="#000000"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-2">Hintergrund</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colors.background}
              onChange={(e) => onChange({ ...colors, background: e.target.value })}
              className="w-12 h-12 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={colors.background}
              onChange={(e) => onChange({ ...colors, background: e.target.value })}
              className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-rose"
              placeholder="#FFFFFF"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-2">Rahmen (optional)</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colors.frame || '#000000'}
              onChange={(e) => onChange({ ...colors, frame: e.target.value })}
              className="w-12 h-12 rounded border cursor-pointer"
            />
            <input
              type="text"
              value={colors.frame || ''}
              onChange={(e) => onChange({ ...colors, frame: e.target.value || undefined })}
              className="flex-1 px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-rose"
              placeholder="#000000"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
