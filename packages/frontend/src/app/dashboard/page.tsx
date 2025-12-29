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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F5F2' }}>
        <div className="text-lg" style={{ color: '#295B4D' }}>Lade...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9F5F2' }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Logo width={120} height={48} />
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#295B4D' }}>Dashboard</h1>
                {user && (
                  <p className="text-sm" style={{ color: '#295B4D' }}>{user.name || user.email}</p>
                )}
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <a
                href="https://xn--gstefotos-v2a.com/faq/"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-md border font-medium transition-colors"
                style={{ borderColor: '#EAA48F', color: '#295B4D' }}
              >
                FAQ
              </a>
              <Link
                href="/moderation"
                className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                style={{ backgroundColor: '#EAA48F' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d89a87'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EAA48F'}
              >
                Moderation
              </Link>
              <Link
                href="/events/new"
                className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                style={{ backgroundColor: '#295B4D' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#204a3e'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#295B4D'}
              >
                Neues Event
              </Link>
              <button
                onClick={logout}
                className="px-4 py-2 rounded-md border font-medium transition-colors"
                style={{ borderColor: '#EAA48F', color: '#295B4D' }}
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!Array.isArray(events) || events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-lg shadow-sm"
          >
            <p className="mb-4" style={{ color: '#295B4D' }}>Noch keine Events vorhanden</p>
            <Link
              href="/events/new"
              className="px-4 py-2 rounded-md text-white font-medium inline-block transition-colors"
              style={{ backgroundColor: '#295B4D' }}
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
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all block"
                >
                  <h2 className="text-xl font-semibold mb-2" style={{ color: '#295B4D' }}>
                    {event.title}
                  </h2>
                  <p className="text-sm mb-4" style={{ color: '#295B4D', opacity: 0.7 }}>
                    Slug: {event.slug}
                  </p>
                  <div className="text-sm" style={{ color: '#295B4D', opacity: 0.6 }}>
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

