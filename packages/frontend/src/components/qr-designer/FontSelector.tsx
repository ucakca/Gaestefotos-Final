'use client';

import { QRFont, QR_FONTS } from '@gaestefotos/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface FontSelectorProps {
  value: QRFont;
  onChange: (font: QRFont) => void;
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-app-fg">Schriftart</label>
      <Select value={value} onValueChange={(v) => onChange(v as QRFont)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(QR_FONTS).map(([key, font]) => (
            <SelectItem 
              key={key} 
              value={key}
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{font.name}</span>
                <span 
                  className="text-xs text-app-muted"
                  style={{ fontFamily: font.fontFamily }}
                >
                  Unsere Fotogalerie
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
