'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type MarketingStatsResponse = {
  ok: boolean;
  range: { days: number; since: string };
  filters: { eventId: string | null };
  traffic: {
    stats: Array<{
      eventId: string;
      source: string;
      count: number;
      firstSeenAt: string;
      lastSeenAt: string;
    }>;
  };
  woocommerce: {
    totalsByStatus: Array<{ status: string; _count: { id: number } }>;
    totalsByTopic: Array<{ topic: string; _count: { id: number } }>;
    processedOrderPaid: number;
  };
};

export default function MarketingPage() {
  const [days, setDays] = useState(30);
  const [eventId, setEventId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MarketingStatsResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { days };
      if (eventId.trim()) params.eventId = eventId.trim();

      const res = await api.get<MarketingStatsResponse>('/admin/marketing/stats', { params });
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden der Marketing Stats');
    } finally {
      setLoading(false);
    }
  }, [days, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const trafficSummary = useMemo(() => {
    const stats = data?.traffic?.stats || [];
    const bySource = new Map<string, number>();
    for (const row of stats) bySource.set(row.source, (bySource.get(row.source) || 0) + (row.count || 0));
    return Array.from(bySource.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Marketing</h1>
            <p className="mt-1 text-sm text-app-muted">Traffic & WooCommerce Kennzahlen</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{error}</div> : null}

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-app-muted">Days</div>
            <Input
              inputMode="numeric"
              value={String(days)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) setDays(n);
              }}
              placeholder="30"
            />
            <div className="mt-1 text-xs text-app-muted">1..365</div>
          </div>
          <div className="sm:col-span-2">
            <div className="mb-1 text-xs text-app-muted">Event ID (optional)</div>
            <Input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="eventId" />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (days < 1 || days > 365 || !Number.isFinite(days)) {
                toast.error('Days muss zwischen 1 und 365 liegen');
                return;
              }
              void load();
            }}
            disabled={loading}
          >
            {loading ? 'Lade…' : 'Anwenden'}
          </Button>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold text-app-fg">Traffic Summary (by source)</div>
          <div className="mt-3 space-y-2">
            {trafficSummary.length === 0 ? (
              <div className="text-sm text-app-muted">Keine Daten</div>
            ) : (
              trafficSummary.map((r) => (
                <div key={r.source} className="flex items-center justify-between gap-4">
                  <div className="truncate text-sm text-app-fg">{r.source}</div>
                  <div className="text-sm font-medium text-app-fg">{r.count}</div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-app-fg">WooCommerce</div>
          <div className="mt-3 text-sm text-app-muted">Processed order-paid: {data?.woocommerce?.processedOrderPaid ?? '—'}</div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-app-muted">Totals by status</div>
            <div className="mt-2 space-y-2">
              {(data?.woocommerce?.totalsByStatus || []).map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-4">
                  <div className="truncate text-sm text-app-fg">{row.status}</div>
                  <div className="text-sm font-medium text-app-fg">{row._count?.id ?? 0}</div>
                </div>
              ))}
              {(data?.woocommerce?.totalsByStatus || []).length === 0 ? (
                <div className="text-sm text-app-muted">Keine Daten</div>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-app-muted">Totals by topic</div>
            <div className="mt-2 max-h-64 space-y-2 overflow-auto">
              {(data?.woocommerce?.totalsByTopic || []).map((row) => (
                <div key={row.topic} className="flex items-center justify-between gap-4">
                  <div className="truncate text-sm text-app-fg">{row.topic}</div>
                  <div className="text-sm font-medium text-app-fg">{row._count?.id ?? 0}</div>
                </div>
              ))}
              {(data?.woocommerce?.totalsByTopic || []).length === 0 ? (
                <div className="text-sm text-app-muted">Keine Daten</div>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="text-sm font-semibold text-app-fg">Raw JSON</div>
        <pre className="mt-3 max-h-[420px] overflow-auto rounded-lg bg-app-bg p-3 text-xs text-app-fg">
          {JSON.stringify(data, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
