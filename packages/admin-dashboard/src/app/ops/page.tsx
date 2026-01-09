'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type WordpressVerifyCheckResult = {
  url: string | null;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type OpsWordpressResponse = {
  ok: boolean;
  checkedAt: string;
  config: {
    wordpressUrlConfigured: boolean;
    hasVerifySecret: boolean;
    hasWpDbConfig: boolean;
  };
  checks: {
    verifyPassword: WordpressVerifyCheckResult;
  };
};

export default function OpsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsWordpressResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OpsWordpressResponse>('/admin/ops/wordpress');
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overall = useMemo(() => {
    if (!data) return { label: 'Unbekannt', className: 'text-app-muted' };
    if (data.ok) return { label: 'OK', className: 'text-[var(--status-success)]' };
    return { label: 'Fehler', className: 'text-[var(--status-danger)]' };
  }, [data]);

  const renderBool = (ok: boolean | undefined) => {
    if (ok === true) return <span className="text-[var(--status-success)]">OK</span>;
    if (ok === false) return <span className="text-[var(--status-danger)]">FAIL</span>;
    return <span className="text-app-muted">—</span>;
  };

  const renderStatus = (status: number | null | undefined) => {
    if (status === null || status === undefined) return <span className="text-app-muted">—</span>;
    return <span className="text-app-fg">HTTP {status}</span>;
  };

  const renderDuration = (durationMs: number | undefined) => {
    if (durationMs === undefined) return <span className="text-app-muted">—</span>;
    return <span className="text-app-muted">{durationMs}ms</span>;
  };

  const renderError = (err: string | undefined) => {
    if (!err) return null;
    return <div className="text-xs text-[var(--status-danger)]">{err}</div>;
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Ops</h1>
        <p className="mt-1 text-sm text-app-muted">Diagnostik / Checks</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-app-muted">WordPress Status</div>
              <div className={`mt-1 text-base font-medium ${overall.className}`}>{overall.label}</div>
              <div className="mt-2 text-sm text-app-muted">
                Letzter Check: {data?.checkedAt ? new Date(data.checkedAt).toLocaleString() : '—'}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                {loading ? 'Lädt…' : 'Refresh'}
              </Button>
              {error && <div className="text-xs text-[var(--status-danger)]">{error}</div>}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-xs text-app-muted">Config (Server)</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-app-muted">WORDPRESS_URL gesetzt</span>
              {renderBool(data?.config?.wordpressUrlConfigured)}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-app-muted">WORDPRESS_VERIFY_SECRET gesetzt</span>
              {renderBool(data?.config?.hasVerifySecret)}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-app-muted">WP DB Config gesetzt</span>
              {renderBool(data?.config?.hasWpDbConfig)}
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4">
        <Card className="p-5">
          <div className="text-xs text-app-muted">Checks</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-bg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-app-fg">verify-password Endpoint</span>
                <span className="flex items-center gap-3">
                  {renderStatus(data?.checks?.verifyPassword?.status)}
                  {renderDuration(data?.checks?.verifyPassword?.durationMs)}
                  {renderBool(data?.checks?.verifyPassword?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{data?.checks?.verifyPassword?.url || '—'}</div>
              {renderError(data?.checks?.verifyPassword?.error)}
              <div className="mt-2 text-xs text-app-muted">
                Erwartet: HTTP 400 (invalid credentials) oder 200. Alles andere deutet auf Auth-Wall / falsche Route / falsche URL hin.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
