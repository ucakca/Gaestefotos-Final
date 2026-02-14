'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  Download,
  Mail,
  Phone,
  Filter,
  Loader2,
  BarChart3,
  CheckCircle2,
  XCircle,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  consentGiven: boolean;
  exportedAt: string | null;
  createdAt: string;
}

interface LeadStats {
  total: number;
  withEmail: number;
  withConsent: number;
  bySource: Record<string, number>;
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  GALLERY: { label: 'Galerie', color: 'bg-blue-100 text-blue-700' },
  BOOTH: { label: 'Booth', color: 'bg-purple-100 text-purple-700' },
  QR_CODE: { label: 'QR-Code', color: 'bg-emerald-100 text-emerald-700' },
  FACE_SEARCH: { label: 'Gesichtserkennung', color: 'bg-amber-100 text-amber-700' },
  GUESTBOOK: { label: 'Gästebuch', color: 'bg-pink-100 text-pink-700' },
  WIFI_PORTAL: { label: 'WiFi-Portal', color: 'bg-cyan-100 text-cyan-700' },
  INVITATION: { label: 'Einladung', color: 'bg-indigo-100 text-indigo-700' },
};

export default function LeadsPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const params: any = { page, limit: 50 };
      if (sourceFilter) params.source = sourceFilter;

      const [leadsRes, statsRes] = await Promise.all([
        api.get(`/leads/event/${eventId}`, { params }),
        api.get(`/leads/event/${eventId}/stats`),
      ]);

      setLeads(leadsRes.data.leads || []);
      setTotal(leadsRes.data.total || 0);
      setStats(statsRes.data.stats || null);
    } catch (err) {
      console.error('Failed to load leads', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, page, sourceFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async () => {
    try {
      const response = await api.get(`/leads/event/${eventId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${eventId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      loadData();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Lead-Management</h1>
              <p className="text-sm text-muted-foreground mt-1">Kontaktdaten von Event-Besuchern verwalten und exportieren</p>
            </div>
            <Button onClick={handleExport} disabled={total === 0}>
              <Download className="w-4 h-4 mr-2" />
              CSV Export
            </Button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Users className="w-4 h-4" /> Gesamt
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Mail className="w-4 h-4" /> Mit E-Mail
                </div>
                <div className="text-2xl font-bold text-foreground">{stats.withEmail}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" /> Mit Einwilligung
                </div>
                <div className="text-2xl font-bold text-emerald-600">{stats.withConsent}</div>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <BarChart3 className="w-4 h-4" /> Quellen
                </div>
                <div className="text-2xl font-bold text-foreground">{Object.keys(stats.bySource).length}</div>
              </div>
            </div>
          )}

          {/* Source breakdown */}
          {stats && Object.keys(stats.bySource).length > 0 && (
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Nach Quelle</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSourceFilter('')}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    !sourceFilter ? 'bg-app-accent text-white border-app-accent' : 'bg-card text-muted-foreground border-border hover:bg-app-hover'
                  }`}
                >
                  Alle ({stats.total})
                </button>
                {Object.entries(stats.bySource).map(([source, count]) => {
                  const info = SOURCE_LABELS[source] || { label: source, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <button
                      key={source}
                      onClick={() => setSourceFilter(source === sourceFilter ? '' : source)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        sourceFilter === source ? 'bg-app-accent text-white border-app-accent' : `${info.color} border-transparent`
                      }`}
                    >
                      {info.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leads Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Noch keine Leads erfasst</p>
                <p className="text-xs mt-1">Leads werden automatisch erfasst wenn Gäste ihre Daten eingeben</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-app-hover border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-Mail</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefon</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quelle</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Einwilligung</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Datum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {leads.map((lead) => {
                      const info = SOURCE_LABELS[lead.source] || { label: lead.source, color: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={lead.id} className="hover:bg-app-hover transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{lead.name || '–'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lead.email || '–'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{lead.phone || '–'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            {lead.consentGiven ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-300" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(lead.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 50 && (
              <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                <span>{total} Leads gesamt</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 rounded border border-border disabled:opacity-50"
                  >
                    Zurück
                  </button>
                  <span className="px-3 py-1">Seite {page}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={leads.length < 50}
                    className="px-3 py-1 rounded border border-border disabled:opacity-50"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <DashboardFooter eventId={eventId} />
      </AppLayout>
    </ProtectedRoute>
  );
}
