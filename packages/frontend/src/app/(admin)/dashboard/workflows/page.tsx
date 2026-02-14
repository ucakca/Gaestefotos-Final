'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Workflow,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Save,
  X,
  Camera,
  Sparkles,
  Image as ImageIcon,
  MessageSquare,
  Timer,
  Star,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';

interface BoothWorkflow {
  id: string;
  name: string;
  description: string | null;
  steps: WorkflowStep[];
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface WorkflowStep {
  id: string;
  type: string;
  label: string;
  duration?: number;
  config?: Record<string, any>;
}

const STEP_TYPES = [
  { value: 'WELCOME', label: 'Begrüßung', icon: MessageSquare, color: 'text-blue-500' },
  { value: 'COUNTDOWN', label: 'Countdown', icon: Timer, color: 'text-amber-500' },
  { value: 'CAPTURE', label: 'Foto aufnehmen', icon: Camera, color: 'text-emerald-500' },
  { value: 'PREVIEW', label: 'Vorschau', icon: ImageIcon, color: 'text-purple-500' },
  { value: 'FILTER', label: 'Filter/Effekt', icon: Sparkles, color: 'text-pink-500' },
  { value: 'GRAFFITI', label: 'Digital Graffiti', icon: Edit3, color: 'text-red-500' },
  { value: 'SHARE', label: 'Teilen/Drucken', icon: Star, color: 'text-indigo-500' },
  { value: 'THANK_YOU', label: 'Danke-Screen', icon: CheckCircle2, color: 'text-teal-500' },
];

let stepIdCounter = 0;
function newStepId() { return `step-${++stepIdCounter}-${Date.now()}`; }

export default function WorkflowsAdminPage() {
  const [workflows, setWorkflows] = useState<BoothWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([]);
  const [formPublic, setFormPublic] = useState(false);
  const [formDefault, setFormDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/workflows');
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormSteps([]);
    setFormPublic(false);
    setFormDefault(false);
    setEditingId(null);
    setShowEditor(false);
  };

  const startEdit = (w: BoothWorkflow) => {
    setFormName(w.name);
    setFormDesc(w.description || '');
    setFormSteps(w.steps || []);
    setFormPublic(w.isPublic);
    setFormDefault(w.isDefault);
    setEditingId(w.id);
    setShowEditor(true);
  };

  const addStep = (type: string) => {
    const info = STEP_TYPES.find(s => s.value === type);
    setFormSteps(prev => [...prev, {
      id: newStepId(),
      type,
      label: info?.label || type,
      duration: type === 'COUNTDOWN' ? 3 : undefined,
    }]);
  };

  const removeStep = (idx: number) => {
    setFormSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    setFormSteps(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const updateStepLabel = (idx: number, label: string) => {
    setFormSteps(prev => prev.map((s, i) => i === idx ? { ...s, label } : s));
  };

  const updateStepDuration = (idx: number, duration: number) => {
    setFormSteps(prev => prev.map((s, i) => i === idx ? { ...s, duration } : s));
  };

  const handleSave = async () => {
    if (!formName || formSteps.length === 0) return;
    try {
      setSaving(true);
      const payload = {
        name: formName,
        description: formDesc || null,
        steps: formSteps,
        isPublic: formPublic,
        isDefault: formDefault,
      };

      if (editingId) {
        await api.put(`/workflows/${editingId}`, payload);
      } else {
        await api.post('/workflows', payload);
      }
      resetForm();
      loadWorkflows();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Workflow wirklich löschen?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      loadWorkflows();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Workflow className="w-5 h-5" /> Workflow Builder
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Booth-Abläufe definieren — nur für Admins</p>
            </div>
            <Button onClick={() => { resetForm(); setShowEditor(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Neuer Workflow
            </Button>
          </div>

          {/* Editor */}
          {showEditor && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{editingId ? 'Workflow bearbeiten' : 'Neuer Workflow'}</h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="z.B. Standard Photo Booth" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Beschreibung</label>
                  <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Kurze Beschreibung" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                </div>
              </div>

              {/* Step palette */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Step hinzufügen</label>
                <div className="flex flex-wrap gap-2">
                  {STEP_TYPES.map(st => (
                    <button key={st.value} onClick={() => addStep(st.value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-app-hover transition-colors">
                      <st.icon className={`w-3.5 h-3.5 ${st.color}`} />
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps list */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Ablauf ({formSteps.length} Steps)</label>
                {formSteps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    Klicke oben auf einen Step-Typ um ihn hinzuzufügen
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formSteps.map((step, idx) => {
                      const info = STEP_TYPES.find(s => s.value === step.type);
                      const StepIcon = info?.icon || Workflow;
                      return (
                        <div key={step.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                          <span className="text-xs text-muted-foreground font-mono w-6">{idx + 1}</span>
                          <StepIcon className={`w-4 h-4 ${info?.color || 'text-muted-foreground'} flex-shrink-0`} />
                          <input
                            type="text"
                            value={step.label}
                            onChange={(e) => updateStepLabel(idx, e.target.value)}
                            className="flex-1 px-2 py-1 rounded border border-border bg-transparent text-sm text-foreground"
                          />
                          {(step.type === 'COUNTDOWN' || step.type === 'PREVIEW' || step.type === 'WELCOME' || step.type === 'THANK_YOU') && (
                            <div className="flex items-center gap-1">
                              <Timer className="w-3 h-3 text-muted-foreground" />
                              <input
                                type="number"
                                min={1}
                                max={30}
                                value={step.duration || 3}
                                onChange={(e) => updateStepDuration(idx, parseInt(e.target.value) || 3)}
                                className="w-12 px-1 py-1 rounded border border-border bg-transparent text-xs text-foreground text-center"
                              />
                              <span className="text-xs text-muted-foreground">s</span>
                            </div>
                          )}
                          <div className="flex gap-0.5">
                            <button onClick={() => moveStep(idx, -1)} disabled={idx === 0}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => moveStep(idx, 1)} disabled={idx === formSteps.length - 1}
                              className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => removeStep(idx)}
                              className="p-1 rounded text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={formPublic} onChange={(e) => setFormPublic(e.target.checked)} className="rounded" />
                  Öffentlich
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={formDefault} onChange={(e) => setFormDefault(e.target.checked)} className="rounded" />
                  Standard-Workflow
                </label>
                <div className="flex-1" />
                <Button onClick={handleSave} disabled={saving || !formName || formSteps.length === 0}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? 'Speichern' : 'Erstellen'}
                </Button>
              </div>
            </div>
          )}

          {/* Workflow list */}
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : workflows.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <Workflow className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Keine Workflows erstellt</p>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((w) => (
                <div key={w.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{w.name}</span>
                        {w.isDefault && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Standard</span>}
                        {w.isPublic && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Öffentlich</span>}
                      </div>
                      {w.description && <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(w)} className="p-1.5 rounded-lg hover:bg-app-hover text-muted-foreground">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Step flow visualization */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1">
                    {(w.steps || []).map((step, idx) => {
                      const info = STEP_TYPES.find(s => s.value === step.type);
                      const StepIcon = info?.icon || Workflow;
                      return (
                        <div key={idx} className="flex items-center gap-1 flex-shrink-0">
                          {idx > 0 && <div className="w-4 h-px bg-app-border" />}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-app-hover text-xs">
                            <StepIcon className={`w-3 h-3 ${info?.color || ''}`} />
                            <span className="text-foreground">{step.label}</span>
                            {step.duration && <span className="text-muted-foreground">{step.duration}s</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
