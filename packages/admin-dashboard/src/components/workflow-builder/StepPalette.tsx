'use client';

import {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor, GripVertical,
} from 'lucide-react';
import { STEP_CATEGORIES, STEP_TYPES, type StepTypeDefinition } from './types';

const ICON_MAP: Record<string, any> = {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor,
};

const CATEGORY_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  animation: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  feature: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  cloud: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  hardware: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

interface StepPaletteProps {
  onAddStep: (stepType: StepTypeDefinition) => void;
}

export default function StepPalette({ onAddStep }: StepPaletteProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Step-Palette</h3>
      {STEP_CATEGORIES.map((cat) => {
        const steps = STEP_TYPES.filter(s => s.category === cat.key);
        const style = CATEGORY_STYLE[cat.key];
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-2 mb-1.5 px-1">
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
              <span className={`text-[11px] font-bold uppercase tracking-wider ${style.text}`}>
                {cat.label}
              </span>
            </div>
            <div className="space-y-1">
              {steps.map((step) => {
                const IconComp = ICON_MAP[step.icon] || Camera;
                return (
                  <button
                    key={step.type}
                    onClick={() => onAddStep(step)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/workflow-step', JSON.stringify(step));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left text-sm transition-all hover:shadow-sm active:scale-[0.98] ${style.bg} ${style.border} ${style.text}`}
                  >
                    <GripVertical className="w-3 h-3 opacity-30 flex-shrink-0" />
                    <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium truncate text-xs">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
