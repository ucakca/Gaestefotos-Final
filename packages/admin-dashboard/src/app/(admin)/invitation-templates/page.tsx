'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Check, X, Loader2, AlertCircle, Eye } from 'lucide-react';
import api from '@/lib/api';

interface InvitationTemplate {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  html: string | null;
  text: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = {
  slug: '',
  title: '',
  description: '',
  html: '',
  text: '',
  isActive: true,
};

export default function InvitationTemplatesPage() {
  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      const res = await api.get('/admin/invitation-templates');
      setTemplates(res.data.templates || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(template: InvitationTemplate) {
    setEditingId(template.id);
    setIsCreating(false);
    setFormData({
      slug: template.slug,
      title: template.title,
      description: template.description || '',
      html: template.html || '',
      text: template.text || '',
      isActive: template.isActive,
    });
  }

  function startCreate() {
    setEditingId(null);
    setIsCreating(true);
    setFormData(EMPTY_FORM);
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setFormData(EMPTY_FORM);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (isCreating) {
        await api.post('/admin/invitation-templates', formData);
        setSuccess('Template erstellt!');
      } else if (editingId) {
        await api.put(`/admin/invitation-templates/${editingId}`, formData);
        setSuccess('Template aktualisiert!');
      }

      setTimeout(() => setSuccess(null), 3000);
      cancelEdit();
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Template wirklich deaktivieren?')) return;
    
    try {
      setError(null);
      await api.delete(`/admin/invitation-templates/${id}`);
      setSuccess('Template deaktiviert');
      setTimeout(() => setSuccess(null), 3000);
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Löschen');
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Lädt Templates...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Einladungs-Templates
          </h1>
          <p className="text-gray-500 mt-1">
            Verwalte Templates für Event-Einladungsseiten
          </p>
        </div>
        {!isCreating && !editingId && (
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Neues Template
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Editor */}
      {(isCreating || editingId) && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">
              {isCreating ? 'Neues Template erstellen' : 'Template bearbeiten'}
            </h2>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="z.B. hochzeit-elegant"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Elegante Hochzeitseinladung"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Kurze Beschreibung des Templates"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HTML Template
                <span className="text-gray-400 font-normal ml-2">Variablen: {'{{eventTitle}}, {{hostName}}, {{eventDate}}, {{location}}'}</span>
              </label>
              <textarea
                value={formData.html}
                onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                rows={10}
                placeholder="<div>...</div>"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text-Fallback</label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={3}
                placeholder="Nur-Text-Version..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700">Aktiv</label>
            </div>
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button
              onClick={() => setPreviewHtml(formData.html || null)}
              disabled={!formData.html}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Vorschau
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.slug || !formData.title}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Vorschau</h3>
              <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div 
                className="border border-gray-200 rounded-lg p-4"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Templates ({templates.length})</h2>
        </div>
        
        {templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Templates vorhanden. Erstelle dein erstes Template.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((template) => (
              <div 
                key={template.id} 
                className={`p-4 flex items-center justify-between ${!template.isActive ? 'opacity-50 bg-gray-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{template.title}</span>
                    <code className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      {template.slug}
                    </code>
                    {template.isActive ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Aktiv</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inaktiv</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-500 mt-1 truncate">{template.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => startEdit(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Deaktivieren"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
