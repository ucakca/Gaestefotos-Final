'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Search, RefreshCw, Image, Users, Loader2, ExternalLink, UserPlus } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Event {
  id: string;
  title: string;
  slug: string | null;
  dateTime: string | null;
  createdAt: string;
  _count?: {
    photos: number;
    guests: number;
    videos: number;
  };
  host?: {
    id: string;
    email: string;
    name: string | null;
  };
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ events: Event[]; total: number }>('/admin/events', {
        params: { q: search || undefined, limit: 50 },
      });
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = events.filter(
    (e) =>
      (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.slug || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-app-fg flex items-center gap-2">
            <Calendar className="w-6 h-6 text-app-accent" />
            Events
          </h1>
          <p className="mt-1 text-sm text-app-muted">
            {total} Events insgesamt
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
          <Link href="/manage/events/create">
            <Button size="sm" variant="primary">
              <UserPlus className="w-4 h-4 mr-1" />
              Event erstellen
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted" />
          <Input
            placeholder="Suchen nach Name oder Slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="rounded-2xl border border-app-border bg-app-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-app-accent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-app-muted">
            Keine Events gefunden
          </div>
        ) : (
          <div className="divide-y divide-app-border">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 hover:bg-app-bg/50 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/manage/events/${event.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-app-accent/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-app-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-app-fg">{event.title}</p>
                      <div className="flex items-center gap-3 text-xs text-app-muted">
                        <span>/{event.slug || '—'}</span>
                        {event.dateTime && (
                          <span>
                            {new Date(event.dateTime).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {event.host && (
                          <span>{event.host.name || event.host.email}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-app-muted">
                        <Image className="w-4 h-4" />
                        {event._count?.photos || 0}
                      </span>
                      <span className="flex items-center gap-1 text-app-muted">
                        <Users className="w-4 h-4" />
                        {event._count?.guests || 0}
                      </span>
                    </div>
                    <a
                      href={`https://app.xn--gstefotos-v2a.com/events/${event.id}/dashboard`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-app-bg transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4 text-app-muted" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
