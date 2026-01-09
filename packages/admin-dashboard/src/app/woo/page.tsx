'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import GuidedTour from '@/components/ui/GuidedTour';
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

type WooLog = {
  id: string;
  provider: string;
  topic: string;
  status: string;
  reason: string | null;
  error: string | null;
  wcOrderId: string | null;
  eventId: string | null;
  createdAt: string;
};

type LogsResponse = {
  ok: boolean;
  total: number;
  logs: WooLog[];
};

export default function WooInboxPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<string>('');
  const [wcOrderId, setWcOrderId] = useState('');
  const [eventId, setEventId] = useState('');

  const [items, setItems] = useState<WooLog[]>([]);
  const [total, setTotal] = useState(0);

  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeOlderThanDays, setPurgeOlderThanDays] = useState('30');
  const [purgeStatus, setPurgeStatus] = useState('');
  const [purgeTopic, setPurgeTopic] = useState('');
  const [purging, setPurging] = useState(false);

  const [replayOpen, setReplayOpen] = useState(false);
  const [replayResult, setReplayResult] = useState<any | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayLoadingId, setReplayLoadingId] = useState<string | null>(null);

  const [applyConfirm, setApplyConfirm] = useState<null | { logId: string }>(null);

  const tourSteps = useMemo(
    () => [
      {
        id: 'woo-filters',
        target: '[data-tour="woo-filters"]',
        title: 'Woo Inbox: Filter',
        body: 'Hier kannst du nach Status, wcOrderId oder eventId filtern.',
        placement: 'bottom' as const,
      },
      {
        id: 'woo-actions',
        target: '[data-tour="woo-actions"]',
        title: 'Export & Purge',
        body: 'Export lädt die Logs als CSV herunter. Purge löscht alte Logs (z.B. 30 Tage).',
        placement: 'bottom' as const,
      },
      {
        id: 'woo-row-actions',
        target: '[data-tour="woo-row-actions"]',
        title: 'Replay / Apply',
        body: 'Replay zeigt den gespeicherten Payload (dry_run). Apply verarbeitet den Webhook erneut (mit neuem Log-Eintrag).',
        placement: 'top' as const,
      },
    ],
    []
  );

  const query = useMemo(() => {
    return {
      status: status.trim() ? status.trim() : undefined,
      wcOrderId: wcOrderId.trim() ? wcOrderId.trim() : undefined,
      eventId: eventId.trim() ? eventId.trim() : undefined,
      limit: 50,
      offset: 0,
    };
  }, [status, wcOrderId, eventId]);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<LogsResponse>('/admin/webhooks/woocommerce/logs', { params: query });
      setItems(Array.isArray(res.data?.logs) ? res.data.logs : []);
      setTotal(typeof res.data?.total === 'number' ? res.data.total : 0);
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
      if (query.status) params.set('status', query.status);
      if (query.wcOrderId) params.set('wcOrderId', query.wcOrderId);
      if (query.eventId) params.set('eventId', query.eventId);
      const qs = params.toString();
      const url = `/api/admin/webhooks/woocommerce/logs/export.csv${qs ? `?${qs}` : ''}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Export konnte nicht gestartet werden');
    }
  };

  const runPurge = async () => {
    const days = Number(purgeOlderThanDays.trim());
    if (!Number.isFinite(days) || days < 1) {
      toast.error('Bitte gültige Anzahl Tage setzen');
      return;
    }

    setPurging(true);
    try {
      const body: any = {
        olderThanDays: Math.floor(days),
      };
      if (purgeStatus.trim()) body.status = purgeStatus.trim();
      if (purgeTopic.trim()) body.topic = purgeTopic.trim();

      const res = await api.post('/admin/webhooks/woocommerce/logs/purge', body);
      toast.success(`Gelöscht: ${res.data?.deleted ?? 0}`);
      setPurgeOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Purge fehlgeschlagen');
    } finally {
      setPurging(false);
    }
  };

  const replay = async (logId: string, mode: 'dry_run' | 'apply') => {
    setReplayError(null);
    setReplayResult(null);
    setReplayOpen(true);
    setReplayLoadingId(logId);

    try {
      const res = await api.post(`/admin/webhooks/woocommerce/replay/${encodeURIComponent(logId)}`, { mode });
      setReplayResult(res.data || null);
      if (mode === 'apply') {
        await load();
      }
    } catch (e: any) {
      setReplayError(e?.response?.data?.error || e?.message || 'Replay fehlgeschlagen');
    } finally {
      setReplayLoadingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Woo Inbox</h1>
            <p className="mt-1 text-sm text-app-muted">WooCommerce Webhook Logs, Replay/Apply, Export und Purge</p>
          </div>
          <GuidedTour tourId="admin-woo-inbox" steps={tourSteps} autoStart />
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3" data-tour="woo-filters">
              <div>
                <div className="mb-1 text-xs text-app-muted">Status</div>
                <Select value={status} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Alle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="RECEIVED">RECEIVED</SelectItem>
                    <SelectItem value="PROCESSED">PROCESSED</SelectItem>
                    <SelectItem value="IGNORED">IGNORED</SelectItem>
                    <SelectItem value="FAILED">FAILED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="mb-1 text-xs text-app-muted">wcOrderId</div>
                <Input value={wcOrderId} onChange={(e) => setWcOrderId(e.target.value)} placeholder="z.B. 1234" />
              </div>
              <div>
                <div className="mb-1 text-xs text-app-muted">eventId</div>
                <Input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="uuid" />
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" data-tour="woo-actions">
              <Button size="sm" variant="outline" onClick={() => setPurgeOpen(true)}>
                Purge
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
              <Button size="sm" variant="primary" onClick={load} disabled={loading}>
                {loading ? 'Lade…' : 'Refresh'}
              </Button>
            </div>
          </div>

          {error ? <div className="mt-3 text-sm text-[var(--status-danger)]">{error}</div> : null}
          <div className="mt-3 text-xs text-app-muted">
            {items.length} angezeigt / {total} gesamt
          </div>
        </Card>

        <Card className="p-5">
          <div className="overflow-hidden rounded-lg border border-app-border">
            <div className="grid grid-cols-12 gap-2 border-b border-app-border bg-app-bg px-3 py-2 text-xs font-medium text-app-muted">
              <div className="col-span-3">Zeit</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">wcOrderId</div>
              <div className="col-span-4">Aktion</div>
            </div>
            <div className="divide-y divide-app-border">
              {items.map((l) => {
                const busy = replayLoadingId === l.id;
                return (
                  <div key={l.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm">
                    <div className="col-span-3 text-xs text-app-muted">{new Date(l.createdAt).toLocaleString()}</div>
                    <div className="col-span-2">
                      <span className="rounded-md bg-app-bg px-2 py-1 text-xs text-app-fg">{l.status}</span>
                    </div>
                    <div className="col-span-3 font-mono text-xs text-app-fg">{l.wcOrderId || '-'}</div>
                    <div className="col-span-4 flex flex-wrap items-center justify-end gap-2" data-tour="woo-row-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => replay(l.id, 'dry_run')}
                      >
                        {busy ? '…' : 'Replay'}
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={busy}
                        onClick={() => setApplyConfirm({ logId: l.id })}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!items.length ? <div className="px-3 py-4 text-sm text-app-muted">Keine Logs</div> : null}
            </div>
          </div>
        </Card>
      </div>

      <Dialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <DialogContent className="max-w-lg">
          <div className="text-lg font-semibold text-app-fg">Purge Woo Logs</div>
          <div className="mt-1 text-sm text-app-muted">Löscht Logs, die älter sind als X Tage (optional gefiltert).</div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-app-muted">olderThanDays *</div>
              <Input value={purgeOlderThanDays} onChange={(e) => setPurgeOlderThanDays(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">status (optional)</div>
              <Input value={purgeStatus} onChange={(e) => setPurgeStatus(e.target.value)} placeholder="FAILED" />
            </div>
            <div>
              <div className="mb-1 text-xs text-app-muted">topic (optional)</div>
              <Input value={purgeTopic} onChange={(e) => setPurgeTopic(e.target.value)} placeholder="order-paid" />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={purging}>
                Abbrechen
              </Button>
            </DialogClose>
            <Button variant="primary" onClick={runPurge} disabled={purging}>
              {purging ? 'Lösche…' : 'Purge ausführen'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={replayOpen} onOpenChange={setReplayOpen}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-app-fg">Replay Result</div>
              <div className="mt-1 text-xs text-app-muted">Dry-run zeigt Log/Payload. Apply verarbeitet erneut und schreibt neue Logs.</div>
            </div>
            <DialogClose asChild>
              <Button variant="secondary" size="sm">
                Schließen
              </Button>
            </DialogClose>
          </div>

          {replayError ? <div className="mt-3 text-sm text-[var(--status-danger)]">{replayError}</div> : null}

          <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-app-border bg-app-bg p-3 text-xs text-app-fg">
            {JSON.stringify(replayResult, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      <AlertDialog open={applyConfirm !== null} onOpenChange={(open) => (open ? null : setApplyConfirm(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Webhook erneut anwenden?</AlertDialogTitle>
            <AlertDialogDescription>
              Das wendet den gespeicherten Webhook erneut an (idempotent, aber nicht rückgängig). Nur nutzen, wenn du sicher bist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setApplyConfirm(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const logId = applyConfirm?.logId;
                setApplyConfirm(null);
                if (logId) replay(logId, 'apply').catch(() => null);
              }}
            >
              Apply ausführen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
