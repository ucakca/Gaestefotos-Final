'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Phone, Clock, CheckCircle2, XCircle, Loader2, Search, Download, BarChart3, Settings } from 'lucide-react';

interface SmsLog {
  id: string;
  eventId: string;
  eventTitle?: string;
  phoneNumber: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  provider: string;
  createdAt: string;
  deliveredAt?: string;
  errorMessage?: string;
}

interface SmsStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalPending: number;
  costCents: number;
}

interface SmsConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  isConfigured: boolean;
  defaultMessage: string;
}

export default function SmsAdminPage() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [stats, setStats] = useState<SmsStats | null>(null);
  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'stats' | 'config'>('logs');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const [logsRes, statsRes, configRes] = await Promise.all([
        fetch(`/api/sms/admin/logs?${params}`, { credentials: 'include' }),
        fetch('/api/sms/admin/stats', { credentials: 'include' }),
        fetch('/api/sms/admin/config', { credentials: 'include' }),
      ]);

      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
        setTotalLogs(logsData.total || 0);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }
    } catch (err) {
      console.error('Failed to load SMS data', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sms/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          twilioAccountSid: config.twilioAccountSid,
          twilioAuthToken: config.twilioAuthToken,
          twilioPhoneNumber: config.twilioPhoneNumber,
          defaultMessage: config.defaultMessage,
        }),
      });
      if (res.ok) {
        showToast('Konfiguration gespeichert', 'success');
      } else {
        showToast('Fehler beim Speichern', 'error');
      }
    } catch {
      showToast('Netzwerkfehler', 'error');
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DELIVERED':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success"><CheckCircle2 className="w-3 h-3" />Zugestellt</span>;
      case 'SENT':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"><Send className="w-3 h-3" />Gesendet</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning"><Clock className="w-3 h-3" />Ausstehend</span>;
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive"><XCircle className="w-3 h-3" />Fehlgeschlagen</span>;
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  }

  const filteredLogs = searchQuery
    ? logs.filter(l =>
        l.phoneNumber.includes(searchQuery) ||
        l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.eventTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(totalLogs / 25);

  const tabs = [
    { key: 'logs' as const, label: 'SMS Verlauf', icon: MessageSquare },
    { key: 'stats' as const, label: 'Statistiken', icon: BarChart3 },
    { key: 'config' as const, label: 'Konfiguration', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-success' : 'bg-destructive'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-600" />
          SMS Sharing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          SMS-Versand für Foto-Links — Twilio Integration
        </p>
      </div>

      {/* Config Warning */}
      {config && !config.isConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Phone className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Twilio nicht konfiguriert</p>
            <p className="text-xs text-amber-600 mt-1">
              SMS-Versand ist deaktiviert. Konfiguriere deine Twilio-Credentials unter "Konfiguration".
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b flex">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-muted-foreground hover:text-foreground/80'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <input
                type="text"
                placeholder="Suche nach Nummer, Event, Nachricht..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">Alle Status</option>
              <option value="DELIVERED">Zugestellt</option>
              <option value="SENT">Gesendet</option>
              <option value="PENDING">Ausstehend</option>
              <option value="FAILED">Fehlgeschlagen</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-card rounded-xl border p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Keine SMS-Nachrichten gefunden</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empfänger</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nachricht</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-mono text-foreground">{log.phoneNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{log.eventTitle || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{log.message}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(log.createdAt).toLocaleString('de-DE')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-xs text-muted-foreground">{totalLogs} SMS insgesamt</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted/50 disabled:opacity-30"
                    >
                      Zurück
                    </button>
                    <span className="px-3 py-1 text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border rounded hover:bg-muted/50 disabled:opacity-30"
                    >
                      Weiter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {stats ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-card rounded-xl border p-5 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Gesamt gesendet</div>
                  <div className="text-2xl font-bold text-foreground">{stats.totalSent}</div>
                </div>
                <div className="bg-card rounded-xl border p-5 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Zugestellt</div>
                  <div className="text-2xl font-bold text-success">{stats.totalDelivered}</div>
                </div>
                <div className="bg-card rounded-xl border p-5 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Fehlgeschlagen</div>
                  <div className="text-2xl font-bold text-destructive">{stats.totalFailed}</div>
                </div>
                <div className="bg-card rounded-xl border p-5 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Ausstehend</div>
                  <div className="text-2xl font-bold text-warning">{stats.totalPending}</div>
                </div>
                <div className="bg-card rounded-xl border p-5 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">Kosten (geschätzt)</div>
                  <div className="text-2xl font-bold text-foreground">{(stats.costCents / 100).toFixed(2)} €</div>
                </div>
              </div>

              {stats.totalSent > 0 && (
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Zustellrate</h3>
                  <div className="w-full bg-muted/80 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-success/100 rounded-full transition-all"
                      style={{ width: `${(stats.totalDelivered / stats.totalSent * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{(stats.totalDelivered / stats.totalSent * 100).toFixed(1)}% Zustellrate</span>
                    <span>{stats.totalDelivered} / {stats.totalSent}</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-xl border p-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Keine Statistiken verfügbar</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Config */}
      {activeTab === 'config' && config && (
        <div className="bg-card rounded-xl border p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-1">Twilio Konfiguration</h3>
            <p className="text-sm text-muted-foreground">Verbinde deinen Twilio-Account für den SMS-Versand</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Account SID</label>
              <input
                type="text"
                value={config.twilioAccountSid}
                onChange={(e) => setConfig({ ...config, twilioAccountSid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full border rounded-lg px-4 py-2.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Auth Token</label>
              <input
                type="password"
                value={config.twilioAuthToken}
                onChange={(e) => setConfig({ ...config, twilioAuthToken: e.target.value })}
                placeholder="••••••••••••••••••••••"
                className="w-full border rounded-lg px-4 py-2.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">Twilio Telefonnummer</label>
              <input
                type="text"
                value={config.twilioPhoneNumber}
                onChange={(e) => setConfig({ ...config, twilioPhoneNumber: e.target.value })}
                placeholder="+49..."
                className="w-full border rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">Standard-Nachrichtenvorlage</label>
            <textarea
              value={config.defaultMessage}
              onChange={(e) => setConfig({ ...config, defaultMessage: e.target.value })}
              rows={3}
              placeholder="Hallo! Hier sind deine Fotos von {eventTitle}: {link}"
              className="w-full border rounded-lg px-4 py-2.5 text-sm"
            />
            <p className="text-xs text-muted-foreground/70 mt-1">
              Variablen: {'{eventTitle}'}, {'{link}'}, {'{guestName}'}
            </p>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
