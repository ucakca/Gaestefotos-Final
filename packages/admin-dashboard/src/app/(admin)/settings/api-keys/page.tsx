'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export default function ApiKeysPage() {
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ keys: ApiKey[] }>('/admin/api-keys');
      setKeys(res.data.keys || []);
    } catch {
      // Demo data
      setKeys([
        {
          id: '1',
          name: 'WordPress Integration',
          key: 'gf_live_xxxxxxxxxxxxxxxxxxxx',
          scopes: ['read', 'write'],
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          expiresAt: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Bitte Namen eingeben');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post<{ key: ApiKey }>('/admin/api-keys', {
        name: newKeyName,
      });
      setKeys([res.data.key, ...keys]);
      setNewKeyName('');
      toast.success('API Key erstellt');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('API Key wirklich löschen?')) return;
    try {
      await api.delete(`/admin/api-keys/${keyId}`);
      setKeys(keys.filter((k) => k.id !== keyId));
      toast.success('API Key gelöscht');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleCopy = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(keyId);
    toast.success('Kopiert');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-app-accent" />
            API Keys
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            Verwalte API-Zugriffsschlüssel
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={loadKeys} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Create New */}
      <div className="rounded-2xl border border-app-border bg-app-card p-6">
        <h2 className="text-lg font-semibold mb-4">Neuen Key erstellen</h2>
        <div className="flex gap-4">
          <Input
            placeholder="Name (z.B. WordPress Integration)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-1" />
            )}
            Erstellen
          </Button>
        </div>
      </div>

      {/* Keys List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine API Keys vorhanden
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {keys.map((key) => (
              <div key={key.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-app-fg">{key.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-app-bg px-2 py-1 rounded font-mono">
                        {showKey === key.id
                          ? key.key
                          : key.key.substring(0, 10) + '••••••••••'}
                      </code>
                      <button
                        onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                        className="p-1 hover:bg-app-bg rounded"
                      >
                        {showKey === key.id ? (
                          <EyeOff className="w-4 h-4 text-app-muted" />
                        ) : (
                          <Eye className="w-4 h-4 text-app-muted" />
                        )}
                      </button>
                      <button
                        onClick={() => handleCopy(key.key, key.id)}
                        className="p-1 hover:bg-app-bg rounded"
                      >
                        {copiedKey === key.id ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4 text-app-muted" />
                        )}
                      </button>
                    </div>
                    <div className="flex gap-3 mt-2 text-xs text-app-muted">
                      <span>
                        Erstellt: {new Date(key.createdAt).toLocaleDateString('de-DE')}
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          Zuletzt: {new Date(key.lastUsedAt).toLocaleDateString('de-DE')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(key.id)}
                    className="text-destructive hover:bg-destructive/100/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-yellow-500/30 bg-warning/5 p-4">
        <p className="text-sm text-warning">
          ⚠️ <strong>Sicherheit:</strong> API Keys niemals öffentlich teilen. 
          Bei Verdacht auf Kompromittierung sofort löschen und neu erstellen.
        </p>
      </div>
    </div>
  );
}
