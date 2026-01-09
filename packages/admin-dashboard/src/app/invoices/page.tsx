'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Invoice = {
  id: string;
  source: string;
  status: string;
  wcOrderId: string | null;
  wpUserId: number | null;
  eventId: string | null;
  currency: string;
  amountCents: number;
  issuedAt: string;
  createdAt: string;
};

type InvoicesResponse = {
  invoices: Invoice[];
};

const formatMoney = (amountCents: number, currency: string) => {
  const cents = typeof amountCents === 'number' && Number.isFinite(amountCents) ? amountCents : 0;
  const ccy = currency || 'EUR';
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: ccy,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${ccy}`;
  }
};

export default function InvoicesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Invoice[]>([]);

  const [limit, setLimit] = useState('100');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [eventId, setEventId] = useState('');
  const [wcOrderId, setWcOrderId] = useState('');
  const [wpUserId, setWpUserId] = useState('');

  const query = useMemo(() => {
    const q: any = {};

    const n = Number(limit.trim());
    if (Number.isFinite(n) && n > 0) q.limit = Math.min(500, Math.floor(n));

    if (status.trim()) q.status = status.trim();
    if (source.trim()) q.source = source.trim();
    if (eventId.trim()) q.eventId = eventId.trim();
    if (wcOrderId.trim()) q.wcOrderId = wcOrderId.trim();
    if (wpUserId.trim()) q.wpUserId = wpUserId.trim();

    return q;
  }, [limit, status, source, eventId, wcOrderId, wpUserId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<InvoicesResponse>('/admin/invoices', { params: query });
      setItems(Array.isArray(res.data?.invoices) ? res.data.invoices : []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const exportCsv = () => {
    try {
      const params = new URLSearchParams();
      if (query.limit) params.set('limit', String(query.limit));
      if (query.status) params.set('status', String(query.status));
      if (query.source) params.set('source', String(query.source));
      if (query.eventId) params.set('eventId', String(query.eventId));
      if (query.wcOrderId) params.set('wcOrderId', String(query.wcOrderId));
      if (query.wpUserId) params.set('wpUserId', String(query.wpUserId));
      const qs = params.toString();
      const url = `/api/admin/invoices/export.csv${qs ? `?${qs}` : ''}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Export konnte nicht gestartet werden');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Invoices</h1>
            <p className="mt-1 text-sm text-app-muted">Rechnungs-Records filtern und exportieren</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? 'Lade…' : 'Reload'}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              CSV Export
            </Button>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-[var(--status-danger)]">{error}</div> : null}

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-app-muted">Limit</div>
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="100" />
            <div className="mt-1 text-xs text-app-muted">max 500</div>
          </div>
          <div>
            <div className="mb-1 text-xs text-app-muted">Status</div>
            <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="OPEN | PAID | VOID | REFUNDED" />
          </div>
          <div>
            <div className="mb-1 text-xs text-app-muted">Source</div>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="WOOCOMMERCE | MANUAL" />
          </div>
          <div>
            <div className="mb-1 text-xs text-app-muted">Event ID</div>
            <Input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="eventId" />
          </div>
          <div>
            <div className="mb-1 text-xs text-app-muted">WC Order ID</div>
            <Input value={wcOrderId} onChange={(e) => setWcOrderId(e.target.value)} placeholder="wcOrderId" />
          </div>
          <div>
            <div className="mb-1 text-xs text-app-muted">WP User ID</div>
            <Input value={wpUserId} onChange={(e) => setWpUserId(e.target.value)} placeholder="wpUserId" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="text-sm text-app-muted">Treffer: {items.length}</div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              const n = Number(limit.trim());
              if (limit.trim() && (!Number.isFinite(n) || n < 1 || n > 500)) {
                toast.error('Limit muss zwischen 1 und 500 liegen');
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

      <Card className="mt-4 p-5">
        <div className="text-sm font-semibold text-app-fg">Liste</div>
        <div className="mt-3 overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-app-border text-xs text-app-muted">
                <th className="py-2 pr-4">issuedAt</th>
                <th className="py-2 pr-4">status</th>
                <th className="py-2 pr-4">source</th>
                <th className="py-2 pr-4">amount</th>
                <th className="py-2 pr-4">eventId</th>
                <th className="py-2 pr-4">wcOrderId</th>
                <th className="py-2 pr-4">wpUserId</th>
                <th className="py-2 pr-4">id</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-sm text-app-muted">
                    Keine Daten
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="border-b border-app-border">
                    <td className="py-2 pr-4 text-app-fg">{String(i.issuedAt || '')}</td>
                    <td className="py-2 pr-4 text-app-fg">{String(i.status || '')}</td>
                    <td className="py-2 pr-4 text-app-fg">{String(i.source || '')}</td>
                    <td className="py-2 pr-4 text-app-fg">{formatMoney(i.amountCents, i.currency)}</td>
                    <td className="py-2 pr-4 text-app-fg">{i.eventId || '—'}</td>
                    <td className="py-2 pr-4 text-app-fg">{i.wcOrderId || '—'}</td>
                    <td className="py-2 pr-4 text-app-fg">{i.wpUserId ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-app-muted">{i.id}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
