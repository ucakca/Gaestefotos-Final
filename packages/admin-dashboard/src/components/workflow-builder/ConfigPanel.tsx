'use client';

import { X, Settings, Trash2 } from 'lucide-react';
import type { WorkflowNodeData, ConfigField } from './types';
import { getStepType } from './types';

interface ConfigPanelProps {
  nodeId: string;
  data: WorkflowNodeData;
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onUpdateLabel: (nodeId: string, label: string) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export default function ConfigPanel({ nodeId, data, onUpdate, onUpdateLabel, onDelete, onClose }: ConfigPanelProps) {
  const stepDef = getStepType(data.type);
  const fields = stepDef?.configFields || [];

  const handleChange = (key: string, value: any) => {
    onUpdate(nodeId, { ...data.config, [key]: value });
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground/80">Node Config</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted/80 text-muted-foreground/70">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Label</label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => onUpdateLabel(nodeId, e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
          />
        </div>

        {/* Type badge */}
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Typ</label>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${data.bgColor} ${data.color}`}>
            {data.type.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border/50 pt-2">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Einstellungen</label>
        </div>

        {/* Config fields */}
        {fields.map((field) => (
          <ConfigFieldInput
            key={field.key}
            field={field}
            value={data.config?.[field.key] ?? field.defaultValue}
            onChange={(val) => handleChange(field.key, val)}
          />
        ))}

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground/70 italic">Keine konfigurierbaren Einstellungen für diesen Step.</p>
        )}
      </div>

      {/* Footer: Delete */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => onDelete(nodeId)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/15 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Node löschen
        </button>
      </div>
    </div>
  );
}

function ConfigFieldInput({ field, value, onChange }: { field: ConfigField; value: any; onChange: (val: any) => void }) {
  switch (field.type) {
    case 'text':
      return (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      );

    case 'number':
      return (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
          <input
            type="number"
            value={value ?? field.defaultValue ?? 0}
            min={field.min}
            max={field.max}
            step={field.max && field.max <= 1 ? 0.1 : 1}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 bg-card"
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
          <button
            onClick={() => onChange(!value)}
            className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-muted/60'}`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
      );

    case 'textarea':
      return (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
        </div>
      );

    case 'color':
      return (
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{field.label}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={value ?? '#ffffff'}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={value ?? '#ffffff'}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-border text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}
