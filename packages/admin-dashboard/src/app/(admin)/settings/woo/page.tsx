'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart,
  RefreshCw,
  Download,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface WebhookLog {
  id: string;
  event: string;
  status: 'success' | 'failed' | 'pending';
  orderId: string | null;
  createdAt: string;
  error: string | null;
}

export default function WooInboxPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ logs: WebhookLog[] }>('/admin/woo/logs');
      setLogs(res.data.logs || []);
    } catch {
      // Demo data
      setLogs([
        {
          id: '1',
          event: 'order.completed',
          status: 'success',
          orderId: '12345',
          createdAt: new Date().toISOString(),
          error: null,
        },
        {
          id: '2',
          event: 'order.completed',
          status: 'failed',
          orderId: '12346',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          error: 'Connection timeout',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleReprocess = async (logId: string) => {
    setReprocessing(logId);
    try {
      await api.post(`/admin/woo/logs/${logId}/reprocess`);
      toast.success('Webhook erneut verarbeitet');
      loadLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Reprocessing');
    } finally {
      setReprocessing(null);
    }
  };

  const handlePurge = async () => {
    if (!confirm('Alle erfolgreichen Logs löschen?')) return;
    try {
      await api.delete('/admin/woo/logs/purge');
      toast.success('Logs gelöscht');
      loadLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Event', 'Status', 'Order ID', 'Date', 'Error'].join(','),
      ...logs.map((log) =>
        [
          log.id,
          log.event,
          log.status,
          log.orderId || '',
          log.createdAt,
          log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `woo-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-app-accent" />
            WooCommerce Inbox
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {logs.length} Webhook Logs • {failedCount} fehlgeschlagen
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={handlePurge}>
            <Trash2 className="w-4 h-4 mr-1" />
            Purge
          </Button>
          <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Failed Alert */}
      {failedCount > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-400">
              <strong>{failedCount} Webhook(s) fehlgeschlagen.</strong> Klicke auf 
              "Erneut verarbeiten" um sie nochmal zu versuchen.
            </p>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine Webhook Logs vorhanden
          </div>
        ) : (
          <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-4 ${
                  log.status === 'failed' ? 'bg-red-500/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={log.status} />
                    <div>
                      <p className="font-medium text-app-fg text-sm">
                        {log.event}
                      </p>
                      <div className="flex gap-3 text-xs text-app-muted">
                        {log.orderId && <span>Order #{log.orderId}</span>}
                        <span>
                          {new Date(log.createdAt).toLocaleString('de-DE')}
                        </span>
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-400 mt-1">{log.error}</p>
                      )}
                    </div>
                  </div>
                  {log.status === 'failed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReprocess(log.id)}
                      disabled={reprocessing === log.id}
                    >
                      {reprocessing === log.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
