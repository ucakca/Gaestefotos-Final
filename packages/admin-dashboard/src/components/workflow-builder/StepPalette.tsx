'use client';

import { useState } from 'react';
import {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor, GripVertical,
  Upload, Clock, MousePointerClick, Flag,
  GitBranch, ListTree, Repeat, GitFork,
  Shuffle, Eraser, Palette, Zap, Filter,
} from 'lucide-react';
import { STEP_CATEGORIES, STEP_TYPES, EXECUTABLE_STEP_TYPES, type StepTypeDefinition } from './types';

const ICON_MAP: Record<string, any> = {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor,
  Upload, Clock, MousePointerClick, Flag,
  GitBranch, ListTree, Repeat, GitFork,
  Shuffle, Eraser, Palette,
};

const CATEGORY_STYLE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  trigger: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  logic: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  animation: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  feature: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  ai: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  cloud: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  hardware: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

interface StepPaletteProps {
  onAddStep: (stepType: StepTypeDefinition) => void;
}

export default function StepPalette({ onAddStep }: StepPaletteProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'server' | 'booth'>('all');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Step-Palette</h3>
        <div className="flex gap-1">
          {(['all', 'server', 'booth'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${filterMode === mode ? 'bg-blue-500 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted/80'}`}
            >
              {mode === 'all' ? 'Alle' : mode === 'server' ? '⚡ Server' : '🖥️ Booth'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-1 flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> = Server-Automation</span>
        <span className="flex items-center gap-1"><span className="text-muted-foreground/50">🖥️</span> = Booth-App</span>
      </div>

      {STEP_CATEGORIES.map((cat) => {
        let steps = STEP_TYPES.filter(s => s.category === cat.key);
        if (filterMode === 'server') steps = steps.filter(s => EXECUTABLE_STEP_TYPES.has(s.type));
        if (filterMode === 'booth') steps = steps.filter(s => !EXECUTABLE_STEP_TYPES.has(s.type));
        if (steps.length === 0) return null;

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
                const isServerSide = EXECUTABLE_STEP_TYPES.has(step.type);
                return (
                  <button
                    key={step.type}
                    onClick={() => onAddStep(step)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/workflow-step', JSON.stringify(step));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all hover:shadow-sm active:scale-[0.98] ${style.bg} ${style.border} ${style.text}`}
                  >
                    <GripVertical className="w-3 h-3 opacity-30 flex-shrink-0" />
                    <IconComp className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium truncate text-xs flex-1">{step.label.replace(/^⚡\s*/, '')}</span>
                    {isServerSide && (
                      <Zap className="w-3 h-3 text-amber-500 flex-shrink-0 opacity-80" />
                    )}
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
