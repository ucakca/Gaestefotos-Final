'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';

type HttpCheckResult = {
  url: string;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type NextAssetCheckResult = {
  baseUrl: string;
  assetPath: string | null;
  assetUrl: string | null;
  status: number | null;
  ok: boolean;
  durationMs: number;
  error?: string;
};

type OpsHealthResponse = {
  ok: boolean;
  checkedAt: string;
  targets: {
    appBaseUrl: string;
    dashBaseUrl: string;
  };
  checks: {
    appRoot: HttpCheckResult;
    dashRoot: HttpCheckResult;
    apiHealth: HttpCheckResult;
    appNext: NextAssetCheckResult;
    dashNext: NextAssetCheckResult;
  };
};

export default function SystemPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OpsHealthResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OpsHealthResponse>('/admin/ops/health');
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

  const checks = data?.checks;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">System</h1>
        <p className="mt-1 text-sm text-app-muted">Systemstatus und Health-Checks</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-app-muted">Gesamtstatus</div>
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
          <div className="text-xs text-app-muted">Targets</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-app-muted">App</span>
              <span className="truncate text-app-fg">{data?.targets?.appBaseUrl || '—'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-app-muted">Dash</span>
              <span className="truncate text-app-fg">{data?.targets?.dashBaseUrl || '—'}</span>
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
                <span className="font-medium text-app-fg">App Root</span>
                <span className="flex items-center gap-3">
                  {renderStatus(checks?.appRoot?.status)}
                  {renderDuration(checks?.appRoot?.durationMs)}
                  {renderBool(checks?.appRoot?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{checks?.appRoot?.url || '—'}</div>
              {renderError(checks?.appRoot?.error)}
            </div>

            <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-bg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-app-fg">Dash Root</span>
                <span className="flex items-center gap-3">
                  {renderStatus(checks?.dashRoot?.status)}
                  {renderDuration(checks?.dashRoot?.durationMs)}
                  {renderBool(checks?.dashRoot?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{checks?.dashRoot?.url || '—'}</div>
              {renderError(checks?.dashRoot?.error)}
            </div>

            <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-bg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-app-fg">Backend Health</span>
                <span className="flex items-center gap-3">
                  {renderStatus(checks?.apiHealth?.status)}
                  {renderDuration(checks?.apiHealth?.durationMs)}
                  {renderBool(checks?.apiHealth?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{checks?.apiHealth?.url || '—'}</div>
              {renderError(checks?.apiHealth?.error)}
            </div>

            <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-bg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-app-fg">App _next Asset</span>
                <span className="flex items-center gap-3">
                  {renderStatus(checks?.appNext?.status)}
                  {renderDuration(checks?.appNext?.durationMs)}
                  {renderBool(checks?.appNext?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{checks?.appNext?.assetUrl || '—'}</div>
              {renderError(checks?.appNext?.error)}
            </div>

            <div className="flex flex-col gap-1 rounded-md border border-app-border bg-app-bg p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-app-fg">Dash _next Asset</span>
                <span className="flex items-center gap-3">
                  {renderStatus(checks?.dashNext?.status)}
                  {renderDuration(checks?.dashNext?.durationMs)}
                  {renderBool(checks?.dashNext?.ok)}
                </span>
              </div>
              <div className="text-xs text-app-muted truncate">{checks?.dashNext?.assetUrl || '—'}</div>
              {renderError(checks?.dashNext?.error)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
