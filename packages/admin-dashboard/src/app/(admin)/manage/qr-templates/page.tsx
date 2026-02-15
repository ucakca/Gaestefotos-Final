'use client';

import { useState, useEffect } from 'react';
import {
  QrCode,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Star,
  Save,
  X,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import SvgImportTool from './SvgImportTool';

interface QrTemplate {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  isPremium: boolean;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  defaultBgColor: string;
  defaultTextColor: string;
  defaultAccentColor: string;
  svgA6?: string | null;
  svgA5?: string | null;
  svgStory?: string | null;
  svgSquare?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = [
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'ELEGANT', label: 'Elegant' },
  { value: 'NATURAL', label: 'Natur' },
  { value: 'FESTIVE', label: 'Festlich' },
  { value: 'MODERN', label: 'Modern' },
  { value: 'RUSTIC', label: 'Rustikal' },
];

const EMPTY_TEMPLATE: Partial<QrTemplate> = {
  slug: '',
  name: '',
  description: '',
  category: 'MINIMAL',
  isPremium: false,
  isPublic: true,
  isActive: true,
  sortOrder: 0,
  defaultBgColor: '#ffffff',
  defaultTextColor: '#1a1a1a',
  defaultAccentColor: '#E91E63',
  svgA6: null,
  svgA5: null,
  svgStory: null,
  svgSquare: null,
};

export default function QrTemplatesAdminPage() {
  const [templates, setTemplates] = useState<QrTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [editingTemplate, setEditingTemplate] = useState<Partial<QrTemplate> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showImportTool, setShowImportTool] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/qr-templates');
      setTemplates(res.data.templates || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplateDetails(slug: string) {
    try {
      const res = await api.get(`/admin/qr-templates/${slug}`);
      setEditingTemplate(res.data.template);
      setIsCreating(false);
    } catch (err: any) {
      toast.error('Fehler beim Laden des Templates');
    }
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    
    try {
      setSaving(true);
      const isNew = isCreating;
      
      if (isNew) {
        await api.post('/admin/qr-templates', editingTemplate);
      } else {
        await api.put(`/admin/qr-templates/${editingTemplate.slug}`, editingTemplate);
      }

      toast.success(isNew ? 'Template erstellt!' : 'Template gespeichert!');
      setEditingTemplate(null);
      setIsCreating(false);
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(slug: string) {
    if (!confirm(`Template "${slug}" wirklich löschen?`)) return;
    
    try {
      await api.delete(`/admin/qr-templates/${slug}`);
      toast.success('Template gelöscht!');
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Fehler beim Löschen');
    }
  }

  async function duplicateTemplate(slug: string) {
    try {
      await api.post(`/admin/qr-templates/${slug}/duplicate`);
      toast.success('Template dupliziert!');
      loadTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Fehler beim Duplizieren');
    }
  }

  async function toggleActive(template: QrTemplate) {
    try {
      await api.put(`/admin/qr-templates/${template.slug}`, { isActive: !template.isActive });
      toast.success(template.isActive ? 'Deaktiviert' : 'Aktiviert');
      loadTemplates();
    } catch (err: any) {
      toast.error('Fehler beim Ändern');
    }
  }

  function startCreate() {
    setEditingTemplate({ ...EMPTY_TEMPLATE });
    setIsCreating(true);
  }

  function handleFileUpload(format: 'svgA6' | 'svgA5' | 'svgStory' | 'svgSquare', file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setEditingTemplate(prev => prev ? { ...prev, [format]: content } : null);
    };
    reader.readAsText(file);
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/80 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted/80 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Edit/Create Modal
  if (editingTemplate) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isCreating ? 'Neues Template' : `Template bearbeiten: ${editingTemplate.name}`}
          </h1>
          <button
            onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Basic Info */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h2 className="font-semibold">Basis-Informationen</h2>
              
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Slug *</label>
                <input
                  type="text"
                  value={editingTemplate.slug || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : null)}
                  disabled={!isCreating}
                  className="w-full px-3 py-2 border border-border rounded-lg font-mono text-sm disabled:bg-muted"
                  placeholder="mein-template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Name *</label>
                <input
                  type="text"
                  value={editingTemplate.name || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  placeholder="Mein Template"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Beschreibung</label>
                <textarea
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                  rows={2}
                  placeholder="Kurze Beschreibung..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Kategorie</label>
                <select
                  value={editingTemplate.category || 'MINIMAL'}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Sortierung</label>
                <input
                  type="number"
                  value={editingTemplate.sortOrder || 0}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, sortOrder: parseInt(e.target.value) || 0 } : null)}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h2 className="font-semibold">Farben</h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Hintergrund</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingTemplate.defaultBgColor || '#ffffff'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultBgColor: e.target.value } : null)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingTemplate.defaultBgColor || '#ffffff'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultBgColor: e.target.value } : null)}
                      className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Text</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingTemplate.defaultTextColor || '#1a1a1a'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultTextColor: e.target.value } : null)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingTemplate.defaultTextColor || '#1a1a1a'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultTextColor: e.target.value } : null)}
                      className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">Akzent</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingTemplate.defaultAccentColor || '#E91E63'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultAccentColor: e.target.value } : null)}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingTemplate.defaultAccentColor || '#E91E63'}
                      onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, defaultAccentColor: e.target.value } : null)}
                      className="flex-1 px-2 py-1 border border-border rounded text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h2 className="font-semibold">Optionen</h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isActive ?? true}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Aktiv</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isPublic ?? true}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, isPublic: e.target.checked } : null)}
                    className="w-4 h-4 rounded"
                  />
                  <span>Öffentlich sichtbar</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.isPremium ?? false}
                    onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, isPremium: e.target.checked } : null)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning" /> Premium
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: SVG Uploads */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              <h2 className="font-semibold">SVG-Vorlagen</h2>
              <p className="text-sm text-muted-foreground">
                Lade SVG-Dateien für die verschiedenen Formate hoch. 
                Das QR-Code-Rechteck muss <code className="bg-muted px-1 rounded">id="gf:qr"</code> haben.
              </p>

              {(['svgA6', 'svgA5', 'svgStory', 'svgSquare'] as const).map(format => (
                <div key={format} className="border border-border/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {format === 'svgA6' && 'A6 (Hochformat)'}
                      {format === 'svgA5' && 'A5 (Hochformat)'}
                      {format === 'svgStory' && 'Story (9:16)'}
                      {format === 'svgSquare' && 'Quadrat (1:1)'}
                    </span>
                    {editingTemplate[format] && (
                      <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                        ✓ SVG geladen
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground/70" />
                      <span className="text-sm text-muted-foreground">SVG hochladen</span>
                      <input
                        type="file"
                        accept=".svg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(format, file);
                        }}
                      />
                    </label>
                    {editingTemplate[format] && (
                      <button
                        onClick={() => setEditingTemplate(prev => prev ? { ...prev, [format]: null } : null)}
                        className="px-3 py-2 text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {editingTemplate[format] && (
                    <div 
                      className="mt-2 aspect-[3/4] max-h-32 bg-muted/50 rounded border overflow-hidden"
                      style={{ backgroundColor: editingTemplate.defaultBgColor }}
                    >
                      <div 
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: editingTemplate[format] || '' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
            className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={saveTemplate}
            disabled={saving || !editingTemplate.slug || !editingTemplate.name}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white rounded-lg font-medium flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-pink-600" />
            QR-Code Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            {templates.length} Templates verwalten
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTemplates}
            className="p-2 hover:bg-muted rounded-lg"
          >
            <RefreshCw className="w-5 h-5 text-muted-foreground" />
          </button>
          <button
            onClick={() => setShowImportTool(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> SVG importieren
          </button>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Neues Template
          </button>
        </div>
      </div>

      {/* How-To Banner */}
      <div className="rounded-2xl border border-blue-500/20 bg-blue-50 p-5 space-y-4">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          So funktionieren QR-Templates
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            QR-Templates sind SVG-Vorlagen, die Hosts für ihre Event-QR-Codes verwenden können.
            Jedes Template besteht aus bis zu 4 Formaten: <strong>A6</strong> (Tischkarte), <strong>A5</strong> (Poster), <strong>Story</strong> (Instagram 9:16) und <strong>Quadrat</strong> (1:1).
          </p>
          <p><strong>Neues Template erstellen:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Klicke auf <strong>&quot;Neues Template&quot;</strong> oben rechts</li>
            <li>Vergib einen <strong>Slug</strong> (URL-freundlich, z.B. <code className="bg-blue-100 px-1 rounded text-xs">eleganz-gold</code>) und <strong>Namen</strong></li>
            <li>Wähle eine <strong>Kategorie</strong> und setze die <strong>Standard-Farben</strong></li>
            <li>Lade <strong>SVG-Dateien</strong> hoch — das QR-Code-Rechteck muss <code className="bg-blue-100 px-1 rounded text-xs">id=&quot;gf:qr&quot;</code> enthalten</li>
            <li>Setze <strong>Aktiv</strong> + <strong>Öffentlich</strong> damit Hosts das Template sehen</li>
          </ol>
        </div>

        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-blue-900 hover:text-blue-700 select-none flex items-center gap-1">
            <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
            SVG aus Canva / Figma erstellen — Schritt-für-Schritt
          </summary>
          <div className="mt-3 text-sm text-blue-800 space-y-4 pl-5 border-l-2 border-blue-200">
            <div>
              <p className="font-semibold mb-1">Option A: Canva</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Erstelle ein Design in der gewünschten Größe (A6: 105×148mm, A5: 148×210mm)</li>
                <li>Gestalte das Template — lasse einen <strong>freien Bereich</strong> für den QR-Code</li>
                <li>Exportiere als <strong>SVG</strong> (Download → Dateityp: SVG)</li>
                <li>Öffne die SVG in einem Texteditor</li>
                <li>Füge an der QR-Position ein Rechteck ein:<br />
                  <code className="bg-blue-100 px-2 py-1 rounded text-xs block mt-1 font-mono">
                    {'<rect id="gf:qr" x="50" y="200" width="200" height="200" fill="none" />'}
                  </code>
                </li>
                <li>Oder nutze den <strong>SVG-Import unten</strong> um den QR-Platzhalter visuell zu setzen</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1">Option B: Figma</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Erstelle ein Frame in der gewünschten Größe</li>
                <li>Platziere ein Rechteck wo der QR-Code hin soll</li>
                <li>Benenne es <code className="bg-blue-100 px-1 rounded text-xs">gf:qr</code> im Layers-Panel</li>
                <li>Exportiere als SVG — Figma setzt automatisch <code className="bg-blue-100 px-1 rounded text-xs">id=&quot;gf:qr&quot;</code></li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1">Option C: Beliebiges SVG + Import-Tool</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Exportiere dein Design als SVG aus jedem Tool</li>
                <li>Nutze den <strong>&quot;SVG importieren&quot;</strong>-Button unten</li>
                <li>Positioniere den QR-Platzhalter per Drag &amp; Drop</li>
                <li>Das Tool fügt automatisch <code className="bg-blue-100 px-1 rounded text-xs">id=&quot;gf:qr&quot;</code> ein</li>
              </ol>
            </div>
            <p className="text-blue-600 text-xs">
              <strong>Tipp:</strong> QR-Code-Bereich sollte quadratisch sein (gleiche Breite und Höhe) und mindestens 25% der kürzeren Seite einnehmen.
              Premium-Templates sind nur für zahlende Kunden verfügbar.
            </p>
          </div>
        </details>
      </div>

      {/* SVG Import Tool */}
      {showImportTool && (
        <SvgImportTool
          onClose={() => setShowImportTool(false)}
          onImport={(svgContent, format) => {
            setShowImportTool(false);
            const tpl: Partial<QrTemplate> = {
              ...EMPTY_TEMPLATE,
              [format]: svgContent,
            };
            setEditingTemplate(tpl);
            setIsCreating(true);
            toast.success(`SVG als ${format.replace('svg', '')} importiert — bitte Slug und Name vergeben`);
          }}
        />
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Keine Templates vorhanden. Erstelle ein neues Template.
          </div>
        ) : (
          templates.map(template => (
            <div 
              key={template.id} 
              className={`bg-card border rounded-xl overflow-hidden ${!template.isActive ? 'opacity-60' : ''}`}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Preview */}
                <div 
                  className="w-14 h-18 rounded border overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: template.defaultBgColor }}
                >
                  <img
                    src={`/api/qr-templates/${template.slug}/A6`}
                    alt={template.name}
                    className="w-full h-full object-contain"
                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{template.name}</span>
                    {template.isPremium && <Star className="w-4 h-4 text-warning fill-yellow-500" />}
                    {!template.isPublic && <EyeOff className="w-4 h-4 text-muted-foreground/70" />}
                    {!template.isActive && (
                      <span className="text-xs bg-muted/80 text-muted-foreground px-2 py-0.5 rounded">Inaktiv</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {CATEGORIES.find(c => c.value === template.category)?.label} · {template.slug}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: template.defaultBgColor }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: template.defaultTextColor }} />
                    <span className="w-4 h-4 rounded-full border" style={{ backgroundColor: template.defaultAccentColor }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(template)}
                    className="p-2 hover:bg-muted rounded-lg"
                    title={template.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {template.isActive ? <Eye className="w-4 h-4 text-success" /> : <EyeOff className="w-4 h-4 text-muted-foreground/70" />}
                  </button>
                  <button
                    onClick={() => duplicateTemplate(template.slug)}
                    className="p-2 hover:bg-muted rounded-lg"
                    title="Duplizieren"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => loadTemplateDetails(template.slug)}
                    className="p-2 hover:bg-muted rounded-lg"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.slug)}
                    className="p-2 hover:bg-destructive/10 rounded-lg"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    {expandedId === template.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === template.id && (
                <div className="px-4 pb-4 pt-0 border-t border-border/50">
                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {['A6', 'A5', 'story', 'square'].map(format => (
                      <div key={format} className="text-center">
                        <div 
                          className="aspect-[3/4] bg-muted/50 rounded border overflow-hidden mb-1"
                          style={{ backgroundColor: template.defaultBgColor }}
                        >
                          <img
                            src={`/api/qr-templates/${template.slug}/${format}`}
                            alt={`${template.name} - ${format}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase">{format}</span>
                      </div>
                    ))}
                  </div>
                  {template.description && (
                    <p className="mt-3 text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
