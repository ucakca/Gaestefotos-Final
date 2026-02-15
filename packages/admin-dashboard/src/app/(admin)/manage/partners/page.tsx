'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  Calendar,
  Image as ImageIcon,
  Printer,
  ChevronRight,
  X,
  Loader2,
  Monitor,
  Crown,
  Zap,
  Receipt,
  FileText,
  Check,
  Send,
  Ban,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface Partner {
  id: string;
  name: string;
  slug: string;
  tier: 'BRANDED' | 'WHITE_LABEL';
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  maxEvents: number;
  maxStorageGb: number;
  commissionPct: number;
  customDomain?: string;
  createdAt: string;
  _count?: { events: number; members: number; hardware: number };
}

interface PartnerFormData {
  name: string;
  slug: string;
  tier: 'BRANDED' | 'WHITE_LABEL';
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  maxEvents: number;
  maxStorageGb: number;
  commissionPct: number;
}

const TIER_LABELS: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  BRANDED: { label: 'Branded', color: 'bg-blue-100 text-blue-700', icon: Building2 },
  WHITE_LABEL: { label: 'White-Label', color: 'bg-purple-100 text-purple-700', icon: Crown },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Aktiv', color: 'bg-emerald-100 text-emerald-700' },
  SUSPENDED: { label: 'Gesperrt', color: 'bg-destructive/15 text-destructive' },
  TRIAL: { label: 'Trial', color: 'bg-amber-100 text-amber-700' },
};

const emptyForm: PartnerFormData = {
  name: '',
  slug: '',
  tier: 'BRANDED',
  contactEmail: '',
  contactPhone: '',
  companyName: '',
  maxEvents: 50,
  maxStorageGb: 100,
  commissionPct: 20,
};

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<PartnerFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [partnerDetail, setPartnerDetail] = useState<any>(null);
  const [partnerStats, setPartnerStats] = useState<any>(null);
  const [billingPeriods, setBillingPeriods] = useState<any[]>([]);
  const [showBillingGen, setShowBillingGen] = useState(false);
  const [billingStart, setBillingStart] = useState('');
  const [billingEnd, setBillingEnd] = useState('');
  const [generatingBilling, setGeneratingBilling] = useState(false);

  const loadPartners = useCallback(async () => {
    try {
      const { data } = await api.get('/partners');
      setPartners(data.partners || []);
    } catch {
      setError('Partner konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const createPartner = async () => {
    if (!formData.name || !formData.slug || !formData.contactEmail) {
      setError('Name, Slug und E-Mail sind erforderlich');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post('/partners', formData);
      setShowForm(false);
      setFormData(emptyForm);
      loadPartners();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailLoading(true);
    setBillingPeriods([]);
    try {
      const [detailRes, statsRes, billingRes] = await Promise.all([
        api.get(`/partners/${partner.id}`),
        api.get(`/partners/${partner.id}/stats`),
        api.get(`/partners/${partner.id}/billing`),
      ]);
      setPartnerDetail(detailRes.data.partner);
      setPartnerStats(statsRes.data.stats);
      setBillingPeriods(billingRes.data.periods || []);
    } catch {
      setError('Details konnten nicht geladen werden');
    } finally {
      setDetailLoading(false);
    }
  };

  const generateBilling = async () => {
    if (!selectedPartner || !billingStart || !billingEnd) return;
    setGeneratingBilling(true);
    try {
      const { data } = await api.post(`/partners/${selectedPartner.id}/billing/generate`, {
        periodStart: billingStart,
        periodEnd: billingEnd,
      });
      setBillingPeriods((prev) => [data.period, ...prev]);
      setShowBillingGen(false);
      setBillingStart('');
      setBillingEnd('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Generieren');
    } finally {
      setGeneratingBilling(false);
    }
  };

  const updateBillingStatus = async (periodId: string, status: string) => {
    if (!selectedPartner) return;
    try {
      const { data } = await api.put(`/partners/${selectedPartner.id}/billing/${periodId}`, { status });
      setBillingPeriods((prev) => prev.map((p) => p.id === periodId ? { ...p, ...data.period } : p));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Aktualisieren');
    }
  };

  const filtered = partners.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.contactEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-fg">Partner-Verwaltung</h1>
          <p className="text-sm text-app-muted mt-1">{partners.length} Partner registriert</p>
        </div>
        <Button
          onClick={() => { setShowForm(true); setFormData(emptyForm); }}
          className="flex items-center gap-2 bg-app-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Neuer Partner
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Partner suchen..."
          className="w-full pl-10 pr-4 py-2.5 bg-app-surface border border-app-border rounded-lg text-sm text-app-fg placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-accent/40"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Partner List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-app-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-app-muted">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Keine Partner gefunden</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((partner) => {
            const tier = TIER_LABELS[partner.tier] || TIER_LABELS.BRANDED;
            const status = STATUS_LABELS[partner.status] || STATUS_LABELS.ACTIVE;
            return (
              <button
                key={partner.id}
                onClick={() => openDetail(partner)}
                className="w-full bg-app-surface border border-app-border rounded-xl p-4 hover:border-app-accent/40 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-app-accent/10 flex items-center justify-center shrink-0">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-app-accent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-app-fg truncate">{partner.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tier.color}`}>{tier.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </div>
                    <div className="text-xs text-app-muted truncate">
                      {partner.companyName || partner.contactEmail} · /{partner.slug}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-app-muted">
                    <div className="flex items-center gap-1" title="Events">
                      <Calendar className="w-3.5 h-3.5" />
                      {partner._count?.events || 0}
                    </div>
                    <div className="flex items-center gap-1" title="Mitglieder">
                      <Users className="w-3.5 h-3.5" />
                      {partner._count?.members || 0}
                    </div>
                    <div className="flex items-center gap-1" title="Hardware">
                      <Monitor className="w-3.5 h-3.5" />
                      {partner._count?.hardware || 0}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-app-muted shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Create Partner Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-app-fg">Neuen Partner anlegen</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-app-hover rounded-lg">
                <X className="w-5 h-5 text-app-muted" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: formData.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                  className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  placeholder="Foto Meyer GmbH"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  placeholder="foto-meyer"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Tier</label>
                <div className="flex gap-2">
                  {(['BRANDED', 'WHITE_LABEL'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setFormData({ ...formData, tier: t })}
                      className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-all ${
                        formData.tier === t
                          ? 'border-app-accent bg-app-accent/10 text-app-accent'
                          : 'border-app-border text-app-muted hover:border-app-accent/40'
                      }`}
                    >
                      {TIER_LABELS[t].label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-app-fg block mb-1">Kontakt-E-Mail *</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  placeholder="partner@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Telefon</label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Firma</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Max Events</label>
                  <input
                    type="number"
                    value={formData.maxEvents}
                    onChange={(e) => setFormData({ ...formData, maxEvents: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Storage (GB)</label>
                  <input
                    type="number"
                    value={formData.maxStorageGb}
                    onChange={(e) => setFormData({ ...formData, maxStorageGb: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-app-fg block mb-1">Provision (%)</label>
                  <input
                    type="number"
                    value={formData.commissionPct}
                    onChange={(e) => setFormData({ ...formData, commissionPct: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm text-app-fg"
                    min={0}
                    max={100}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 bg-app-hover text-app-fg rounded-lg font-medium"
              >
                Abbrechen
              </Button>
              <Button
                onClick={createPartner}
                disabled={saving}
                className="flex-1 py-2.5 bg-app-accent text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Partner anlegen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Detail Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-app-surface border border-app-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-app-accent/10 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-app-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-app-fg">{selectedPartner.name}</h2>
                  <span className="text-xs text-app-muted">/{selectedPartner.slug}</span>
                </div>
              </div>
              <button onClick={() => { setSelectedPartner(null); setPartnerDetail(null); setPartnerStats(null); }} className="p-1 hover:bg-app-hover rounded-lg">
                <X className="w-5 h-5 text-app-muted" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-app-muted" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats */}
                {partnerStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Events', value: partnerStats.events, icon: Calendar, color: 'text-blue-500' },
                      { label: 'Fotos', value: partnerStats.photos, icon: ImageIcon, color: 'text-emerald-500' },
                      { label: 'Videos', value: partnerStats.videos, icon: Zap, color: 'text-amber-500' },
                      { label: 'Print-Jobs', value: partnerStats.printJobs, icon: Printer, color: 'text-purple-500' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-app-bg rounded-xl p-3 border border-app-border">
                        <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                        <div className="text-xl font-bold text-app-fg">{stat.value}</div>
                        <div className="text-xs text-app-muted">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Info */}
                <div className="bg-app-bg rounded-xl p-4 border border-app-border">
                  <h3 className="text-sm font-semibold text-app-fg mb-3">Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-app-muted">E-Mail:</span> <span className="text-app-fg">{selectedPartner.contactEmail}</span></div>
                    <div><span className="text-app-muted">Telefon:</span> <span className="text-app-fg">{selectedPartner.contactPhone || '—'}</span></div>
                    <div><span className="text-app-muted">Firma:</span> <span className="text-app-fg">{selectedPartner.companyName || '—'}</span></div>
                    <div><span className="text-app-muted">Tier:</span> <span className={`px-2 py-0.5 rounded-full text-xs ${TIER_LABELS[selectedPartner.tier]?.color}`}>{TIER_LABELS[selectedPartner.tier]?.label}</span></div>
                    <div><span className="text-app-muted">Max Events:</span> <span className="text-app-fg">{selectedPartner.maxEvents}</span></div>
                    <div><span className="text-app-muted">Storage:</span> <span className="text-app-fg">{selectedPartner.maxStorageGb} GB</span></div>
                    <div><span className="text-app-muted">Provision:</span> <span className="text-app-fg">{selectedPartner.commissionPct}%</span></div>
                    <div><span className="text-app-muted">Domain:</span> <span className="text-app-fg">{selectedPartner.customDomain || '—'}</span></div>
                  </div>
                </div>

                {/* Members */}
                {partnerDetail?.members && (
                  <div className="bg-app-bg rounded-xl p-4 border border-app-border">
                    <h3 className="text-sm font-semibold text-app-fg mb-3">
                      Mitglieder ({partnerDetail.members.length})
                    </h3>
                    {partnerDetail.members.length === 0 ? (
                      <p className="text-sm text-app-muted">Keine Mitglieder</p>
                    ) : (
                      <div className="space-y-2">
                        {partnerDetail.members.map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between py-2 border-b border-app-border last:border-0">
                            <div>
                              <span className="text-sm font-medium text-app-fg">{m.user?.name}</span>
                              <span className="text-xs text-app-muted ml-2">{m.user?.email}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-app-hover text-app-muted">{m.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Hardware */}
                {partnerDetail?.hardware && (
                  <div className="bg-app-bg rounded-xl p-4 border border-app-border">
                    <h3 className="text-sm font-semibold text-app-fg mb-3">
                      Hardware ({partnerDetail.hardware.length})
                    </h3>
                    {partnerDetail.hardware.length === 0 ? (
                      <p className="text-sm text-app-muted">Keine Hardware registriert</p>
                    ) : (
                      <div className="space-y-2">
                        {partnerDetail.hardware.map((hw: any) => (
                          <div key={hw.id} className="flex items-center justify-between py-2 border-b border-app-border last:border-0">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-app-muted" />
                              <div>
                                <span className="text-sm font-medium text-app-fg">{hw.name}</span>
                                <span className="text-xs text-app-muted ml-2">{hw.type}</span>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              hw.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                              hw.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{hw.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Billing */}
                <div className="bg-app-bg rounded-xl p-4 border border-app-border">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-app-fg flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-app-muted" />
                      Abrechnungen ({billingPeriods.length})
                    </h3>
                    <button
                      onClick={() => setShowBillingGen(!showBillingGen)}
                      className="text-xs text-app-accent hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Generieren
                    </button>
                  </div>

                  {showBillingGen && (
                    <div className="p-3 bg-app-surface border border-app-border rounded-lg mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-app-muted block mb-1">Von</label>
                          <input
                            type="date"
                            value={billingStart}
                            onChange={(e) => setBillingStart(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-fg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-app-muted block mb-1">Bis</label>
                          <input
                            type="date"
                            value={billingEnd}
                            onChange={(e) => setBillingEnd(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-app-bg border border-app-border rounded text-app-fg"
                          />
                        </div>
                      </div>
                      <button
                        onClick={generateBilling}
                        disabled={generatingBilling || !billingStart || !billingEnd}
                        className="w-full py-1.5 text-xs bg-app-accent text-white rounded font-medium hover:opacity-90 disabled:opacity-50"
                      >
                        {generatingBilling ? 'Generiere...' : 'Abrechnung generieren'}
                      </button>
                    </div>
                  )}

                  {billingPeriods.length === 0 ? (
                    <p className="text-sm text-app-muted">Keine Abrechnungen vorhanden</p>
                  ) : (
                    <div className="space-y-2">
                      {billingPeriods.map((bp: any) => {
                        const statusColors: Record<string, string> = {
                          DRAFT: 'bg-muted text-muted-foreground',
                          FINALIZED: 'bg-blue-100 text-blue-700',
                          SENT: 'bg-amber-100 text-amber-700',
                          PAID: 'bg-emerald-100 text-emerald-700',
                          CANCELLED: 'bg-destructive/15 text-destructive',
                        };
                        return (
                          <div key={bp.id} className="p-3 border border-app-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-app-fg">
                                {new Date(bp.periodStart).toLocaleDateString('de-DE')} – {new Date(bp.periodEnd).toLocaleDateString('de-DE')}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[bp.status] || statusColors.DRAFT}`}>
                                {bp.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-app-muted mb-2">
                              <div>{bp.totalEvents} Events</div>
                              <div>{bp.totalPhotos} Fotos</div>
                              <div>{bp.totalPrintJobs} Prints</div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="text-app-muted">Umsatz:</span>{' '}
                                <span className="font-medium text-app-fg">{bp.totalRevenue.toFixed(2)} €</span>
                                <span className="text-app-muted ml-2">Provision ({bp.commissionPct}%):</span>{' '}
                                <span className="font-medium text-app-fg">{bp.commissionAmount.toFixed(2)} €</span>
                                <span className="text-app-muted ml-2">Auszahlung:</span>{' '}
                                <span className="font-bold text-emerald-600">{bp.partnerPayout.toFixed(2)} €</span>
                              </div>
                            </div>
                            {bp.status === 'DRAFT' && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => updateBillingStatus(bp.id, 'FINALIZED')}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                  <FileText className="w-3 h-3" /> Finalisieren
                                </button>
                                <button
                                  onClick={() => updateBillingStatus(bp.id, 'CANCELLED')}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-destructive/15 text-destructive rounded hover:bg-destructive/20"
                                >
                                  <Ban className="w-3 h-3" /> Stornieren
                                </button>
                              </div>
                            )}
                            {bp.status === 'FINALIZED' && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => updateBillingStatus(bp.id, 'SENT')}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                >
                                  <Send className="w-3 h-3" /> Versendet
                                </button>
                              </div>
                            )}
                            {bp.status === 'SENT' && (
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => updateBillingStatus(bp.id, 'PAID')}
                                  className="flex items-center gap-1 text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                >
                                  <Check className="w-3 h-3" /> Bezahlt
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
