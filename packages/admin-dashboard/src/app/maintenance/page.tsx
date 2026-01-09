'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

type MaintenanceResponse = {
  enabled: boolean;
  message: string | null;
};

type UpdateResponse = {
  enabled: boolean;
  message: string | null;
  success: boolean;
};

export default function MaintenancePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MaintenanceResponse>('/admin/maintenance');
      setEnabled(res.data?.enabled === true);
      setMessage(typeof res.data?.message === 'string' ? res.data.message : '');
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden des Maintenance Mode');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<UpdateResponse>('/admin/maintenance', {
        enabled,
        message: message.trim() ? message.trim() : null,
      });
      if (res.data?.success) toast.success('Gespeichert');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const status = useMemo(() => {
    return enabled
      ? { label: 'AKTIV', className: 'text-[var(--status-warning)]' }
      : { label: 'AUS', className: 'text-app-muted' };
  }, [enabled]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Maintenance Mode</h1>
            <p className="mt-1 text-sm text-app-muted">Wartungsmodus für Gäste steuern</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>
              {saving ? 'Speichere…' : 'Speichern'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{error}</div> : null}

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-app-muted">Status</div>
              <div className={`mt-1 text-base font-medium ${status.className}`}>{status.label}</div>
              <div className="mt-2 text-sm text-app-muted">
                Hinweis: Aktiv blockt Gäste und zeigt Banner (Server-seitig).
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-app-muted">Enabled</div>
              <Select value={enabled ? 'true' : 'false'} onValueChange={(v) => setEnabled(v === 'true')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">false</SelectItem>
                  <SelectItem value="true">true</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="mb-1 text-xs text-app-muted">Message (optional)</div>
              <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Banner-Text (optional)" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
