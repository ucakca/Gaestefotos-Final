'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, Eye, Send, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

type EmailTemplateKind = 'INVITATION' | 'STORAGE_ENDS_REMINDER' | 'PHOTO_NOTIFICATION';

interface EmailTemplate {
  id: string;
  kind: EmailTemplateKind;
  name: string;
  subject: string;
  html: string | null;
  text: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_KINDS: { kind: EmailTemplateKind; label: string; description: string }[] = [
  { kind: 'INVITATION', label: 'Einladung', description: 'E-Mail für Event-Einladungen' },
  { kind: 'STORAGE_ENDS_REMINDER', label: 'Speicher-Erinnerung', description: 'Erinnerung vor Ablauf des Speicherzeitraums' },
  { kind: 'PHOTO_NOTIFICATION', label: 'Foto-Benachrichtigung', description: 'Benachrichtigung bei neuen Fotos' },
];

const DEFAULT_VARIABLES: Record<EmailTemplateKind, Record<string, string>> = {
  INVITATION: {
    eventTitle: 'Hochzeit Anna & Max',
    eventDate: '15. März 2026',
    eventLocation: 'Schloss Neuschwanstein',
    hostName: 'Anna',
    inviteUrl: 'https://gaestefotos.com/invite/abc123',
  },
  STORAGE_ENDS_REMINDER: {
    eventTitle: 'Hochzeit Anna & Max',
    daysRemaining: '7',
    downloadUrl: 'https://gaestefotos.com/download/abc123',
  },
  PHOTO_NOTIFICATION: {
    eventTitle: 'Hochzeit Anna & Max',
    photoCount: '5',
    viewUrl: 'https://gaestefotos.com/event/abc123',
  },
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKind, setSelectedKind] = useState<EmailTemplateKind>('INVITATION');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html: '',
    text: '',
    isActive: true,
  });
  
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const template = templates.find(t => t.kind === selectedKind);
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        html: template.html || '',
        text: template.text || '',
        isActive: template.isActive,
      });
    } else {
      setFormData({
        name: TEMPLATE_KINDS.find(k => k.kind === selectedKind)?.label || '',
        subject: '',
        html: '',
        text: '',
        isActive: true,
      });
    }
    setPreviewHtml(null);
  }, [selectedKind, templates]);

  async function loadTemplates() {
    try {
      setLoading(true);
      const res = await api.get('/admin/email-templates');
      setTemplates(res.data.templates || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      await api.put(`/admin/email-templates/${selectedKind}`, formData);
      setSuccess('Template gespeichert!');
      setTimeout(() => setSuccess(null), 3000);
      loadTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    try {
      setPreviewing(true);
      setError(null);
      const res = await api.post(`/admin/email-templates/${selectedKind}/preview`, {
        variables: DEFAULT_VARIABLES[selectedKind],
      });
      setPreviewHtml(res.data.rendered?.html || res.data.rendered?.text || 'Keine Vorschau verfügbar');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler bei Vorschau');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleTestSend() {
    if (!testEmail) {
      setError('Bitte E-Mail-Adresse eingeben');
      return;
    }
    try {
      setTestSending(true);
      setError(null);
      await api.post(`/admin/email-templates/${selectedKind}/test-send`, {
        to: testEmail,
        variables: DEFAULT_VARIABLES[selectedKind],
      });
      setSuccess('Test-E-Mail gesendet!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Senden');
    } finally {
      setTestSending(false);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-6 h-6" />
          E-Mail Templates
        </h1>
        <p className="text-gray-500 mt-1">
          Verwalte E-Mail-Vorlagen für automatische Benachrichtigungen
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-700">Templates</h2>
            </div>
            <div className="p-2">
              {TEMPLATE_KINDS.map(({ kind, label, description }) => {
                const template = templates.find(t => t.kind === kind);
                const isSelected = selectedKind === kind;
                return (
                  <button
                    key={kind}
                    onClick={() => setSelectedKind(kind)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {label}
                      </span>
                      {template?.isActive && (
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">
                {TEMPLATE_KINDS.find(k => k.kind === selectedKind)?.label} bearbeiten
              </h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                Aktiv
              </label>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="z.B. Du bist eingeladen zu {{eventTitle}}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Template
                  <span className="text-gray-400 font-normal ml-2">Variablen: {'{{variable}}'}</span>
                </label>
                <textarea
                  value={formData.html}
                  onChange={(e) => setFormData({ ...formData, html: e.target.value })}
                  rows={12}
                  placeholder="<html>...</html>"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text-Fallback (Plain Text)
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  rows={4}
                  placeholder="Nur-Text-Version der E-Mail..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  Verfügbare Variablen für {TEMPLATE_KINDS.find(k => k.kind === selectedKind)?.label}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(DEFAULT_VARIABLES[selectedKind]).map(v => (
                    <code key={v} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Speichern
                </button>
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                  Vorschau
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@email.de"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
                />
                <button
                  onClick={handleTestSend}
                  disabled={testSending || !testEmail}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {testSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Test senden
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          {previewHtml && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">Vorschau</h2>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  Schließen
                </button>
              </div>
              <div className="p-4">
                <div 
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
