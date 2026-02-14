'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor, Settings,
  Upload, Clock, MousePointerClick, Flag,
  GitBranch, ListTree, Repeat, GitFork,
  Shuffle, Eraser, Palette,
} from 'lucide-react';
import type { WorkflowNodeData } from './types';

const ICON_MAP: Record<string, any> = {
  Hand, Sparkles, Timer, Heart, PartyPopper,
  Lightbulb, Camera, LayoutGrid, Gamepad2, Pen,
  Wand2, MessageSquare, Mail, QrCode, ScanFace,
  Printer, Monitor, Settings,
  Upload, Clock, MousePointerClick, Flag,
  GitBranch, ListTree, Repeat, GitFork,
  Shuffle, Eraser, Palette,
};

const CATEGORY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  trigger: { label: 'TRIGGER', bg: 'bg-rose-500', text: 'text-white' },
  logic: { label: 'LOGIK', bg: 'bg-cyan-500', text: 'text-white' },
  animation: { label: 'ANIMATION', bg: 'bg-orange-500', text: 'text-white' },
  feature: { label: 'FEATURE', bg: 'bg-amber-500', text: 'text-white' },
  ai: { label: 'KI / AI', bg: 'bg-violet-500', text: 'text-white' },
  cloud: { label: 'CLOUD', bg: 'bg-blue-500', text: 'text-white' },
  hardware: { label: 'HARDWARE', bg: 'bg-emerald-500', text: 'text-white' },
};

const CATEGORY_COLORS: Record<string, { border: string; headerBg: string; dot: string }> = {
  trigger: { border: 'border-rose-300', headerBg: 'bg-rose-500', dot: 'bg-rose-500' },
  logic: { border: 'border-cyan-300', headerBg: 'bg-cyan-500', dot: 'bg-cyan-500' },
  animation: { border: 'border-orange-300', headerBg: 'bg-orange-500', dot: 'bg-orange-500' },
  feature: { border: 'border-amber-300', headerBg: 'bg-amber-500', dot: 'bg-amber-500' },
  ai: { border: 'border-violet-300', headerBg: 'bg-violet-500', dot: 'bg-violet-500' },
  cloud: { border: 'border-blue-300', headerBg: 'bg-blue-500', dot: 'bg-blue-500' },
  hardware: { border: 'border-emerald-300', headerBg: 'bg-emerald-500', dot: 'bg-emerald-500' },
};

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const IconComp = ICON_MAP[nodeData.icon] || Settings;
  const badge = CATEGORY_BADGE[nodeData.category] || CATEGORY_BADGE.feature;
  const colors = CATEGORY_COLORS[nodeData.category] || CATEGORY_COLORS.feature;
  const outputs = nodeData.outputs || [{ id: 'default', label: '', type: 'default' }];

  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-md min-w-[180px] max-w-[220px] transition-shadow ${
        selected ? 'shadow-lg ring-2 ring-blue-400' : ''
      } ${colors.border}`}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />

      {/* Header with category badge and close */}
      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-t-md ${colors.headerBg}`}>
        <span className={`text-[10px] font-bold tracking-wider ${badge.text}`}>
          {badge.label}
        </span>
        <button className={`text-white/70 hover:text-white text-xs font-bold leading-none`}>
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded flex items-center justify-center ${colors.dot}`}>
            <IconComp className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-800 truncate">
            {nodeData.label}
          </span>
          <button className="ml-auto text-gray-400 hover:text-gray-600">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step number & config hint */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">
            {nodeData.stepNumber}. {nodeData.config?.animation || nodeData.config?.mode || nodeData.config?.captureMode || ''}
          </span>
          <span className="text-[10px] text-gray-400">⚙</span>
        </div>
      </div>

      {/* Output handles */}
      {outputs.map((output, idx) => {
        const handleColor = output.type === 'skip' ? '!bg-yellow-400'
          : output.type === 'retake' ? '!bg-red-400'
          : output.type === 'conditional' ? '!bg-purple-400'
          : '!bg-gray-400';

        return (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            className={`!w-3 !h-3 ${handleColor} !border-2 !border-white`}
            style={{
              top: outputs.length === 1 ? '50%' : `${30 + (idx * 40)}%`,
            }}
          />
        );
      })}

      {/* Output labels for multi-output nodes */}
      {outputs.length > 1 && (
        <div className="px-3 pb-2 space-y-0.5">
          {outputs.map((output) => {
            const dotColor = output.type === 'skip' ? 'bg-yellow-400'
              : output.type === 'retake' ? 'bg-red-400'
              : 'bg-gray-400';
            return (
              <div key={output.id} className="flex items-center gap-1.5 justify-end">
                <span className="text-[9px] text-gray-500">{output.label}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(WorkflowNodeComponent);
