'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type InvitationTemplate = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  html: string | null;
  text: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ListResponse = {
  templates: InvitationTemplate[];
};

type SaveResponse = {
  template: InvitationTemplate;
};

export default function InvitationTemplatesPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<InvitationTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>('__new__');

  const selected = useMemo(() => {
    if (selectedId === '__new__') return null;
    return templates.find((t) => t.id === selectedId) || null;
  }, [selectedId, templates]);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ListResponse>('/admin/invitation-templates');
      const list = Array.isArray(res.data?.templates) ? res.data.templates : [];
      setTemplates(list);

      if (selectedId !== '__new__' && !list.some((t) => t.id === selectedId)) {
        setSelectedId('__new__');
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setSlug('');
      setTitle('');
      setDescription('');
      setHtml('');
      setText('');
      setIsActive(true);
      return;
    }

    setSlug(selected.slug || '');
    setTitle(selected.title || '');
    setDescription(selected.description || '');
    setHtml(selected.html || '');
    setText(selected.text || '');
    setIsActive(selected.isActive !== false);
  }, [selected?.id]);

  const save = async () => {
    const s = slug.trim();
    const t = title.trim();

    if (!s) {
      toast.error('Bitte slug setzen');
      return;
    }
    if (!t) {
      toast.error('Bitte title setzen');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (selectedId === '__new__') {
        const res = await api.post<SaveResponse>('/admin/invitation-templates', {
          slug: s,
          title: t,
          description: description.trim() ? description.trim() : null,
          html: html.trim() ? html.trim() : null,
          text: text.trim() ? text.trim() : null,
          isActive,
        });
        const created = res.data?.template;
        toast.success('Erstellt');
        await load();
        if (created?.id) setSelectedId(created.id);
      } else {
        await api.put<SaveResponse>(`/admin/invitation-templates/${encodeURIComponent(selectedId)}`, {
          slug: s,
          title: t,
          description: description.trim() ? description.trim() : null,
          html: html.trim() ? html.trim() : null,
          text: text.trim() ? text.trim() : null,
          isActive,
        });
        toast.success('Gespeichert');
        await load();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (selectedId === '__new__') return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/admin/invitation-templates/${encodeURIComponent(selectedId)}`);
      toast.success('Deaktiviert');
      setSelectedId('__new__');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Deaktivieren fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Invitation Templates</h1>
            <p className="mt-1 text-sm text-app-muted">Admin CRUD für Einladungsvorlagen (HTML/Text)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Speichere…' : selectedId === '__new__' ? 'Erstellen' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{error}</div> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm font-medium text-app-fg">Vorlage</div>
          <div className="mt-2">
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__new__">+ Neu</SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.isActive ? '' : '[inactive] '} {tpl.slug}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected ? (
            <div className="mt-3 text-xs text-app-muted">
              <div>id: {selected.id}</div>
              <div>updatedAt: {new Date(selected.updatedAt).toLocaleString()}</div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-app-muted">Neue Vorlage erstellen.</div>
          )}

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="outline" onClick={deactivate} disabled={saving || selectedId === '__new__'}>
              Deaktivieren
            </Button>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-app-muted">slug *</div>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="z.B. standard" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">active</div>
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
              <div className="mb-1 text-xs text-app-muted">title *</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-app-muted">description</div>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurzbeschreibung" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <div className="mb-1 text-xs text-app-muted">HTML</div>
              <Textarea value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h1>Hallo</h1>" rows={10} />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">Text</div>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Hallo" rows={6} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
