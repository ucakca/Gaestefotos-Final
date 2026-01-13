'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event } from '@gaestefotos/shared';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import GuidedTour from '@/components/ui/GuidedTour';
import { HelpCircle, ClipboardCheck, PlusSquare, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore(); // Hook muss VOR allen early returns sein!
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tourSteps = [
    {
      id: 'faq',
      target: '[data-tour="host-dashboard-faq"]',
      title: 'Dashboard (1/4)',
      body: 'FAQ öffnet die wichtigsten Antworten/How-Tos. Ideal als erster Einstieg.',
      placement: 'bottom' as const,
    },
    {
      id: 'moderation',
      target: '[data-tour="host-dashboard-moderation"]',
      title: 'Dashboard (2/4)',
      body: 'Hier kannst du Uploads moderieren: freigeben/ablehnen, Probleme prüfen, Qualität sichern.',
      placement: 'bottom' as const,
    },
    {
      id: 'new-event',
      target: '[data-tour="host-dashboard-new-event"]',
      title: 'Dashboard (3/4)',
      body: 'Neues Event anlegen – danach kannst du Design, Alben und Einladungen konfigurieren.',
      placement: 'bottom' as const,
    },
    {
      id: 'event-card',
      target: '[data-tour="host-dashboard-event-card"]',
      title: 'Dashboard (4/4)',
      body: 'Klicke auf ein Event, um es zu verwalten (Fotos, Share-Link, Einladungen, Einstellungen).',
      placement: 'top' as const,
    },
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tokenFromUrl = new URLSearchParams(window.location.search).get('token');
      const returnUrlFromUrl = new URLSearchParams(window.location.search).get('returnUrl');
      if (tokenFromUrl) {
      try {
        sessionStorage.setItem('token', tokenFromUrl);
        localStorage.removeItem('token');
      } catch {
        // ignore
      }
      const next = returnUrlFromUrl && returnUrlFromUrl.startsWith('/') ? returnUrlFromUrl : '/dashboard';
      window.location.href = next;
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
    return <FullPageLoader label="Lade..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-app-bg">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 sm:pb-8">
          {/* Header */}
          <div className="bg-app-card rounded-lg border border-app-border shadow-sm p-6 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 min-w-0">
                <Logo width={120} height={48} />
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-app-fg">Dashboard</h1>
                  {user && (
                    <p className="text-sm text-app-muted break-words">{user.name || user.email}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 sm:justify-end">
                <GuidedTour tourId="host_dashboard" steps={tourSteps} autoStart />
                <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                  <a href="/faq" target="_blank" rel="noreferrer" data-tour="host-dashboard-faq">
                    FAQ
                  </a>
                </Button>
                <Link
                  href="/moderation"
                  data-tour="host-dashboard-moderation"
                  className="w-full sm:w-auto px-4 py-2 rounded-md text-app-bg font-medium transition-colors bg-app-accent hover:opacity-90 text-center"
                >
                  Uploads prüfen
                </Link>
                <Button asChild variant="primary" size="sm" className="w-full sm:w-auto px-4 py-2 rounded-md font-medium">
                  <Link href="/create-event" data-tour="host-dashboard-new-event">
                    Neues Event
                  </Link>
                </Button>
                <Button
                  onClick={logout}
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Abmelden
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-app-bg border border-status-danger text-status-danger px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!Array.isArray(events) || events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-app-card rounded-lg border border-app-border shadow-sm"
            >
              <p className="mb-4 text-app-muted">Noch keine Events vorhanden</p>
              <Button asChild variant="primary" size="sm" className="px-4 py-2 rounded-md font-medium inline-block">
                <Link href="/create-event">Erstelle dein erstes Event</Link>
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(events) && events.map((event, index) => {
                const designConfig = (event.designConfig as any) || {};
                const profileImageStoragePath = designConfig.profileImageStoragePath;
                const coverImageStoragePath = designConfig.coverImageStoragePath;
                const profileImage = profileImageStoragePath 
                  ? `/api/events/${event.id}/design-image/profile/${encodeURIComponent(profileImageStoragePath)}`
                  : designConfig.profileImage;
                const coverImage = coverImageStoragePath
                  ? `/api/events/${event.id}/design-image/cover/${encodeURIComponent(coverImageStoragePath)}`
                  : designConfig.coverImage;
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={`/events/${event.id}/dashboard`}
                      data-tour={index === 0 ? 'host-dashboard-event-card' : undefined}
                      className="bg-app-card rounded-lg border border-app-border shadow-sm overflow-hidden hover:shadow-lg transition-all block"
                    >
                      {coverImage && (
                        <div className="relative w-full h-32 bg-app-bg overflow-hidden">
                          <img 
                            src={coverImage} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <div className="flex items-start gap-3 mb-3">
                          {profileImage && (
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-app-bg border-2 border-app-border flex-shrink-0">
                              <img 
                                src={profileImage} 
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-semibold mb-1 text-app-fg truncate">
                              {event.title}
                            </h2>
                            <p className="text-xs text-app-muted truncate">
                              {event.slug}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-app-muted">
                          Erstellt: {new Date(event.createdAt).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

