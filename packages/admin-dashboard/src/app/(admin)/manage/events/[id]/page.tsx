'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, MapPin, User, Image, Users, Video,
  ExternalLink, Loader2, ToggleLeft, ToggleRight, Trash2,
  Clock, Shield, RefreshCw, Activity, Package, ChevronDown, Check,
  Save, Edit2, Globe, Lock, Wifi, MessageSquare, X, AlertTriangle,
  Puzzle, Plus, Minus, Workflow,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { HelpButton } from '@/components/ui/HelpPanel';

interface EventDetail {
  id: string;
  hostId: string;
  title: string;
  slug: string | null;
  dateTime: string | null;
  locationName: string | null;
  locationGoogleMapsLink: string | null;
  isActive: boolean;
  password: string | null;
  guestbookHostMessage: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  profileDescription: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  workflowId: string | null;
  workflow: {
    id: string;
    name: string;
    description: string | null;
  } | null;
  host: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
  _count: {
    photos: number;
    guests: number;
    videos: number;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  // Package state
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [currentPkg, setCurrentPkg] = useState<{ sku: string | null; name: string; tier: string; source: string | null }>({ sku: null, name: 'Free', tier: 'FREE', source: null });
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [switchingPkg, setSwitchingPkg] = useState(false);
  const [pkgLoading, setPkgLoading] = useState(true);

  // Addon state
  const [addons, setAddons] = useState<any[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(true);
  const [togglingAddon, setTogglingAddon] = useState<string | null>(null);

  // Workflow state
  const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [workflowsLoading, setWorkflowsLoading] = useState(true);
  const [assigningWorkflow, setAssigningWorkflow] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get<{ event: EventDetail }>(`/admin/events/${eventId}`);
      setEvent(res.data.event);
      initEditForm(res.data.event);
    } catch (err: any) {
      toast.error('Event nicht gefunden');
      router.push('/manage/events');
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  const initEditForm = (ev: EventDetail) => {
    setEditForm({
      title: ev.title || '',
      slug: ev.slug || '',
      dateTime: ev.dateTime ? new Date(ev.dateTime).toISOString().slice(0, 16) : '',
      locationName: ev.locationName || '',
      locationGoogleMapsLink: ev.locationGoogleMapsLink || '',
      password: ev.password || '',
      wifiName: ev.wifiName || '',
      wifiPassword: ev.wifiPassword || '',
      profileDescription: ev.profileDescription || '',
      guestbookHostMessage: ev.guestbookHostMessage || '',
    });
  };

  const handleSave = async () => {
    if (!event) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {};
      if (editForm.title !== (event.title || '')) payload.title = editForm.title;
      if (editForm.slug !== (event.slug || '')) payload.slug = editForm.slug;
      const origDt = event.dateTime ? new Date(event.dateTime).toISOString().slice(0, 16) : '';
      if (editForm.dateTime !== origDt) payload.dateTime = editForm.dateTime || null;
      if (editForm.locationName !== (event.locationName || '')) payload.locationName = editForm.locationName || null;
      if (editForm.locationGoogleMapsLink !== (event.locationGoogleMapsLink || '')) payload.locationGoogleMapsLink = editForm.locationGoogleMapsLink || null;
      if (editForm.password !== (event.password || '')) payload.password = editForm.password || null;
      if (editForm.wifiName !== (event.wifiName || '')) payload.wifiName = editForm.wifiName || null;
      if (editForm.wifiPassword !== (event.wifiPassword || '')) payload.wifiPassword = editForm.wifiPassword || null;
      if (editForm.profileDescription !== (event.profileDescription || '')) payload.profileDescription = editForm.profileDescription || null;
      if (editForm.guestbookHostMessage !== (event.guestbookHostMessage || '')) payload.guestbookHostMessage = editForm.guestbookHostMessage || null;

      if (Object.keys(payload).length === 0) {
        toast.success('Keine Änderungen');
        setEditing(false);
        setSaving(false);
        return;
      }

      await api.put(`/admin/events/${event.id}`, payload);
      toast.success('Event gespeichert');
      setEditing(false);
      loadEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const loadPackageData = useCallback(async () => {
    if (!eventId) return;
    setPkgLoading(true);
    try {
      const [pkgsRes, currentRes] = await Promise.all([
        api.get(`/admin/events/${eventId}/available-packages`),
        api.get(`/admin/events/${eventId}/package`),
      ]);
      setAvailablePackages(pkgsRes.data.packages || []);
      setCurrentPkg({
        sku: currentRes.data.currentSku,
        name: currentRes.data.currentName || 'Free',
        tier: currentRes.data.currentTier || 'FREE',
        source: currentRes.data.source || null,
      });
      setSelectedSku(currentRes.data.currentSku || '');
    } catch {
      // silently fail
    } finally {
      setPkgLoading(false);
    }
  }, [eventId]);

  const loadAddons = useCallback(async () => {
    if (!eventId) return;
    setAddonsLoading(true);
    try {
      const res = await api.get(`/admin/events/${eventId}/addons`);
      setAddons(res.data.addons || []);
    } catch {
      // silently fail
    } finally {
      setAddonsLoading(false);
    }
  }, [eventId]);

  const toggleAddon = async (addon: any) => {
    setTogglingAddon(addon.sku);
    try {
      if (addon.isActive && addon.entitlementId) {
        await api.delete(`/admin/events/${eventId}/addons/${addon.entitlementId}`);
        toast.success(`${addon.name} deaktiviert`);
      } else {
        await api.post(`/admin/events/${eventId}/addons`, { sku: addon.sku });
        toast.success(`${addon.name} aktiviert`);
      }
      loadAddons();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Ändern');
    } finally {
      setTogglingAddon(null);
    }
  };

  const loadWorkflows = useCallback(async () => {
    setWorkflowsLoading(true);
    try {
      const res = await api.get('/workflows');
      setAvailableWorkflows(res.data.workflows || []);
    } catch {
      // silently fail
    } finally {
      setWorkflowsLoading(false);
    }
  }, []);

  const assignWorkflow = async () => {
    if (!event || assigningWorkflow) return;
    setAssigningWorkflow(true);
    try {
      const workflowId = selectedWorkflowId || null;
      await api.put(`/admin/events/${event.id}/workflow`, { workflowId });
      toast.success(workflowId ? 'Workflow zugewiesen' : 'Workflow entfernt');
      loadEvent();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Zuweisen');
    } finally {
      setAssigningWorkflow(false);
    }
  };

  useEffect(() => {
    loadEvent();
    loadPackageData();
    loadAddons();
    loadWorkflows();
  }, [loadEvent, loadPackageData, loadAddons, loadWorkflows]);

  const toggleActive = async () => {
    if (!event) return;
    setToggling(true);
    try {
      await api.patch(`/admin/events/${event.id}/status`, { isActive: !event.isActive });
      toast.success(event.isActive ? 'Event deaktiviert' : 'Event aktiviert');
      loadEvent();
    } catch {
      toast.error('Fehler beim Ändern des Status');
    } finally {
      setToggling(false);
    }
  };

  const changePackage = async () => {
    if (!selectedSku || switchingPkg) return;
    if (selectedSku === currentPkg.sku) {
      toast.error('Event ist bereits auf diesem Paket');
      return;
    }
    setSwitchingPkg(true);
    try {
      const res = await api.put(`/admin/events/${eventId}/change-package`, { sku: selectedSku });
      toast.success(`Paket geändert: ${res.data.previousSku || 'free'} → ${res.data.newName}`);
      loadPackageData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Fehler beim Paketwechsel');
    } finally {
      setSwitchingPkg(false);
    }
  };

  const softDelete = async () => {
    if (!event) return;
    if (!confirm(`Event "${event.title}" wirklich löschen (Soft Delete)?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/events/${event.id}`);
      toast.success('Event gelöscht');
      router.push('/manage/events');
    } catch {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
      </div>
    );
  }

  if (!event) return null;

  const isLive = event.isActive && event.dateTime && new Date(event.dateTime) >= new Date(new Date().setHours(0, 0, 0, 0));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/manage/events')} className="p-2 rounded-lg hover:bg-app-bg transition-colors">
          <ArrowLeft className="w-5 h-5 text-app-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-app-fg">{event.title}</h1>
          <div className="flex items-center gap-3 text-sm text-app-muted mt-0.5">
            <span className="font-mono">/{event.slug || '—'}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                event.deletedAt
                  ? 'bg-destructive/100/10 text-destructive'
                  : event.isActive
                  ? 'bg-success/100/10 text-success'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {event.deletedAt ? 'Gelöscht' : event.isActive ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadEvent}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <a
            href={`https://app.xn--gstefotos-v2a.com/events/${event.id}/dashboard`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline">
              <ExternalLink className="w-4 h-4 mr-1" /> Öffnen
            </Button>
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => router.push(`/manage/events/${event.id}/photos`)} className="text-left">
          <StatCard icon={Image} label="Fotos" value={event._count.photos} color="blue" clickable />
        </button>
        <StatCard icon={Users} label="Gäste" value={event._count.guests} color="green" />
        <StatCard icon={Video} label="Videos" value={event._count.videos} color="purple" />
      </div>

      {/* Event-Details: Edit Mode */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Activity className="w-4 h-4 text-app-accent" />
            Event-Details
          </h3>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" /> Bearbeiten
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); if (event) initEditForm(event); }}>
                <X className="w-4 h-4 mr-1" /> Abbrechen
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-success hover:bg-success text-white">
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Speichere...' : 'Speichern'}
              </Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-app-muted mb-1">Event-Titel</label>
              <input type="text" value={editForm.title || ''} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><Globe className="w-3 h-3" /> Slug (URL)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-app-muted shrink-0">app.gästefotos.com/e3/</span>
                <input type="text" value={editForm.slug || ''} onChange={(e) => setEditForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} className="flex-1 px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><Calendar className="w-3 h-3" /> Datum & Uhrzeit</label>
                <input type="datetime-local" value={editForm.dateTime || ''} onChange={(e) => setEditForm(f => ({ ...f, dateTime: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><MapPin className="w-3 h-3" /> Ort</label>
                <input type="text" value={editForm.locationName || ''} onChange={(e) => setEditForm(f => ({ ...f, locationName: e.target.value }))} placeholder="z.B. Schloss Mirabell" className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-app-muted mb-1 block">Google Maps Link</label>
              <input type="url" value={editForm.locationGoogleMapsLink || ''} onChange={(e) => setEditForm(f => ({ ...f, locationGoogleMapsLink: e.target.value }))} placeholder="https://maps.google.com/..." className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><Lock className="w-3 h-3" /> Event-Passwort</label>
              <input type="text" value={editForm.password || ''} onChange={(e) => setEditForm(f => ({ ...f, password: e.target.value }))} placeholder="Leer = kein Passwort" className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><Wifi className="w-3 h-3" /> WiFi-Name</label>
                <input type="text" value={editForm.wifiName || ''} onChange={(e) => setEditForm(f => ({ ...f, wifiName: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
              <div>
                <label className="text-xs font-medium text-app-muted mb-1 block">WiFi-Passwort</label>
                <input type="text" value={editForm.wifiPassword || ''} onChange={(e) => setEditForm(f => ({ ...f, wifiPassword: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-app-muted mb-1 block">Profilbeschreibung</label>
              <textarea value={editForm.profileDescription || ''} onChange={(e) => setEditForm(f => ({ ...f, profileDescription: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none" />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-app-muted mb-1"><MessageSquare className="w-3 h-3" /> Gästebuch-Nachricht</label>
              <textarea value={editForm.guestbookHostMessage || ''} onChange={(e) => setEditForm(f => ({ ...f, guestbookHostMessage: e.target.value }))} rows={2} className="w-full px-3 py-2 rounded-xl border border-app-border bg-app-bg text-app-fg text-sm focus:outline-none focus:ring-2 focus:ring-app-accent resize-none" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <InfoRow icon={Calendar} label="Datum" value={event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nicht festgelegt'} />
            <InfoRow icon={MapPin} label="Ort" value={event.locationName || 'Nicht festgelegt'} />
            <InfoRow icon={Lock} label="Passwort" value={event.password || 'Keins'} />
            <InfoRow icon={Wifi} label="WiFi" value={event.wifiName ? `${event.wifiName} / ${event.wifiPassword || '—'}` : 'Nicht konfiguriert'} />
            <InfoRow icon={Clock} label="Erstellt" value={new Date(event.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            <InfoRow icon={Clock} label="Aktualisiert" value={new Date(event.updatedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          </div>
        )}
      </div>

      {/* Host Info */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <h3 className="font-semibold text-app-fg flex items-center gap-2">
          <User className="w-4 h-4 text-app-accent" />
          Host
        </h3>
        {event.host ? (
          <>
            <InfoRow icon={User} label="Name" value={event.host.name || 'Kein Name'} />
            <InfoRow icon={Shield} label="E-Mail" value={event.host.email} />
            <InfoRow icon={Shield} label="Rolle" value={event.host.role} />
            <button
              onClick={() => router.push('/manage/users')}
              className="text-sm text-app-accent hover:underline"
            >
              Zum Benutzer-Profil →
            </button>
          </>
        ) : (
          <p className="text-sm text-app-muted">Kein Host zugewiesen</p>
        )}
      </div>

      {/* Package Management */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <h3 className="font-semibold text-app-fg flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-500" />
          Paket verwalten
          <HelpButton
            title="Paket-Verwaltung"
            sections={[
              {
                title: 'Base-Paket wechseln',
                content: 'Hier kannst du das Basis-Paket eines Events direkt ändern — ohne WooCommerce.\n\nDas alte Entitlement wird auf REPLACED gesetzt, das neue sofort aktiviert. Feature-Flags und Limits des neuen Pakets gelten ab sofort.',
              },
              {
                title: 'WooCommerce-Sync',
                content: 'Normalerweise wird das Paket automatisch über WooCommerce zugewiesen, wenn der Kunde kauft.\n\nManuelle Änderungen hier überschreiben die WooCommerce-Zuweisung. Bei einer neuen WooCommerce-Bestellung mit eventCode wird das Paket erneut überschrieben.',
              },
              {
                title: 'eventCode',
                content: 'Jedes Event hat einen eindeutigen eventCode. Wenn ein Kunde im WooCommerce-Shop bestellt und den eventCode mitliefert, wird das Paket automatisch dem richtigen Event zugewiesen.\n\nDer eventCode kann aus der App heraus als URL-Parameter an den Shop übergeben werden.',
              },
            ]}
            docsLink="https://github.com/ucakca/Gaestefotos-Final/blob/master/docs/woocommerce-setup.md"
          />
        </h3>

        {pkgLoading ? (
          <div className="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Paket-Info...
          </div>
        ) : (
          <>
            {/* Current Package */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-app-bg">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-app-fg">{currentPkg.name}</div>
                <div className="text-xs text-app-muted">
                  Tier: {currentPkg.tier} • SKU: {currentPkg.sku || 'none'}
                  {currentPkg.source && <span> • Quelle: {currentPkg.source}</span>}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                Aktiv
              </span>
            </div>

            {/* Package Selector */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-app-muted mb-1">Neues Paket wählen</label>
                <div className="relative">
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-app-border bg-app-card text-app-fg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                  >
                    <option value="">— Paket wählen —</option>
                    {availablePackages.map((pkg: any) => (
                      <option key={pkg.id} value={pkg.sku}>
                        {pkg.name} ({pkg.resultingTier}){pkg.sku === currentPkg.sku ? ' ✓ aktuell' : ''}
                        {pkg.priceEurCents ? ` — ${(pkg.priceEurCents / 100).toFixed(2)}€` : ' — Kostenlos'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none" />
                </div>
              </div>
              <Button
                size="sm"
                onClick={changePackage}
                disabled={!selectedSku || selectedSku === currentPkg.sku || switchingPkg}
                className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
              >
                {switchingPkg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Wechseln
              </Button>
            </div>

            {selectedSku && selectedSku !== currentPkg.sku && (
              <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                ⚠️ Das Paket wird sofort gewechselt. Feature-Flags und Limits des neuen Pakets gelten ab sofort.
              </div>
            )}
          </>
        )}
      </div>

      {/* Addons */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <h3 className="font-semibold text-app-fg flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-purple-500" />
          Add-ons verwalten
          <HelpButton
            title="Event-Addons"
            sections={[
              {
                title: 'Was sind Addons?',
                content: 'Addons schalten zusätzliche Features für ein einzelnes Event frei — unabhängig vom Base-Paket.\n\nBeispiel: Ein Event mit \"Starter\"-Paket hat kein Mosaic Wall. Durch Hinzufügen des Addons \"Mosaic Wall\" wird es freigeschaltet.',
              },
              {
                title: 'WooCommerce-Integration',
                content: 'Wenn ein Kunde im WooCommerce-Shop ein Addon kauft, wird es automatisch dem Event zugewiesen — vorausgesetzt der eventCode ist in der Bestellung enthalten.\n\nOhne eventCode bei reinen Addon-Bestellungen wird der Webhook ignoriert.',
              },
              {
                title: 'Manuelles Addon (Admin)',
                content: 'Hier kannst du Addons direkt hinzufügen oder entfernen — ohne WooCommerce. Ideal für:\n• Testing & Entwicklung\n• Support-Fälle\n• Demo-Events\n\nÄnderungen gelten sofort.',
              },
              {
                title: 'Mosaic Wall Pakete',
                content: '• Mosaic Wall (Digital): Digitale Mosaik-Wand + HD-Export\n• Mosaic Wall Print + Digital: Alles aus Digital + Print-Station + Sticker-Druck\n\nPrint beinhaltet immer Digital.',
              },
            ]}
            docsLink="https://github.com/ucakca/Gaestefotos-Final/blob/master/docs/woocommerce-setup.md"
          />
        </h3>
        <p className="text-xs text-app-muted">
          Addons schalten zusätzliche Features für dieses Event frei (Mosaic Wall, Print, etc.)
        </p>

        {addonsLoading ? (
          <div className="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Addons...
          </div>
        ) : addons.length === 0 ? (
          <div className="text-sm text-app-muted p-3 bg-app-bg rounded-xl">
            Keine Add-on Pakete vorhanden. Erstelle Pakete mit Typ "Add-on" in der
            <button onClick={() => router.push('/manage/packages')} className="text-app-accent hover:underline ml-1">
              Paketverwaltung
            </button>.
          </div>
        ) : (() => {
          const printAddonActive = addons.some((a: any) => a.isActive && a.allowMosaicPrint);
          return (
            <div className="space-y-2">
              {addons.map((addon: any) => {
                const isDigitalOnly = addon.allowMosaicWall && !addon.allowMosaicPrint;
                const coveredByPrint = isDigitalOnly && printAddonActive && !addon.isActive;

                return (
                  <div
                    key={addon.sku}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      coveredByPrint
                        ? 'border-blue-500/20 bg-blue-500/5 opacity-60'
                        : addon.isActive
                          ? 'border-purple-500/30 bg-purple-500/5'
                          : 'border-app-border bg-app-bg'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      coveredByPrint ? 'bg-blue-500/10' : addon.isActive ? 'bg-purple-500/10' : 'bg-app-bg'
                    }`}>
                      <Puzzle className={`w-5 h-5 ${
                        coveredByPrint ? 'text-blue-500' : addon.isActive ? 'text-purple-500' : 'text-app-muted'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-app-fg text-sm">{addon.name}</div>
                      {coveredByPrint ? (
                        <div className="text-xs text-blue-500 font-medium">Bereits in Print + Digital enthalten</div>
                      ) : (
                        <>
                          {addon.description && (
                            <div className="text-xs text-app-muted truncate">{addon.description}</div>
                          )}
                          {addon.priceEurCents && (
                            <div className="text-xs text-success font-medium mt-0.5">
                              {(addon.priceEurCents / 100).toFixed(0)} €
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    {coveredByPrint ? (
                      <span className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500">
                        <Check className="w-3 h-3" /> Enthalten
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleAddon(addon)}
                        disabled={togglingAddon === addon.sku}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                          addon.isActive
                            ? 'bg-destructive/100/10 text-destructive hover:bg-destructive/100/20'
                            : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20'
                        }`}
                      >
                        {togglingAddon === addon.sku ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : addon.isActive ? (
                          <><Minus className="w-3 h-3" /> Entfernen</>
                        ) : (
                          <><Plus className="w-3 h-3" /> Hinzufügen</>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Workflow Zuweisen */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <h3 className="font-semibold text-app-fg flex items-center gap-2">
          <Workflow className="w-4 h-4 text-blue-500" />
          Booth-Workflow
        </h3>
        <p className="text-xs text-app-muted">
          Weise diesem Event einen Booth-Ablauf zu. Der Workflow definiert den gesamten Flow der Photo Booth (Start → Countdown → Foto → Teilen).
        </p>

        {workflowsLoading ? (
          <div className="flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Workflows...
          </div>
        ) : (
          <>
            {/* Current Workflow */}
            {event.workflow ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-app-fg">{event.workflow.name}</div>
                  {event.workflow.description && (
                    <div className="text-xs text-app-muted">{event.workflow.description}</div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                  Aktiv
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-app-bg border border-app-border">
                <div className="w-10 h-10 rounded-lg bg-app-bg flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-app-muted" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-app-muted">Kein Workflow zugewiesen</div>
                  <div className="text-xs text-app-muted">Standard-Ablauf wird verwendet</div>
                </div>
              </div>
            )}

            {/* Workflow Selector */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-app-muted mb-1">Workflow wählen</label>
                <div className="relative">
                  <select
                    value={selectedWorkflowId}
                    onChange={(e) => setSelectedWorkflowId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-app-border bg-app-card text-app-fg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  >
                    <option value="">— Kein Workflow (Standard) —</option>
                    {availableWorkflows.map((wf: any) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name}{wf.isDefault ? ' ✓ Standard' : ''}{wf.id === event.workflowId ? ' (aktuell)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none" />
                </div>
              </div>
              <Button
                size="sm"
                onClick={assignWorkflow}
                disabled={assigningWorkflow || (selectedWorkflowId === (event.workflowId || ''))}
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {assigningWorkflow ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                Zuweisen
              </Button>
            </div>

            {availableWorkflows.length === 0 && (
              <div className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2">
                Noch keine Workflows erstellt.{' '}
                <button
                  onClick={() => router.push('/manage/workflows')}
                  className="underline hover:no-underline"
                >
                  Zum Workflow Builder →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
        <h3 className="font-semibold text-app-fg">Aktionen</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleActive}
            disabled={toggling || !!event.deletedAt}
          >
            {toggling ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : event.isActive ? (
              <ToggleRight className="w-4 h-4 mr-1 text-success" />
            ) : (
              <ToggleLeft className="w-4 h-4 mr-1 text-warning" />
            )}
            {event.isActive ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={softDelete}
            disabled={deleting || !!event.deletedAt}
            className="text-destructive border-destructive/30 hover:bg-destructive/100/10"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Löschen
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, clickable }: { icon: any; label: string; value: number; color: string; clickable?: boolean }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-success/100/10 text-success',
    purple: 'bg-purple-500/10 text-purple-500',
  };
  return (
    <div className={`rounded-2xl border border-app-border bg-app-card p-4 text-center transition-all ${clickable ? 'hover:border-app-accent hover:shadow-lg cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-app-fg">{value}</div>
      <div className="text-xs text-app-muted">{label}</div>
      {clickable && <div className="text-xs text-app-accent mt-1">Klicken zum Öffnen →</div>}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-app-muted mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-xs text-app-muted">{label}</div>
        <div className="text-sm text-app-fg">{value}</div>
      </div>
    </div>
  );
}
