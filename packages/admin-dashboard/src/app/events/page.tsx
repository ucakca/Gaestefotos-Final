'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type EventListItem = {
  id: string;
  title: string;
  slug: string;
  dateTime: string | null;
  createdAt: string;
  _count?: { photos: number; guests: number };
};

export default function EventsPage() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/events');
        const items = (res.data?.events || []) as EventListItem[];
        if (mounted) setEvents(items);
      } catch (e: any) {
        if (mounted) setError(e?.response?.data?.error || e?.message || 'Fehler beim Laden');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
      </div>

      {loading && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gäste</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{ev.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{ev.dateTime ? new Date(ev.dateTime).toLocaleString('de-DE') : '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{ev._count?.photos ?? '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{ev._count?.guests ?? '-'}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/events/${ev.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-600" colSpan={5}>
                    Keine Events gefunden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
