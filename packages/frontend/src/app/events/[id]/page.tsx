'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import Link from 'next/link';
import QRCode from '@/components/QRCode';
import MapsLink from '@/components/MapsLink';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { ErrorState } from '@/components/ui/ErrorState';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    loadEvent();
    setPublicUrl(`${window.location.origin}/e/${event?.slug || ''}`);
  }, [eventId, event?.slug]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err: any) {
      setError('Fehler beim Laden des Events');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  if (error || !event) {
    return <ErrorState message={error || 'Event nicht gefunden'} />;
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link
            href="/dashboard"
            className="text-tokens-brandGreen hover:opacity-90"
          >
            ← Zurück zum Dashboard
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-app-card border border-app-border shadow rounded-lg p-6 mb-6"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-app-fg mb-2">{event.title}</h1>
              <p className="text-app-muted">Slug: {event.slug}</p>
              <p className="text-sm text-app-muted mt-2">
                URL: /e/{event.slug}
              </p>
            </div>
            <Link
              href={`/events/${event.id}/edit`}
              className="px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90"
            >
              Bearbeiten
            </Link>
          </div>

          {event.dateTime && (
            <div className="mb-4">
              <p className="text-app-fg">
                <strong>Datum:</strong>{' '}
                {new Date(event.dateTime).toLocaleString('de-DE')}
              </p>
            </div>
          )}

          {event.locationName && (
            <div className="mb-4">
              <p className="text-app-fg">
                <strong>Ort:</strong> {event.locationName}
              </p>
              <div className="mt-2">
                <MapsLink address={event.locationName} />
              </div>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-app-bg border border-app-border p-4 rounded-lg"
            >
              <h3 className="font-semibold text-app-fg mb-2">Fotos</h3>
              <p className="text-2xl font-bold text-tokens-brandGreen">
                {/* @ts-ignore */}
                {event._count?.photos || 0}
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-app-bg border border-app-border p-4 rounded-lg"
            >
              <h3 className="font-semibold text-app-fg mb-2">Gäste</h3>
              <p className="text-2xl font-bold text-[var(--status-success)]">
                {/* @ts-ignore */}
                {event._count?.guests || 0}
              </p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-app-bg border border-app-border p-4 rounded-lg"
            >
              <h3 className="font-semibold text-app-fg mb-2">Status</h3>
              <p className="text-sm text-app-muted">
                {new Date(event.createdAt).toLocaleDateString('de-DE')}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-app-card border border-app-border shadow rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-app-fg">Aktionen</h2>
            <div className="space-y-2">
              <Link
                href={`/events/${event.id}/photos`}
                className="block px-4 py-2 bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90 text-center"
              >
                Fotos verwalten
              </Link>
              <Link
                href={`/events/${event.id}/guests`}
                className="block px-4 py-2 bg-[var(--status-neutral)] text-app-bg rounded-md hover:opacity-90 text-center"
              >
                Gäste verwalten
              </Link>
              <Link
                href={`/e/${event.slug}`}
                target="_blank"
                className="block px-4 py-2 border border-tokens-brandGreen text-tokens-brandGreen rounded-md hover:bg-app-bg text-center"
              >
                Öffentliche Seite ansehen
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-app-card border border-app-border shadow rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 text-app-fg">QR-Code</h2>
            <p className="text-sm text-app-muted mb-4">
              Scannen für Foto-Upload
            </p>
            <div className="flex justify-center">
              <QRCode value={publicUrl} size={200} />
            </div>
            <p className="text-xs text-app-muted mt-4 text-center break-all">
              {publicUrl}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
