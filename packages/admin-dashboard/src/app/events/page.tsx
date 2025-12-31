'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';

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
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-app-fg">Events</h1>
        <p className="mt-1 text-sm text-app-muted">Liste aller Events</p>
      </div>

      {loading ? (
        <Card className="p-5">
          <p className="text-sm text-app-muted">Wird geladen...</p>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card className="p-5">
          <p className="text-sm text-[var(--status-danger)]">{error}</p>
        </Card>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {events.map((ev) => (
              <Card key={ev.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-app-fg">{ev.title}</div>
                    <div className="mt-1 text-sm text-app-muted">
                      {ev.dateTime ? new Date(ev.dateTime).toLocaleString('de-DE') : '-'}
                    </div>
                  </div>
                  <Link
                    href={`/events/${ev.id}`}
                    className="shrink-0 rounded-lg border border-app-border bg-app-card px-3 py-2 text-sm font-medium text-app-fg"
                  >
                    Details
                  </Link>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-app-muted">Fotos</div>
                    <div className="text-sm font-medium text-app-fg">{ev._count?.photos ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-app-muted">Gäste</div>
                    <div className="text-sm font-medium text-app-fg">{ev._count?.guests ?? '-'}</div>
                  </div>
                </div>
              </Card>
            ))}

            {events.length === 0 ? (
              <Card className="p-5">
                <p className="text-sm text-app-muted">Keine Events gefunden</p>
              </Card>
            ) : null}
          </div>

          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-app-border">
                  <thead className="bg-app-bg">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Titel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Datum</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Fotos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-app-muted uppercase tracking-wider">Gäste</th>
                      <th className="px-6 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border bg-app-card">
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="px-6 py-4 text-sm text-app-fg">{ev.title}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{ev.dateTime ? new Date(ev.dateTime).toLocaleString('de-DE') : '-'}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{ev._count?.photos ?? '-'}</td>
                        <td className="px-6 py-4 text-sm text-app-muted">{ev._count?.guests ?? '-'}</td>
                        <td className="px-6 py-4 text-right text-sm">
                          <Link href={`/events/${ev.id}`} className="font-medium text-tokens-brandGreen hover:opacity-90">
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {events.length === 0 ? (
                      <tr>
                        <td className="px-6 py-8 text-sm text-app-muted" colSpan={5}>
                          Keine Events gefunden
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
