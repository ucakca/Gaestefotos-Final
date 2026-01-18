'use client';

import { useEffect, useState } from 'react';
import { Search, Calendar, Eye, Trash2, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Event {
  id: string;
  title: string;
  slug: string;
  dateTime: string;
  createdAt: string;
  isActive: boolean;
  host: {
    name: string;
    email: string;
  };
  _count: {
    photos: number;
    guests: number;
    videos: number;
  };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 20;

  const loadEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString(),
      });
      if (search) params.set('q', search);

      const res = await fetch(`/api/admin/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, search]);

  const toggleEventStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        loadEvents();
      }
    } catch (error) {
      console.error('Failed to toggle event status:', error);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Event wirklich löschen?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        loadEvents();
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Event Management</h1>
        <p className="mt-2 text-gray-600">Verwalte alle Events in der Plattform</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Suche nach Titel oder Slug..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              {total} Events gesamt
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lädt Events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Keine Events gefunden
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500">/{event.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{event.host.name}</div>
                          <div className="text-xs text-gray-500">{event.host.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(event.dateTime).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <div>{event._count.photos} Fotos</div>
                          <div className="text-xs text-gray-500">
                            {event._count.guests} Gäste · {event._count.videos} Videos
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {event.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => window.open(`/events/${event.slug}`, '_blank')}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Event anzeigen"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => toggleEventStatus(event.id, event.isActive)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title={event.isActive ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            {event.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Seite {page + 1} von {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Zurück
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page >= totalPages - 1}
                    variant="secondary"
                    size="sm"
                  >
                    Weiter
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
