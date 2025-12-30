'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event } from '@gaestefotos/shared';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuthStore } from '@/store/authStore';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore(); // Hook muss VOR allen early returns sein!
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tokenFromUrl = new URLSearchParams(window.location.search).get('token');
      if (tokenFromUrl) {
      try {
        sessionStorage.setItem('token', tokenFromUrl);
        localStorage.removeItem('token');
      } catch {
        // ignore
      }
      window.location.href = '/dashboard';
      return;
      }
    }

    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await api.get('/events');
      // API gibt { events: [...] } zurück
      setEvents(Array.isArray(data?.events) ? data.events : (Array.isArray(data) ? data : []));
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Fehler beim Laden der Events');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-lg text-tokens-brandGreen">Lade...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-app-card rounded-lg border border-app-border shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Logo width={120} height={48} />
              <div>
                <h1 className="text-2xl font-bold text-tokens-brandGreen">Dashboard</h1>
                {user && (
                  <p className="text-sm text-tokens-brandGreen">{user.name || user.email}</p>
                )}
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <a
                href="https://xn--gstefotos-v2a.com/faq/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-md border border-app-accent font-medium transition-colors text-tokens-brandGreen bg-app-card hover:bg-app-bg"
              >
                FAQ
              </a>
              <Link
                href="/moderation"
                className="px-4 py-2 rounded-md text-app-bg font-medium transition-colors bg-app-accent hover:opacity-90"
              >
                Moderation
              </Link>
              <Link
                href="/events/new"
                className="px-4 py-2 rounded-md text-app-bg font-medium transition-colors bg-tokens-brandGreen hover:opacity-90"
              >
                Neues Event
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-md border border-app-accent font-medium transition-colors text-tokens-brandGreen bg-app-card hover:bg-app-bg"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-app-bg border border-[var(--status-danger)] text-[var(--status-danger)] px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!Array.isArray(events) || events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-app-card rounded-lg border border-app-border shadow-sm"
          >
            <p className="mb-4 text-tokens-brandGreen">Noch keine Events vorhanden</p>
            <Link
              href="/events/new"
              className="px-4 py-2 rounded-md text-app-bg font-medium inline-block transition-colors bg-tokens-brandGreen hover:opacity-90"
            >
              Erstelle dein erstes Event
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(events) && events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={`/events/${event.id}`}
                  className="bg-app-card rounded-lg border border-app-border shadow-sm p-6 hover:shadow-lg transition-all block"
                >
                  <h2 className="text-xl font-semibold mb-2 text-tokens-brandGreen">
                    {event.title}
                  </h2>
                  <p className="text-sm mb-4 text-tokens-brandGreen/70">
                    Slug: {event.slug}
                  </p>
                  <div className="text-sm text-tokens-brandGreen/60">
                    Erstellt: {new Date(event.createdAt).toLocaleDateString('de-DE')}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

