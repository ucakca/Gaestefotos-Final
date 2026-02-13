'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Calendar,
  Image as ImageIcon,
  Printer,
  Monitor,
  Users,
  TrendingUp,
  ExternalLink,
  Palette,
  ChevronRight,
  Loader2,
  Zap,
  Receipt,
  FileText,
  CreditCard,
  Plus,
  Trash2,
  Package,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/Button';

interface Subscription {
  id: string;
  plan: string;
  interval: string;
  status: string;
  pricePerMonthCents: number;
  discountPct: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt: string | null;
  notes: string | null;
  devices: DeviceLicense[];
}

interface DeviceLicense {
  id: string;
  deviceType: string;
  pricePerMonthCents: number;
  isActive: boolean;
  hardwareId: string | null;
}

interface PartnerInfo {
  id: string;
  name: string;
  slug: string;
  tier: string;
  status: string;
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  customDomain?: string;
  maxEvents: number;
  maxStorageGb: number;
  commissionPct: number;
  members: any[];
  hardware: any[];
  _count: { events: number };
}

interface PartnerStats {
  events: number;
  photos: number;
  videos: number;
  printJobs: number;
}

interface PartnerEvent {
  id: string;
  title: string;
  slug: string;
  dateTime: string | null;
  isActive: boolean;
  createdAt: string;
  host: { name: string; email: string };
  _count: { photos: number; videos: number };
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [events, setEvents] = useState<PartnerEvent[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartnerData = useCallback(async () => {
    try {
      const { data: listData } = await api.get('/partners');
      const partners = listData.partners || [];

      if (partners.length === 0) {
        setError('Kein Partner-Zugang gefunden');
        setLoading(false);
        return;
      }

      const partnerId = partners[0].id;

      const [detailRes, statsRes, eventsRes, billingRes, subsRes] = await Promise.all([
        api.get(`/partners/${partnerId}`),
        api.get(`/partners/${partnerId}/stats`),
        api.get(`/partners/${partnerId}/events`),
        api.get(`/partners/${partnerId}/billing`),
        api.get(`/partners/${partnerId}/subscriptions`),
      ]);

      setPartner(detailRes.data.partner);
      setStats(statsRes.data.stats);
      setEvents(eventsRes.data.events || []);
      setBillingPeriods(billingRes.data.periods || []);
      setSubscriptions(subsRes.data.subscriptions || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPartnerData();
  }, [loadPartnerData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{error || 'Partner nicht gefunden'}</p>
          <Link href="/dashboard" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b px-4 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-indigo-600" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{partner.name}</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded-full ${
                    partner.tier === 'WHITE_LABEL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {partner.tier === 'WHITE_LABEL' ? 'White-Label' : 'Branded'}
                  </span>
                  <span>·</span>
                  <span>/{partner.slug}</span>
                </div>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              Meine Events <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Events', value: stats.events, max: partner.maxEvents, icon: Calendar, color: 'bg-blue-500' },
                { label: 'Fotos', value: stats.photos, icon: ImageIcon, color: 'bg-emerald-500' },
                { label: 'Videos', value: stats.videos, icon: Zap, color: 'bg-amber-500' },
                { label: 'Print-Jobs', value: stats.printJobs, icon: Printer, color: 'bg-purple-500' },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                      <stat.icon className={`w-4.5 h-4.5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="text-sm text-gray-500">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stat.value}
                    {stat.max && (
                      <span className="text-sm font-normal text-gray-400 ml-1">/ {stat.max}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Events List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Partner-Events ({events.length})</h2>
                </div>
                {events.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Noch keine Events</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {events.slice(0, 10).map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}/dashboard`}
                        className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{event.title}</span>
                            {event.isActive && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Live</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {event.host?.name} · {event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE') : 'Kein Datum'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> {event._count?.photos || 0}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Hardware */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  Hardware ({partner.hardware?.length || 0})
                </h3>
                {(!partner.hardware || partner.hardware.length === 0) ? (
                  <p className="text-sm text-gray-400">Keine Hardware registriert</p>
                ) : (
                  <div className="space-y-2">
                    {partner.hardware.map((hw: any) => (
                      <div key={hw.id} className="flex items-center justify-between py-1.5">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{hw.name}</span>
                          <span className="text-gray-400 text-xs ml-1">{hw.type}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          hw.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                          hw.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{hw.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  Team ({partner.members?.length || 0})
                </h3>
                {(!partner.members || partner.members.length === 0) ? (
                  <p className="text-sm text-gray-400">Keine Mitglieder</p>
                ) : (
                  <div className="space-y-2">
                    {partner.members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between py-1.5">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">{m.user?.name}</span>
                          <span className="text-gray-400 text-xs ml-1">{m.user?.email}</span>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{m.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Branding (White-Label only) */}
              {partner.tier === 'WHITE_LABEL' && (
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-gray-400" />
                    Branding
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Primary:</span>
                      <div
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: partner.primaryColor || '#6366f1' }}
                      />
                      <span className="text-gray-700 font-mono text-xs">{partner.primaryColor || '#6366f1'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Accent:</span>
                      <div
                        className="w-5 h-5 rounded-full border"
                        style={{ backgroundColor: partner.accentColor || '#10b981' }}
                      />
                      <span className="text-gray-700 font-mono text-xs">{partner.accentColor || '#10b981'}</span>
                    </div>
                    {partner.customDomain && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Domain:</span>
                        <span className="text-gray-700">{partner.customDomain}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Billing */}
              {billingPeriods.length > 0 && (
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    Abrechnungen
                  </h3>
                  <div className="space-y-2">
                    {billingPeriods.slice(0, 5).map((bp: any) => {
                      const statusLabels: Record<string, { label: string; color: string }> = {
                        DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-600' },
                        FINALIZED: { label: 'Finalisiert', color: 'bg-blue-100 text-blue-700' },
                        SENT: { label: 'Versendet', color: 'bg-amber-100 text-amber-700' },
                        PAID: { label: 'Bezahlt', color: 'bg-emerald-100 text-emerald-700' },
                        CANCELLED: { label: 'Storniert', color: 'bg-red-100 text-red-700' },
                      };
                      const s = statusLabels[bp.status] || statusLabels.DRAFT;
                      return (
                        <div key={bp.id} className="p-2.5 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">
                              {new Date(bp.periodStart).toLocaleDateString('de-DE')} – {new Date(bp.periodEnd).toLocaleDateString('de-DE')}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{bp.totalEvents} Events · {bp.totalPrintJobs} Prints</span>
                            <span className="font-semibold text-emerald-600">{bp.partnerPayout.toFixed(2)} €</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Subscriptions */}
              <div className="bg-white rounded-xl border p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  Abonnements ({subscriptions.length})
                </h3>
                {subscriptions.length === 0 ? (
                  <p className="text-sm text-gray-400">Kein aktives Abo</p>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => {
                      const statusColors: Record<string, string> = {
                        ACTIVE: 'bg-emerald-100 text-emerald-700',
                        PAST_DUE: 'bg-red-100 text-red-700',
                        CANCELLED: 'bg-gray-100 text-gray-500',
                        PAUSED: 'bg-amber-100 text-amber-700',
                      };
                      const monthlyTotal = sub.devices
                        .filter(d => d.isActive)
                        .reduce((s, d) => s + d.pricePerMonthCents, sub.pricePerMonthCents);
                      const effectiveMonthly = sub.discountPct > 0
                        ? Math.round(monthlyTotal * (1 - sub.discountPct / 100))
                        : monthlyTotal;

                      return (
                        <div key={sub.id} className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-indigo-500" />
                              <span className="text-sm font-semibold text-gray-900">{sub.plan}</span>
                              <span className="text-xs text-gray-400">{sub.interval === 'YEARLY' ? 'Jährlich' : 'Monatlich'}</span>
                            </div>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[sub.status] || 'bg-gray-100 text-gray-500'}`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(sub.currentPeriodStart).toLocaleDateString('de-DE')} – {new Date(sub.currentPeriodEnd).toLocaleDateString('de-DE')}
                          </div>
                          {sub.devices.length > 0 && (
                            <div className="space-y-1 mb-2">
                              {sub.devices.filter(d => d.isActive).map((d) => (
                                <div key={d.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">{d.deviceType.replace(/_/g, ' ')}</span>
                                  <span className="text-gray-500">{(d.pricePerMonthCents / 100).toFixed(2)} €/Mo</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                            <span className="text-xs text-gray-500">Gesamt/Monat</span>
                            <span className="text-sm font-bold text-indigo-600">
                              {(effectiveMonthly / 100).toFixed(2)} €
                              {sub.discountPct > 0 && (
                                <span className="text-xs font-normal text-emerald-600 ml-1">(-{sub.discountPct}%)</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Info */}
              <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500">
                <div className="flex justify-between mb-1">
                  <span>Storage-Limit:</span>
                  <span className="font-medium text-gray-700">{partner.maxStorageGb} GB</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Event-Limit:</span>
                  <span className="font-medium text-gray-700">{partner.maxEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provision:</span>
                  <span className="font-medium text-gray-700">{partner.commissionPct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
