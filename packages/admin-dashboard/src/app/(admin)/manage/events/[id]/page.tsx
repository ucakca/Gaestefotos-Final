'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, MapPin, User, Image, Users, Video,
  ExternalLink, Loader2, ToggleLeft, ToggleRight, Trash2,
  Clock, Shield, RefreshCw, Activity,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface EventDetail {
  id: string;
  hostId: string;
  title: string;
  slug: string | null;
  dateTime: string | null;
  locationName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await api.get<{ event: EventDetail }>(`/admin/events/${eventId}`);
      setEvent(res.data.event);
    } catch (err: any) {
      toast.error('Event nicht gefunden');
      router.push('/manage/events');
    } finally {
      setLoading(false);
    }
  }, [eventId, router]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

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
                  ? 'bg-red-500/10 text-red-500'
                  : event.isActive
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-600'
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
        <StatCard icon={Image} label="Fotos" value={event._count.photos} color="blue" />
        <StatCard icon={Users} label="Gäste" value={event._count.guests} color="green" />
        <StatCard icon={Video} label="Videos" value={event._count.videos} color="purple" />
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Event Info */}
        <div className="rounded-2xl border border-app-border bg-app-card p-5 space-y-4">
          <h3 className="font-semibold text-app-fg flex items-center gap-2">
            <Activity className="w-4 h-4 text-app-accent" />
            Event-Details
          </h3>
          <InfoRow icon={Calendar} label="Datum" value={event.dateTime ? new Date(event.dateTime).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nicht festgelegt'} />
          <InfoRow icon={MapPin} label="Ort" value={event.locationName || 'Nicht festgelegt'} />
          <InfoRow icon={Clock} label="Erstellt" value={new Date(event.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          <InfoRow icon={Clock} label="Aktualisiert" value={new Date(event.updatedAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
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
              <ToggleRight className="w-4 h-4 mr-1 text-green-500" />
            ) : (
              <ToggleLeft className="w-4 h-4 mr-1 text-yellow-500" />
            )}
            {event.isActive ? 'Deaktivieren' : 'Aktivieren'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={softDelete}
            disabled={deleting || !!event.deletedAt}
            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
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

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };
  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4 text-center">
      <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mx-auto mb-2`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-app-fg">{value}</div>
      <div className="text-xs text-app-muted">{label}</div>
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
