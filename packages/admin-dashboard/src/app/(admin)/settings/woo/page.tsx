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
  Package,
  AlertTriangle,
  Link2,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface WebhookLog {
  id: string;
  topic: string;
  status: string;
  wcOrderId: string | null;
  wcSku: string | null;
  reason: string | null;
  error: string | null;
  createdAt: string;
}

interface SkuMapping {
  id: string;
  sku: string;
  name: string;
  type: string;
  resultingTier: string;
  isActive: boolean;
  priceEurCents: number | null;
  orderCount: number;
}

interface OrphanedSku {
  sku: string;
  orderCount: number;
}

export default function WooInboxPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [mapping, setMapping] = useState<SkuMapping[]>([]);
  const [orphanedSkus, setOrphanedSkus] = useState<OrphanedSku[]>([]);
  const [mappingLoading, setMappingLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'mapping'>('logs');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ logs: WebhookLog[] }>('/admin/webhooks/woocommerce/logs');
      setLogs(res.data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMapping = useCallback(async () => {
    setMappingLoading(true);
    try {
      const res = await api.get<{ mapping: SkuMapping[]; orphanedSkus: OrphanedSku[] }>('/admin/webhooks/woocommerce/sku-mapping');
      setMapping(res.data.mapping || []);
      setOrphanedSkus(res.data.orphanedSkus || []);
    } catch {
      setMapping([]);
      setOrphanedSkus([]);
    } finally {
      setMappingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadMapping();
  }, [loadLogs, loadMapping]);

  const handleReprocess = async (logId: string) => {
    setReprocessing(logId);
    try {
      await api.post(`/admin/webhooks/woocommerce/replay/${logId}`, { mode: 'apply' });
      toast.success('Webhook erneut verarbeitet');
      loadLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Reprocessing');
    } finally {
      setReprocessing(null);
    }
  };

  const handlePurge = async () => {
    if (!confirm('Logs älter als 30 Tage löschen?')) return;
    try {
      await api.post('/admin/webhooks/woocommerce/logs/purge', { olderThanDays: 30 });
      toast.success('Logs gelöscht');
      loadLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleExport = () => {
    window.open('/api/admin/webhooks/woocommerce/logs/export.csv', '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED': return 'text-green-500';
      case 'ERROR': case 'FAILED': return 'text-red-500';
      case 'SKIPPED': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROCESSED': return <CheckCircle2 className={`w-4 h-4 ${getStatusColor(status)}`} />;
      case 'ERROR': case 'FAILED': return <XCircle className={`w-4 h-4 ${getStatusColor(status)}`} />;
      default: return <AlertCircle className={`w-4 h-4 ${getStatusColor(status)}`} />;
    }
  };

  const failedCount = logs.filter((l) => l.status === 'ERROR' || l.status === 'FAILED').length;
  const totalOrders = mapping.reduce((sum, m) => sum + m.orderCount, 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-app-accent" />
            WooCommerce
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {logs.length} Webhook Logs • {mapping.length} Pakete • {totalOrders} Bestellungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handlePurge}>
            <Trash2 className="w-4 h-4 mr-1" /> Purge
          </Button>
          <Button size="sm" variant="outline" onClick={() => { loadLogs(); loadMapping(); }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-app-bg rounded-xl p-1">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-app-card text-app-fg shadow-sm' : 'text-app-muted hover:text-app-fg'
          }`}
        >
          Webhook Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'mapping' ? 'bg-app-card text-app-fg shadow-sm' : 'text-app-muted hover:text-app-fg'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            SKU-Mapping
            {orphanedSkus.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-500/10 text-yellow-500">{orphanedSkus.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* Failed Alert */}
      {activeTab === 'logs' && failedCount > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-400">
              <strong>{failedCount} Webhook(s) fehlgeschlagen.</strong> Klicke auf Replay um erneut zu verarbeiten.
            </p>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-app-muted">Keine Webhook Logs vorhanden</div>
          ) : (
            <div className="divide-y divide-app-border max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className={`p-4 ${log.status === 'ERROR' || log.status === 'FAILED' ? 'bg-red-500/5' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-app-fg text-sm">{log.topic}</p>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${getStatusColor(log.status)} bg-current/10`}>
                            {log.status}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-app-muted mt-0.5">
                          {log.wcOrderId && <span>Order #{log.wcOrderId}</span>}
                          {log.wcSku && <span>SKU: {log.wcSku}</span>}
                          <span>{new Date(log.createdAt).toLocaleString('de-DE')}</span>
                        </div>
                        {log.error && <p className="text-xs text-red-400 mt-1">{log.error}</p>}
                        {log.reason && <p className="text-xs text-app-muted mt-0.5">{log.reason}</p>}
                      </div>
                    </div>
                    {(log.status === 'ERROR' || log.status === 'FAILED') && (
                      <Button size="sm" variant="outline" onClick={() => handleReprocess(log.id)} disabled={reprocessing === log.id}>
                        {reprocessing === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SKU Mapping Tab */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          {/* Orphaned SKUs Warning */}
          {orphanedSkus.length > 0 && (
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Unbekannte SKUs in Webhook-Logs</p>
                  <p className="text-xs text-app-muted mt-1">
                    Diese SKUs tauchen in WooCommerce-Bestellungen auf, haben aber kein passendes Paket:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {orphanedSkus.map((o) => (
                      <span key={o.sku} className="px-2 py-1 rounded-lg bg-yellow-500/10 text-yellow-600 text-xs font-mono">
                        {o.sku} ({o.orderCount}x)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Package Mapping Table */}
          <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
            {mappingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
              </div>
            ) : mapping.length === 0 ? (
              <div className="text-center py-12 text-app-muted">Keine Pakete definiert</div>
            ) : (
              <div className="divide-y divide-app-border">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-app-muted bg-app-bg">
                  <div className="col-span-3">SKU</div>
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Tier</div>
                  <div className="col-span-1">Typ</div>
                  <div className="col-span-1 text-right">Preis</div>
                  <div className="col-span-1 text-right">Orders</div>
                  <div className="col-span-1 text-center">Status</div>
                </div>
                {mapping.map((pkg) => (
                  <div key={pkg.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-app-bg/50 transition-colors">
                    <div className="col-span-3 font-mono text-sm text-app-fg">{pkg.sku}</div>
                    <div className="col-span-3 text-sm text-app-fg">{pkg.name}</div>
                    <div className="col-span-2 text-xs text-app-muted">{pkg.resultingTier}</div>
                    <div className="col-span-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pkg.type === 'UPGRADE' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {pkg.type}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-sm text-app-fg">
                      {pkg.priceEurCents != null ? `${(pkg.priceEurCents / 100).toFixed(2)}€` : '—'}
                    </div>
                    <div className="col-span-1 text-right">
                      <span className={`text-sm font-medium ${pkg.orderCount > 0 ? 'text-green-500' : 'text-app-muted'}`}>
                        {pkg.orderCount}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      {pkg.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-app-muted mx-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
