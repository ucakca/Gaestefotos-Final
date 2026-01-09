'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type TemplateKind = 'INVITATION' | 'STORAGE_ENDS_REMINDER' | 'PHOTO_NOTIFICATION';

type EmailTemplate = {
  id: string;
  kind: TemplateKind;
  name: string;
  subject: string;
  html: string | null;
  text: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type GetTemplateResponse = {
  template: EmailTemplate | null;
};

type SaveTemplateResponse = {
  template: EmailTemplate;
  success: boolean;
};

type PreviewResponse = {
  rendered: {
    subject: string;
    html: string | null;
    text: string | null;
  };
};

export default function EmailTemplatesPage() {
  const [kind, setKind] = useState<TemplateKind>('INVITATION');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testSendLoading, setTestSendLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('INVITATION');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [variablesJson, setVariablesJson] = useState('{\n  "name": "Max",\n  "eventName": "Test Event"\n}');
  const [preview, setPreview] = useState<PreviewResponse['rendered'] | null>(null);

  const [testTo, setTestTo] = useState('');

  const load = useCallback(
    async (k: TemplateKind) => {
      setLoading(true);
      setError(null);
      setPreview(null);
      try {
        const res = await api.get<GetTemplateResponse>(`/admin/email-templates/${k}`);
        const t = res.data?.template;
        if (!t) {
          setName(k);
          setSubject('');
          setHtml('');
          setText('');
          setIsActive(true);
          return;
        }

        setName(typeof t.name === 'string' && t.name.trim() ? t.name : k);
        setSubject(typeof t.subject === 'string' ? t.subject : '');
        setHtml(typeof t.html === 'string' ? t.html : '');
        setText(typeof t.text === 'string' ? t.text : '');
        setIsActive(t.isActive !== false);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden des Email-Templates');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  const save = async () => {
    const n = name.trim() || kind;
    const s = subject.trim();
    if (!s) {
      toast.error('Bitte Subject setzen');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.put<SaveTemplateResponse>(`/admin/email-templates/${kind}`, {
        name: n,
        subject: s,
        html: html.trim() ? html : null,
        text: text.trim() ? text : null,
        isActive,
      });
      toast.success(res.data?.success ? 'Gespeichert' : 'Gespeichert (best-effort)');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const parseVariables = () => {
    try {
      const vars = JSON.parse(variablesJson || '{}');
      if (!vars || typeof vars !== 'object') throw new Error('invalid');
      return vars as Record<string, any>;
    } catch {
      throw new Error('Variables JSON ist ungültig');
    }
  };

  const runPreview = async () => {
    setPreviewLoading(true);
    setError(null);
    setPreview(null);
    try {
      const variables = parseVariables();
      const res = await api.post<PreviewResponse>(`/admin/email-templates/${kind}/preview`, { variables });
      setPreview(res.data?.rendered || null);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Preview fehlgeschlagen');
    } finally {
      setPreviewLoading(false);
    }
  };

  const runTestSend = async () => {
    const to = testTo.trim();
    if (!to) {
      toast.error('Bitte Test-E-Mail Empfänger setzen');
      return;
    }

    setTestSendLoading(true);
    setError(null);
    try {
      const variables = parseVariables();
      await api.post(`/admin/email-templates/${kind}/test-send`, { to, variables });
      toast.success('Test-Mail gesendet');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Test-Send fehlgeschlagen');
    } finally {
      setTestSendLoading(false);
    }
  };

  const kindLabel = useMemo(() => {
    if (kind === 'INVITATION') return 'Invitation';
    if (kind === 'STORAGE_ENDS_REMINDER') return 'Storage Ends Reminder';
    if (kind === 'PHOTO_NOTIFICATION') return 'Photo Notification';
    return kind;
  }, [kind]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">E-Mail Templates</h1>
            <p className="mt-1 text-sm text-app-muted">Bearbeiten, Preview, Test-Send</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void load(kind)} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Speichere…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-app-muted">Kind</div>
              <Select value={kind} onValueChange={(v) => setKind(v as TemplateKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVITATION">INVITATION</SelectItem>
                  <SelectItem value="STORAGE_ENDS_REMINDER">STORAGE_ENDS_REMINDER</SelectItem>
                  <SelectItem value="PHOTO_NOTIFICATION">PHOTO_NOTIFICATION</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-1 text-xs text-app-muted">Aktuell: {kindLabel}</div>
            </div>

            <div>
              <div className="mb-1 text-xs text-app-muted">Active</div>
              <Select value={isActive ? 'true' : 'false'} onValueChange={(v) => setIsActive(v === 'true')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-app-muted">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind} />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-app-muted">Subject *</div>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <div className="mb-1 text-xs text-app-muted">HTML</div>
              <Textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h1>Hello {{name}}</h1>" rows={12} />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">Text</div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hello {{name}}" rows={8} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-app-fg">Preview</div>
                <div className="mt-1 text-xs text-app-muted">Variables JSON → Rendered Subject/HTML/Text</div>
              </div>
              <Button size="sm" variant="outline" onClick={runPreview} disabled={previewLoading}>
                {previewLoading ? '…' : 'Preview'}
              </Button>
            </div>

            <div className="mt-3">
              <div className="mb-1 text-xs text-app-muted">Variables (JSON)</div>
              <Textarea value={variablesJson} onChange={(e) => setVariablesJson(e.target.value)} rows={8} className="font-mono" />
            </div>

            {preview ? (
              <div className="mt-3 rounded-lg border border-app-border bg-app-bg p-3">
                <div className="text-xs text-app-muted">Subject</div>
                <div className="mt-1 text-sm text-app-fg">{preview.subject}</div>

                {preview.html ? (
                  <>
                    <div className="mt-3 text-xs text-app-muted">HTML</div>
                    <div className="mt-2 max-h-[220px] overflow-auto rounded-md border border-app-border bg-app-card p-2">
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.html }} />
                    </div>
                  </>
                ) : null}

                {preview.text ? (
                  <>
                    <div className="mt-3 text-xs text-app-muted">Text</div>
                    <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border border-app-border bg-app-card p-2 text-xs text-app-fg">
                      {preview.text}
                    </pre>
                  </>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card className="p-5">
            <div className="text-sm font-medium text-app-fg">Test senden</div>
            <div className="mt-1 text-xs text-app-muted">Sendet das aktive Template an eine Adresse</div>

            <div className="mt-3">
              <div className="mb-1 text-xs text-app-muted">To</div>
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            </div>

            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="primary" onClick={runTestSend} disabled={testSendLoading}>
                {testSendLoading ? 'Sende…' : 'Test senden'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
