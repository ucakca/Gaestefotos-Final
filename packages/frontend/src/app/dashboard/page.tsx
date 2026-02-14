'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Plus, 
  LogOut, 
  HelpCircle, 
  ClipboardCheck, 
  Search,
  Calendar,
  Filter,
  Grid3X3,
  List,
  Camera,
  Users,
  Clock,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Info,
  Building2,
  Shield
} from 'lucide-react';
import api from '@/lib/api';
import { Event } from '@gaestefotos/shared';
import Logo from '@/components/Logo';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EventCard } from '@/components/host-dashboard';
import { AIFloatingButton } from '@/components/ai-chat';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'past' | 'draft'>('all');
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const lastLoadRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const tokenFromUrl = new URLSearchParams(window.location.search).get('token');
      const returnUrlFromUrl = new URLSearchParams(window.location.search).get('returnUrl');
      if (tokenFromUrl) {
        try {
          sessionStorage.setItem('token', tokenFromUrl);
          localStorage.removeItem('token');
        } catch {}
        const next = returnUrlFromUrl && returnUrlFromUrl.startsWith('/') ? returnUrlFromUrl : '/dashboard';
        window.location.href = next;
        return;
      }
    }
    loadEvents();
  }, []);

  // Refresh events when page becomes visible (e.g., after returning from wizard)
  // Debounced: only reload if >5s since last load to prevent re-render flooding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoadRef.current > 5000) {
        loadEvents();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleCreateEvent = async () => {
    try {
      setLimitMessage(null);
      const { data } = await api.get('/events/check-limit');
      if (data?.limitReached) {
        setLimitMessage(`Du hast das Limit von ${data.limit} kostenlosen Events erreicht. Bitte upgrade dein Paket, um weitere Events zu erstellen.`);
        return;
      }
      router.push('/create-event?new=true');
    } catch {
      // If check fails, let them try — the backend will block creation anyway
      router.push('/create-event?new=true');
    }
  };

  const loadEvents = async () => {
    try {
      lastLoadRef.current = Date.now();
      const { data } = await api.get('/events');
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

  // Calculate totals
  const totalMedia = events.reduce((sum, e) => sum + ((e as any).photoCount || 0), 0);
  const totalVisitors = events.reduce((sum, e) => sum + ((e as any).viewCount || 0), 0);
  const pendingPhotos = events.reduce((sum, e) => sum + ((e as any).pendingCount || 0), 0);
  const activeEvents = events.filter(e => (e as any).isActive !== false);
  const pastEvents = events.filter(e => {
    if (!e.dateTime) return false;
    const d = new Date(e.dateTime);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  });

  const filteredEvents = events.filter(event => {
    // Search filter
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.slug?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    if (statusFilter === 'active') {
      return matchesSearch && (event as any).isActive !== false;
    } else if (statusFilter === 'past') {
      if (!event.dateTime) return false;
      const d = new Date(event.dateTime);
      d.setHours(23, 59, 59, 999);
      return matchesSearch && d < new Date();
    }
    return matchesSearch;
  });

  if (loading) {
    return <FullPageLoader label="Lade Dashboard..." />;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border shadow-sm"
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Logo + User */}
              <div className="flex items-center gap-4 min-w-0">
                <Logo width={100} height={40} />
                {user && (
                  <div className="hidden sm:block min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name || 'Host'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                {(user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && (
                  <Button asChild variant="secondary" size="sm" className="hidden sm:flex">
                    <Link href="/admin">
                      <Shield className="w-4 h-4 mr-1" />
                      Admin
                    </Link>
                  </Button>
                )}
                {user?.role === 'PARTNER' && (
                  <Button asChild variant="secondary" size="sm" className="hidden sm:flex">
                    <Link href="/partner">
                      <Building2 className="w-4 h-4 mr-1" />
                      Partner
                    </Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <a href="/faq" target="_blank" rel="noreferrer">
                    <HelpCircle className="w-4 h-4 mr-1" />
                    FAQ
                  </a>
                </Button>
                <Button asChild variant="secondary" size="sm" className="hidden sm:flex">
                  <Link href="/moderation">
                    <ClipboardCheck className="w-4 h-4 mr-1" />
                    Moderation
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="hidden sm:flex"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
          {/* Welcome + Stats */}
          {events.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              {/* Greeting */}
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-foreground">
                  Hallo{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
                </h1>
                <p className="text-muted-foreground">
                  Du hast {activeEvents.length} aktive{activeEvents.length === 1 ? 's' : ''} Event{activeEvents.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-blue-600 mb-1">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-medium">MEDIEN</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{totalMedia}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-medium">BESUCHER</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{totalVisitors}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-purple-600 mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-medium">EVENTS</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{events.length}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Page Title + Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-foreground">Meine Events</h2>
                  {/* Status Info Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusInfo(!showStatusInfo)}
                      className="p-1 rounded-full hover:bg-stone-100 transition-colors"
                    >
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </button>
                    
                    {/* Info Tooltip */}
                    <AnimatePresence>
                      {showStatusInfo && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute left-0 top-full mt-2 z-50 w-64 p-3 bg-card rounded-xl shadow-lg border border-border"
                        >
                          <h4 className="font-medium text-foreground text-sm mb-2">Event-Status Erklärung</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-green-700">Live</span>
                                <p className="text-muted-foreground">Event läuft/kommt, Galerie aktiv</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-orange-700">Archiviert</span>
                                <p className="text-muted-foreground">Event vorbei, Galerie noch zugänglich</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <span className="font-medium text-red-700">Gesperrt</span>
                                <p className="text-muted-foreground">Galerie deaktiviert, kein Zugang</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {/* Filter Tabs */}
                <div className="flex gap-2 mt-2">
                  {[
                    { id: 'all', label: 'Alle', count: events.length },
                    { id: 'active', label: 'Aktive', count: activeEvents.length },
                    { id: 'past', label: 'Vergangene', count: pastEvents.length },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        statusFilter === tab.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-card text-muted-foreground hover:bg-app-border'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Search + View Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Event suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card border-border"
                  />
                </div>
                <div className="hidden sm:flex bg-card border border-border rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6"
            >
              {error}
            </motion.div>
          )}

          {/* Events Grid/List */}
          {filteredEvents.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 mx-auto mb-6 flex items-center justify-center">
                <Camera className="w-12 h-12 text-amber-600" />
              </div>
              {searchQuery ? (
                <>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Keine Events gefunden</h3>
                  <p className="text-muted-foreground mb-4">Versuche einen anderen Suchbegriff</p>
                  <Button variant="secondary" onClick={() => setSearchQuery('')}>
                    Suche zurücksetzen
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Willkommen bei Gästefotos! 🎉</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">Erstelle dein erstes Event und sammle unvergessliche Momente mit deinen Gästen.</p>
                  <Button variant="primary" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0" onClick={handleCreateEvent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erstes Event erstellen
                  </Button>
                </>
              )}
            </motion.div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 sm:space-y-0' 
              : 'space-y-3'
            }>
              <AnimatePresence>
                {filteredEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    photoCount={(event as any).photoCount || 0}
                    guestCount={(event as any).viewCount || 0}
                    pendingCount={(event as any).pendingCount || 0}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* Limit reached banner */}
        <AnimatePresence>
          {limitMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-16 left-4 right-4 z-50 bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">{limitMessage}</p>
                  <div className="flex gap-2 mt-2">
                    <a href="https://gästefotos.com/pakete" className="text-xs font-medium text-amber-600 hover:text-amber-700 underline">Pakete ansehen →</a>
                    <button onClick={() => setLimitMessage(null)} className="text-xs text-amber-500 hover:text-amber-700 ml-auto">Schließen</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating "+ Event" Button - above bottom nav */}
        <button 
          onClick={handleCreateEvent}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-semibold text-sm shadow-lg hover:from-pink-600 hover:to-rose-600 transition-all z-50"
        >
          <Plus className="w-5 h-5" />
          Event
        </button>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t border-border z-50 shadow-lg">
          <div className="flex items-center justify-around py-3">
            <Link href="/dashboard" className="flex flex-col items-center gap-1 text-blue-600">
              <Grid3X3 className="w-5 h-5" />
              <span className="text-xs font-medium">Events</span>
            </Link>
            <Link href="/moderation" className="flex flex-col items-center gap-1 text-muted-foreground">
              <ClipboardCheck className="w-5 h-5" />
              <span className="text-xs">Prüfen</span>
            </Link>
            <a href="/faq" className="flex flex-col items-center gap-1 text-muted-foreground">
              <HelpCircle className="w-5 h-5" />
              <span className="text-xs">Hilfe</span>
            </a>
            <button onClick={logout} className="flex flex-col items-center gap-1 text-muted-foreground">
              <LogOut className="w-5 h-5" />
              <span className="text-xs">Logout</span>
            </button>
          </div>
        </nav>
      </div>
      
      {/* KI-Assistent Floating Button */}
      <AIFloatingButton />
    </ProtectedRoute>
  );
}
