'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Layout,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Save,
  X,
  Camera,
  Sparkles,
  Grid3X3,
} from 'lucide-react';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/Button';

interface BoothTemplate {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  config: any;
  thumbnailPath: string | null;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
}

const TEMPLATE_TYPES = [
  { value: 'PHOTO_BOOTH', label: 'Photo Booth', icon: Camera },
  { value: 'KI_BOOTH', label: 'KI Booth', icon: Sparkles },
  { value: 'MOSAIC_WALL', label: 'Mosaic Wall', icon: Grid3X3 },
];

const CATEGORIES = ['Hochzeit', 'Geburtstag', 'Firmen-Event', 'Party', 'Messe', 'Festival'];

export default function TemplatesAdminPage() {
  const [templates, setTemplates] = useState<BoothTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formType, setFormType] = useState('PHOTO_BOOTH');
  const [formCategory, setFormCategory] = useState('');
  const [formConfig, setFormConfig] = useState('{}');
  const [formPublic, setFormPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/booth-templates', { params });
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const resetForm = () => {
    setFormName('');
    setFormDesc('');
    setFormType('PHOTO_BOOTH');
    setFormCategory('');
    setFormConfig('{}');
    setFormPublic(true);
    setEditingId(null);
    setShowCreate(false);
  };

  const startEdit = (t: BoothTemplate) => {
    setFormName(t.name);
    setFormDesc(t.description || '');
    setFormType(t.type);
    setFormCategory(t.category || '');
    setFormConfig(JSON.stringify(t.config, null, 2));
    setFormPublic(t.isPublic);
    setEditingId(t.id);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!formName || !formType) return;
    let config: any;
    try {
      config = JSON.parse(formConfig);
    } catch {
      alert('Config ist kein gültiges JSON');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formName,
        description: formDesc || null,
        type: formType,
        category: formCategory || null,
        config,
        isPublic: formPublic,
      };

      if (editingId) {
        await api.put(`/booth-templates/${editingId}`, payload);
      } else {
        await api.post('/booth-templates', payload);
      }

      resetForm();
      loadTemplates();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Template wirklich löschen?')) return;
    try {
      await api.delete(`/booth-templates/${id}`);
      loadTemplates();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Layout className="w-5 h-5" /> Booth Templates
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Design-Vorlagen für Photo Booth, KI Booth und Mosaic Wall</p>
            </div>
            <Button onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Template erstellen
            </Button>
          </div>

          {/* Create/Edit Form */}
          {showCreate && (
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{editingId ? 'Template bearbeiten' : 'Neues Template'}</h3>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="z.B. Elegante Hochzeit" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Typ *</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                    {TEMPLATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Kategorie</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm">
                    <option value="">Keine</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Beschreibung</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Kurze Beschreibung des Templates" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Config (JSON) *</label>
                <textarea value={formConfig} onChange={(e) => setFormConfig(e.target.value)} rows={6}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-mono" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={formPublic} onChange={(e) => setFormPublic(e.target.checked)} className="rounded" />
                  Öffentlich sichtbar
                </label>
                <div className="flex-1" />
                <Button onClick={handleSave} disabled={saving || !formName}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingId ? 'Speichern' : 'Erstellen'}
                </Button>
              </div>
            </div>
          )}

          {/* Type filter */}
          <div className="flex gap-2">
            <button onClick={() => setTypeFilter('')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!typeFilter ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border'}`}>
              Alle
            </button>
            {TEMPLATE_TYPES.map(t => (
              <button key={t.value} onClick={() => setTypeFilter(t.value === typeFilter ? '' : t.value)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${typeFilter === t.value ? 'bg-primary text-white border-primary' : 'bg-card text-muted-foreground border-border'}`}>
                <t.icon className="w-3 h-3" /> {t.label}
              </button>
            ))}
          </div>

          {/* Templates list */}
          {loading ? (
            <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <Layout className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Keine Templates gefunden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((t) => {
                const typeInfo = TEMPLATE_TYPES.find(tt => tt.value === t.type);
                const TypeIcon = typeInfo?.icon || Layout;
                return (
                  <div key={t.id} className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                            <TypeIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">{t.name}</div>
                            <div className="text-xs text-muted-foreground">{typeInfo?.label || t.type}</div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(t)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/80">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                      <div className="flex items-center gap-2 text-xs">
                        {t.category && <span className="px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{t.category}</span>}
                        <span className={`px-2 py-0.5 rounded-full ${t.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {t.isPublic ? 'Öffentlich' : 'Privat'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
