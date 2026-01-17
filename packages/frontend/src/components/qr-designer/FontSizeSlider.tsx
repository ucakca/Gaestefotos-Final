'use client';

import { useState } from 'react';

interface FontSizeSliderProps {
  value: number;
  onChange: (size: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function FontSizeSlider({ 
  value, 
  onChange, 
  min = 12, 
  max = 96,
  label = 'Schriftgröße'
}: FontSizeSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-app-fg">{label}</label>
        <span className="text-sm text-app-fg-muted">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-app-border rounded-lg appearance-none cursor-pointer accent-app-accent"
      />
    </div>
  );
}
