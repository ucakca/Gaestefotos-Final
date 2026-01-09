'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED' | string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  createdById: string | null;
};

type ListResponse = {
  apiKeys: ApiKeyItem[];
};

type CreateResponse = {
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    status: string;
    expiresAt: string | null;
    createdAt: string;
    createdById: string | null;
  };
  rawKey: string;
};

function safeCopy(text: string): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    void navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApiKeyItem[]>([]);

  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [creating, setCreating] = useState(false);

  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [createdMeta, setCreatedMeta] = useState<any | null>(null);

  const [revokeConfirm, setRevokeConfirm] = useState<null | { id: string; name: string }>(null);

  const scopesArray = useMemo(() => {
    return newScopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [newScopes]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ListResponse>('/admin/api-keys');
      setItems(Array.isArray(res.data?.apiKeys) ? res.data.apiKeys : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden der API Keys');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Bitte Name eingeben');
      return;
    }

    let expiresAt: string | null | undefined = undefined;
    if (newExpiresAt.trim()) {
      const d = new Date(newExpiresAt.trim());
      if (!Number.isFinite(d.getTime())) {
        toast.error('expiresAt ist kein gültiges ISO Datum');
        return;
      }
      expiresAt = d.toISOString();
    }

    setCreating(true);
    setError(null);
    setCreatedRawKey(null);
    setCreatedMeta(null);
    try {
      const res = await api.post<CreateResponse>('/admin/api-keys', {
        name,
        scopes: scopesArray,
        expiresAt: expiresAt ?? null,
      });
      setCreatedRawKey(typeof res.data?.rawKey === 'string' ? res.data.rawKey : null);
      setCreatedMeta(res.data?.apiKey || null);
      setNewName('');
      setNewScopes('');
      setNewExpiresAt('');
      toast.success('API Key erstellt');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Erstellen des API Keys');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    setError(null);
    try {
      await api.post(`/admin/api-keys/${encodeURIComponent(id)}/revoke`);
      toast.success('API Key revoked');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Revoken des API Keys');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">API Keys</h1>
        <p className="mt-1 text-sm text-app-muted">Integrationen/Automationen (Key ist nur beim Erstellen sichtbar)</p>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-medium text-app-fg">Keys</div>
              <div className="mt-1 text-xs text-app-muted">{loading ? 'Lade…' : `${items.length} Keys`}</div>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Lädt…' : 'Refresh'}
            </Button>
          </div>

          {error ? <div className="mt-3 text-sm text-[var(--status-danger)]">{error}</div> : null}

          <div className="mt-4 overflow-hidden rounded-lg border border-app-border">
            <div className="grid grid-cols-12 gap-2 border-b border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-muted">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Prefix</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Expires</div>
              <div className="col-span-2">Aktion</div>
            </div>
            <div className="divide-y divide-app-border">
              {items.map((k) => (
                <div key={k.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                  <div className="col-span-3 truncate text-app-fg">{k.name}</div>
                  <div className="col-span-2 font-mono text-xs text-app-muted">{k.prefix}</div>
                  <div className="col-span-2">
                    <span className="rounded-md bg-app-bg px-2 py-1 text-xs text-app-fg">{k.status}</span>
                  </div>
                  <div className="col-span-3 text-xs text-app-muted">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleString() : '—'}
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={k.status !== 'ACTIVE'}
                      onClick={() => setRevokeConfirm({ id: k.id, name: k.name })}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
              {!items.length && !loading ? <div className="px-3 py-4 text-sm text-app-muted">Keine Keys</div> : null}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium text-app-fg">Neuen API Key erstellen</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-app-muted">Name *</div>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="z.B. Zapier" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">Scopes (comma separated)</div>
              <Input value={newScopes} onChange={(e) => setNewScopes(e.target.value)} placeholder="events:read,photos:read" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">expiresAt (ISO, optional)</div>
              <Input value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} placeholder="2026-01-31T12:00:00Z" />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="primary" onClick={createKey} disabled={creating}>
              {creating ? 'Erstelle…' : 'API Key erstellen'}
            </Button>
          </div>

          {createdRawKey ? (
            <div className="mt-4 rounded-xl border border-app-border bg-app-bg p-3">
              <div className="text-sm font-medium text-app-fg">Neuer API Key (nur jetzt sichtbar)</div>
              <div className="mt-2 break-all font-mono text-sm text-app-fg">{createdRawKey}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const ok = safeCopy(createdRawKey);
                    toast.success(ok ? 'Key kopiert' : 'Copy: best-effort');
                  }}
                >
                  Copy Key
                </Button>
                {createdMeta?.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ok = safeCopy(String(createdMeta.id));
                      toast.success(ok ? 'ID kopiert' : 'Copy: best-effort');
                    }}
                  >
                    Copy ID
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <AlertDialog open={revokeConfirm !== null} onOpenChange={(open) => (open ? null : setRevokeConfirm(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>API Key revoken?</AlertDialogTitle>
            <AlertDialogDescription>
              Der API Key wird dauerhaft deaktiviert. Das kann Integrationen sofort brechen.
              {revokeConfirm?.name ? `\n\nKey: ${revokeConfirm.name}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeConfirm(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = revokeConfirm?.id;
                setRevokeConfirm(null);
                if (id) void revokeKey(id);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
