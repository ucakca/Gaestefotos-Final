'use client';

import { useState, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2,
  Zap, GitBranch, Play, GripVertical, Power, PowerOff,
  Upload, Clock, Flag, FlagOff, UserPlus,
  Tags, Wand2, Eraser, ShieldCheck, Tag, FolderInput,
  Mail, Bell, Webhook, Printer, Timer,
} from 'lucide-react';
import {
  AUTOMATION_TRIGGERS,
  AUTOMATION_CONDITIONS,
  AUTOMATION_ACTIONS,
  getAutomationStepDef,
  type AutomationStep,
  type AutomationStepDef,
  type AutomationPipeline,
} from './automationTypes';
import { AUTOMATION_PRESETS, type AutomationPresetDef } from './AutomationPresets';
import toast from 'react-hot-toast';

// ─── Icon Map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  Upload, Clock, Flag, FlagOff, UserPlus,
  GitBranch, Tags, Wand2, Eraser, ShieldCheck,
  Tag, FolderInput, Mail, Bell, Webhook, Printer, Timer,
  Zap, Play, Power, PowerOff,
};

function StepIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] || Zap;
  return <Icon className={className || 'w-4 h-4'} />;
}

// ─── Step Selector Modal ────────────────────────────────────────────────────

function StepSelector({ group, onSelect, onClose }: {
  group: 'trigger' | 'condition' | 'action';
  onSelect: (def: AutomationStepDef) => void;
  onClose: () => void;
}) {
  const steps = group === 'trigger' ? AUTOMATION_TRIGGERS
    : group === 'condition' ? AUTOMATION_CONDITIONS
    : AUTOMATION_ACTIONS;

  const title = group === 'trigger' ? 'Trigger wählen'
    : group === 'condition' ? 'Bedingung hinzufügen'
    : 'Aktion hinzufügen';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="p-2 overflow-y-auto max-h-[55vh]">
          {steps.map(step => (
            <button
              key={step.type}
              onClick={() => { onSelect(step); onClose(); }}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg ${step.bgColor}`}>
                <StepIcon name={step.icon} className={`w-4 h-4 ${step.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{step.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{step.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Config Field Renderer ──────────────────────────────────────────────────

function ConfigFieldInput({ field, value, onChange }: {
  field: AutomationStepDef['configFields'][0];
  value: any;
  onChange: (val: any) => void;
}) {
  switch (field.type) {
    case 'text':
    case 'textarea':
      return field.type === 'textarea' ? (
        <textarea
          value={value ?? field.defaultValue ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-background focus:ring-1 focus:ring-primary/50 resize-none"
          rows={2}
        />
      ) : (
        <input
          type="text"
          value={value ?? field.defaultValue ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-background focus:ring-1 focus:ring-primary/50"
        />
      );
    case 'number':
      return (
        <input
          type="number"
          value={value ?? field.defaultValue ?? 0}
          onChange={e => onChange(Number(e.target.value))}
          min={field.min}
          max={field.max}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-background focus:ring-1 focus:ring-primary/50"
        />
      );
    case 'select':
      return (
        <select
          value={value ?? field.defaultValue ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 text-xs rounded-md border border-border bg-background focus:ring-1 focus:ring-primary/50"
        >
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    case 'toggle':
      return (
        <button
          type="button"
          onClick={() => onChange(!(value ?? field.defaultValue ?? false))}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            (value ?? field.defaultValue ?? false) ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            (value ?? field.defaultValue ?? false) ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      );
    default:
      return null;
  }
}

// ─── Step Card ──────────────────────────────────────────────────────────────

function StepCard({ step, stepDef, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  step: AutomationStep;
  stepDef: AutomationStepDef | undefined;
  index: number;
  total: number;
  onUpdate: (config: Record<string, any>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!stepDef) return null;

  return (
    <div className="relative">
      {/* Connector line */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-border" />
      )}

      <div className={`border border-border/60 rounded-xl overflow-hidden transition-shadow hover:shadow-sm ${expanded ? 'shadow-sm' : ''}`}>
        {/* Header */}
        <div
          className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${stepDef.bgColor}`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-1 text-muted-foreground/40">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          <StepIcon name={stepDef.icon} className={`w-4 h-4 ${stepDef.color}`} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{stepDef.label}</span>
            {!expanded && stepDef.configFields.length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {Object.entries(step.config)
                  .filter(([, v]) => v !== '' && v !== undefined)
                  .slice(0, 2)
                  .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? '✓' : '✗') : v}`)
                  .join(' · ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {index > 0 && (
              <button onClick={e => { e.stopPropagation(); onMoveUp(); }} className="p-1 rounded hover:bg-black/10 transition-colors">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}
            {index < total - 1 && (
              <button onClick={e => { e.stopPropagation(); onMoveDown(); }} className="p-1 rounded hover:bg-black/10 transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Config Fields */}
        {expanded && stepDef.configFields.length > 0 && (
          <div className="px-4 py-3 space-y-3 bg-card border-t border-border/30">
            {stepDef.configFields.map(field => (
              <div key={field.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <ConfigFieldInput
                  field={field}
                  value={step.config[field.key]}
                  onChange={val => onUpdate({ ...step.config, [field.key]: val })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preset Card ────────────────────────────────────────────────────────────

function PresetCard({ preset, onSelect }: { preset: AutomationPresetDef; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="flex items-start gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-muted/20 transition-all text-left"
    >
      <div className={`p-2 rounded-lg bg-muted/30`}>
        <StepIcon name={preset.icon} className={`w-5 h-5 ${preset.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{preset.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
      </div>
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface AutomationBuilderProps {
  onSave: (pipeline: AutomationPipeline) => Promise<void>;
  existingPipeline?: AutomationPipeline | null;
}

export default function AutomationBuilder({ onSave, existingPipeline }: AutomationBuilderProps) {
  const [name, setName] = useState(existingPipeline?.name || '');
  const [description, setDescription] = useState(existingPipeline?.description || '');
  const [trigger, setTrigger] = useState<AutomationStep | null>(existingPipeline?.trigger || null);
  const [steps, setSteps] = useState<AutomationStep[]>(existingPipeline?.steps || []);
  const [isActive, setIsActive] = useState(existingPipeline?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<'trigger' | 'condition' | 'action' | null>(null);
  const [showPresets, setShowPresets] = useState(!existingPipeline && steps.length === 0);

  const addStep = useCallback((def: AutomationStepDef) => {
    const newStep: AutomationStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: def.type,
      config: { ...def.defaultConfig },
    };

    if (def.group === 'trigger') {
      setTrigger(newStep);
    } else {
      setSteps(prev => [...prev, newStep]);
    }
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateStepConfig = useCallback((index: number, config: Record<string, any>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, config } : s));
  }, []);

  const moveStep = useCallback((index: number, direction: 'up' | 'down') => {
    setSteps(prev => {
      const arr = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return prev;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr;
    });
  }, []);

  const loadPreset = useCallback((preset: AutomationPresetDef) => {
    setName(preset.pipeline.name);
    setDescription(preset.pipeline.description);
    setTrigger(preset.pipeline.trigger);
    setSteps(preset.pipeline.steps);
    setIsActive(true);
    setShowPresets(false);
    toast.success(`Vorlage "${preset.name}" geladen`);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) { toast.error('Name ist erforderlich'); return; }
    if (!trigger) { toast.error('Ein Trigger ist erforderlich'); return; }
    if (steps.length === 0) { toast.error('Mindestens eine Aktion hinzufügen'); return; }

    setSaving(true);
    try {
      await onSave({
        id: existingPipeline?.id,
        name: name.trim(),
        description: description.trim(),
        trigger,
        steps,
        isActive,
      });
      toast.success('Automation gespeichert');
    } catch (err: any) {
      toast.error(err.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }, [name, description, trigger, steps, isActive, existingPipeline, onSave]);

  const triggerDef = trigger ? getAutomationStepDef(trigger.type) : null;

  // ── Presets View ──
  if (showPresets) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Neue Automation erstellen</h2>
          <p className="text-sm text-muted-foreground mt-1">Wähle eine Vorlage oder starte von Null</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {AUTOMATION_PRESETS.map(preset => (
            <PresetCard key={preset.id} preset={preset} onSelect={() => loadPreset(preset)} />
          ))}
        </div>

        <button
          onClick={() => setShowPresets(false)}
          className="w-full py-3 text-sm font-medium text-muted-foreground border border-dashed border-border rounded-xl hover:border-primary/40 hover:text-foreground transition-all"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Leere Automation erstellen
        </button>
      </div>
    );
  }

  // ── Builder View ──
  return (
    <div className="space-y-6">
      {/* Name + Description */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="z.B. Standard Upload-Pipeline"
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Beschreibung</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Trigger */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trigger — Wann wird ausgelöst?</h3>
        {trigger && triggerDef ? (
          <StepCard
            step={trigger}
            stepDef={triggerDef}
            index={0}
            total={1}
            onUpdate={config => setTrigger({ ...trigger, config })}
            onRemove={() => setTrigger(null)}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
          />
        ) : (
          <button
            onClick={() => setSelectorOpen('trigger')}
            className="w-full py-4 text-sm font-medium text-rose-600 border-2 border-dashed border-rose-200 rounded-xl hover:border-rose-400 hover:bg-rose-50/50 transition-all"
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Trigger wählen
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Aktionen — Was soll passieren? ({steps.length})
        </h3>
        <div className="space-y-2">
          {steps.map((step, i) => {
            const def = getAutomationStepDef(step.type);
            return (
              <StepCard
                key={step.id}
                step={step}
                stepDef={def}
                index={i}
                total={steps.length}
                onUpdate={config => updateStepConfig(i, config)}
                onRemove={() => removeStep(i)}
                onMoveUp={() => moveStep(i, 'up')}
                onMoveDown={() => moveStep(i, 'down')}
              />
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectorOpen('action')}
            className="flex-1 py-3 text-sm font-medium text-primary border-2 border-dashed border-primary/30 rounded-xl hover:border-primary/60 hover:bg-primary/5 transition-all"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Aktion hinzufügen
          </button>
          <button
            onClick={() => setSelectorOpen('condition')}
            className="py-3 px-4 text-sm font-medium text-cyan-600 border-2 border-dashed border-cyan-200 rounded-xl hover:border-cyan-400 hover:bg-cyan-50/50 transition-all"
          >
            <GitBranch className="w-4 h-4 inline mr-1" /> Bedingung
          </button>
        </div>
      </div>

      {/* Active Toggle + Save */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isActive
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {isActive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
          {isActive ? 'Aktiv' : 'Deaktiviert'}
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setShowPresets(true)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Vorlagen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </button>
        </div>
      </div>

      {/* Step Selector Modal */}
      {selectorOpen && (
        <StepSelector
          group={selectorOpen}
          onSelect={addStep}
          onClose={() => setSelectorOpen(null)}
        />
      )}
    </div>
  );
}
