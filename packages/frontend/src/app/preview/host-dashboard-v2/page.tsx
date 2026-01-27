'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Users,
  Clock,
  BarChart3,
  Settings,
  Share2,
  Check,
  X,
  ChevronRight,
  Home,
  Image as ImageIcon,
  Mail,
  Sparkles,
  Eye,
  Play,
  Plus,
  QrCode,
  Link as LinkIcon,
  Calendar,
  MapPin,
  Globe,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  PartyPopper,
  Rocket,
  Trophy,
} from 'lucide-react';

/**
 * HOST DASHBOARD V2 - DESIGN PREVIEW
 * 
 * Mobile-First Event Management Dashboard
 * Konsistent mit /e3/ Gästeseite (helle, warme Farben)
 * 
 * Key Features:
 * - Hero Section mit Cover-Image
 * - Onboarding-Flow mit Fortschrittsanzeige
 * - Geführte Erfahrung ("Wir haben's fast geschafft!")
 * - Bottom Navigation (4 Tabs)
 * - Swipe-to-Moderate für Fotos
 */

// Mock Data für Preview
const mockEvent = {
  title: 'Hochzeit Anna & Max',
  date: '15. März 2026',
  location: 'Schloss Neuschwanstein',
  coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=600&fit=crop',
  profileImage: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=200&h=200&fit=crop',
  isActive: true,
};

const mockStats = {
  photos: 247,
  guests: 89,
  pending: 12,
  storage: '2.4 GB',
};

const mockPendingPhotos = [
  { id: '1', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&h=400&fit=crop', guestName: 'Maria S.' },
  { id: '2', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop', guestName: 'Thomas K.' },
  { id: '3', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400&h=400&fit=crop', guestName: 'Lisa M.' },
  { id: '4', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=400&fit=crop', guestName: 'Peter W.' },
];

// Onboarding Steps
const onboardingSteps = [
  { id: 'event', label: 'Event erstellt', completed: true, icon: CheckCircle2 },
  { id: 'cover', label: 'Titelbild hochgeladen', completed: true, icon: ImageIcon },
  { id: 'welcome', label: 'Willkommensnachricht', completed: true, icon: CheckCircle2 },
  { id: 'qr', label: 'QR-Code erstellen', completed: false, icon: QrCode, current: true },
  { id: 'table', label: 'Tischaufsteller gestalten', completed: false, icon: Sparkles },
  { id: 'invite', label: 'Gäste einladen', completed: false, icon: Mail },
  { id: 'challenges', label: 'Challenges aktivieren', completed: false, icon: Trophy },
];

type TabType = 'overview' | 'moderate' | 'invite' | 'settings';

export default function HostDashboardV2Preview() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [pendingPhotos, setPendingPhotos] = useState(mockPendingPhotos);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Swipe Handler für Moderation
  const handleSwipe = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    setTimeout(() => {
      setPendingPhotos(prev => prev.filter((_, i) => i !== currentPhotoIndex));
      setSwipeDirection(null);
      if (currentPhotoIndex >= pendingPhotos.length - 1) {
        setCurrentPhotoIndex(Math.max(0, pendingPhotos.length - 2));
      }
    }, 300);
  };

  const tabs = [
    { id: 'overview' as const, label: 'Übersicht', icon: Home },
    { id: 'moderate' as const, label: 'Moderation', icon: Clock, badge: mockStats.pending },
    { id: 'invite' as const, label: 'Einladen', icon: Mail },
    { id: 'settings' as const, label: 'Mehr', icon: MoreHorizontal },
  ];

  // Berechne Onboarding-Fortschritt
  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-app-bg text-app-fg" style={{ background: 'hsl(30 20% 98%)' }}>
      {/* Hero Section - Konsistent mit /e3/ */}
      <div className="relative">
        {/* Cover Image */}
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={mockEvent.coverImage}
            alt={mockEvent.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[hsl(30_20%_98%)]" />
          
          {/* Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <button className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm transition-colors hover:bg-black/60">
              <Eye className="h-5 w-5" />
            </button>
            <div className="flex gap-2">
              <button className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm transition-colors hover:bg-black/60">
                <QrCode className="h-5 w-5" />
              </button>
              <button className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm transition-colors hover:bg-black/60">
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Profile Card - Floating */}
        <div className="relative z-10 -mt-16 px-4">
          <div className="rounded-2xl border border-stone-200 bg-white/90 backdrop-blur-xl p-4 shadow-xl">
            <div className="flex items-start gap-4">
              {/* Profile Image */}
              <div className="relative -mt-12 flex-shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-white shadow-xl">
                  <img
                    src={mockEvent.profileImage}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${mockEvent.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>

              {/* Event Info */}
              <div className="flex-1 min-w-0 pt-1">
                <h1 className="text-lg font-bold truncate text-stone-800">{mockEvent.title}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-stone-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {mockEvent.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {mockEvent.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats - Horizontal Scroll */}
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              <StatCard icon={Camera} value={mockStats.photos} label="Fotos" color="blue" />
              <StatCard icon={Users} value={mockStats.guests} label="Gäste" color="green" />
              <StatCard icon={Clock} value={mockStats.pending} label="Ausstehend" color="yellow" highlight />
              <StatCard icon={BarChart3} value={mockStats.storage} label="Speicher" color="purple" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pt-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewTab key="overview" />}
          {activeTab === 'moderate' && (
            <ModerationTab
              key="moderate"
              photos={pendingPhotos}
              currentIndex={currentPhotoIndex}
              swipeDirection={swipeDirection}
              onSwipe={handleSwipe}
              onIndexChange={setCurrentPhotoIndex}
            />
          )}
          {activeTab === 'invite' && <InviteTab key="invite" />}
          {activeTab === 'settings' && <SettingsTab key="settings" />}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-stone-200 backdrop-blur-xl safe-area-inset-bottom">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative flex flex-col items-center justify-center gap-1 py-2 px-4 min-w-[64px]"
                whileTap={{ scale: 0.95 }}
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon with Badge */}
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 transition-colors ${isActive ? 'text-blue-600' : 'text-stone-400'}`}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full px-1">
                      {tab.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] transition-colors ${isActive ? 'text-blue-600 font-medium' : 'text-stone-400'}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* FAB - Quick Action */}
      {activeTab !== 'moderate' && mockStats.pending > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30 flex items-center justify-center"
          onClick={() => setActiveTab('moderate')}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <Clock className="h-6 w-6 text-white" />
            <span className="absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold bg-red-500 text-white rounded-full px-1">
              {mockStats.pending}
            </span>
          </div>
        </motion.button>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, value, label, color, highlight }: {
  icon: any;
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  highlight?: boolean;
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/5 border-green-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30',
  };
  const iconColors = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`flex-shrink-0 flex items-center gap-2.5 rounded-xl bg-gradient-to-br ${colors[color]} border p-3 min-w-[100px] ${highlight ? 'ring-2 ring-yellow-500/50' : ''}`}>
      <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm ${iconColors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-lg font-bold text-stone-800">{value}</div>
        <div className="text-[10px] text-stone-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

// Overview Tab mit Onboarding
function OverviewTab() {
  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const currentStep = onboardingSteps.find(s => s.current);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Onboarding Progress Card */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">Fast geschafft! 🎉</h3>
              <span className="text-sm font-medium text-amber-600">{progressPercent}%</span>
            </div>
            <p className="text-xs text-stone-500">Noch {totalSteps - completedSteps} Schritte bis zum perfekten Event</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-amber-100 rounded-full overflow-hidden mb-4">
          <motion.div 
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        
        {/* Next Step - Highlighted */}
        {currentStep && (
          <motion.button
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-amber-200 shadow-sm hover:shadow-md transition-shadow"
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <currentStep.icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-stone-800">Nächster Schritt</div>
              <div className="text-sm text-stone-500">{currentStep.label}</div>
            </div>
            <ChevronRight className="w-5 h-5 text-stone-400" />
          </motion.button>
        )}
      </div>
      
      {/* All Steps - Expandable */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-3">Alle Schritte</h3>
        <div className="space-y-2">
          {onboardingSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                step.completed ? 'bg-green-50' : step.current ? 'bg-amber-50' : 'bg-stone-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.completed ? 'bg-green-500 text-white' : step.current ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'
              }`}>
                {step.completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </div>
              <span className={`text-sm ${
                step.completed ? 'text-green-700' : step.current ? 'text-amber-700 font-medium' : 'text-stone-500'
              }`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard
          icon={Camera}
          title="Fotos"
          subtitle="Galerie öffnen"
          color="blue"
        />
        <QuickActionCard
          icon={Play}
          title="Live Wall"
          subtitle="Slideshow starten"
          color="purple"
        />
        <QuickActionCard
          icon={QrCode}
          title="QR-Code"
          subtitle="Für Tischaufsteller"
          color="green"
        />
        <QuickActionCard
          icon={Share2}
          title="Teilen"
          subtitle="Link kopieren"
          color="pink"
        />
      </div>

      {/* Event Status Card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-800">Event Status</h3>
          <span className="flex items-center gap-1.5 text-green-600 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Aktiv
          </span>
        </div>
        <div className="space-y-3">
          <StatusRow icon={Globe} label="Öffentlich sichtbar" active />
          <StatusRow icon={Camera} label="Uploads erlaubt" active />
          <StatusRow icon={Eye} label="Live Wall aktiv" active={false} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-3">Letzte Aktivität</h3>
        <div className="space-y-3 text-sm">
          <ActivityItem
            icon={Camera}
            text="Maria S. hat 5 Fotos hochgeladen"
            time="vor 2 Min."
          />
          <ActivityItem
            icon={Users}
            text="Thomas K. ist beigetreten"
            time="vor 15 Min."
          />
          <ActivityItem
            icon={CheckCircle2}
            text="3 Fotos freigegeben"
            time="vor 1 Std."
          />
        </div>
      </div>
    </motion.div>
  );
}

// Moderation Tab - Swipe-to-Approve/Delete
function ModerationTab({ photos, currentIndex, swipeDirection, onSwipe, onIndexChange }: {
  photos: typeof mockPendingPhotos;
  currentIndex: number;
  swipeDirection: 'left' | 'right' | null;
  onSwipe: (direction: 'left' | 'right') => void;
  onIndexChange: (index: number) => void;
}) {
  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-stone-800 mb-2">Alles erledigt!</h3>
        <p className="text-stone-500">Keine Fotos zur Freigabe ausstehend.</p>
      </motion.div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Instructions */}
      <div className="text-center text-sm text-stone-500 mb-2">
        <span className="text-green-600">← Wischen = Freigeben</span>
        {' · '}
        <span className="text-red-600">Wischen → = Löschen</span>
      </div>

      {/* Photo Card - Swipeable */}
      <div className="relative">
        <motion.div
          className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 shadow-lg"
          animate={{
            x: swipeDirection === 'left' ? -300 : swipeDirection === 'right' ? 300 : 0,
            opacity: swipeDirection ? 0 : 1,
            rotate: swipeDirection === 'left' ? -15 : swipeDirection === 'right' ? 15 : 0,
          }}
          transition={{ duration: 0.3 }}
        >
          <img
            src={currentPhoto.url}
            alt="Pending photo"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <p className="text-sm text-white">Von: {currentPhoto.guestName}</p>
          </div>

          {/* Swipe Overlays */}
          <AnimatePresence>
            {swipeDirection === 'left' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-green-500/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-20 h-20 text-green-400" />
              </motion.div>
            )}
            {swipeDirection === 'right' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-red-500/30 flex items-center justify-center"
              >
                <XCircle className="w-20 h-20 text-red-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mt-6">
          <motion.button
            onClick={() => onSwipe('right')}
            className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-8 h-8 text-red-400" />
          </motion.button>
          <motion.button
            onClick={() => onSwipe('left')}
            className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
          >
            <Check className="w-8 h-8 text-green-400" />
          </motion.button>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-1.5 mt-4">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-stone-800' : 'bg-stone-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button className="flex-1 py-3 px-4 rounded-xl bg-green-100 border border-green-200 text-green-700 text-sm font-medium">
          Alle freigeben ({photos.length})
        </button>
      </div>
    </motion.div>
  );
}

// Invite Tab
function InviteTab() {
  const [copied, setCopied] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Share Link */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-stone-800 mb-3">Schnell-Einladung</h3>
        <p className="text-sm text-stone-500 mb-4">
          Ein Link, kein Passwort nötig – ideal für WhatsApp & Social Media
        </p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-xl bg-stone-100 border border-stone-200 px-4 py-3 text-sm text-stone-600 truncate">
            gaestefotos.com/s/abc123
          </div>
          <motion.button
            onClick={() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className={`px-4 rounded-xl font-medium transition-colors ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 text-center shadow-sm">
        <div className="w-48 h-48 mx-auto bg-stone-50 rounded-2xl p-4 mb-4 border border-stone-200">
          <div className="w-full h-full bg-white rounded-lg flex items-center justify-center shadow-inner">
            <QrCode className="w-20 h-20 text-stone-400" />
          </div>
        </div>
        <button className="w-full py-3 px-4 rounded-xl bg-stone-100 border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors">
          QR-Code herunterladen
        </button>
      </div>

      {/* Invitations List */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-800">Einladungsseiten</h3>
          <button className="text-blue-600 text-sm font-medium">+ Neu</button>
        </div>
        <div className="space-y-2">
          <InvitationRow name="Familie" opens={45} />
          <InvitationRow name="Freunde" opens={32} />
          <InvitationRow name="Kollegen" opens={12} />
        </div>
      </div>
    </motion.div>
  );
}

// Settings Tab
function SettingsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <SettingsRow icon={ImageIcon} label="Event Branding" chevron />
        <SettingsRow icon={Calendar} label="Event Details" chevron />
        <SettingsRow icon={Users} label="Gästeliste" chevron />
        <SettingsRow icon={Sparkles} label="Challenges" chevron />
        <SettingsRow icon={BarChart3} label="Statistiken" chevron />
        <SettingsRow icon={Settings} label="Erweiterte Einstellungen" chevron />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <SettingsRow icon={Eye} label="Als Gast ansehen" />
        <SettingsRow icon={Globe} label="Event deaktivieren" danger />
      </div>
    </motion.div>
  );
}

// Helper Components
function QuickActionCard({ icon: Icon, title, subtitle, color }: {
  icon: any;
  title: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'green' | 'pink';
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/20',
    green: 'from-green-500/20 to-green-600/10 border-green-500/20',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/20',
  };
  const iconColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    pink: 'text-pink-400',
  };

  return (
    <motion.button
      className={`flex items-center gap-3 rounded-2xl bg-gradient-to-br ${colors[color]} border p-4 text-left`}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm ${iconColors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="font-medium text-stone-800">{title}</div>
        <div className="text-xs text-stone-500">{subtitle}</div>
      </div>
    </motion.button>
  );
}

function StatusRow({ icon: Icon, label, active }: { icon: any; label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-stone-600">
        <Icon className="w-4 h-4 text-stone-400" />
        {label}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
        {active ? 'An' : 'Aus'}
      </span>
    </div>
  );
}

function ActivityItem({ icon: Icon, text, time }: { icon: any; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-stone-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-stone-700 truncate">{text}</p>
        <p className="text-xs text-stone-400">{time}</p>
      </div>
    </div>
  );
}

function InvitationRow({ name, opens }: { name: string; opens: number }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-stone-50 border border-stone-100">
      <span className="font-medium text-stone-800">{name}</span>
      <span className="text-sm text-stone-500">{opens} Öffnungen</span>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, chevron, danger }: {
  icon: any;
  label: string;
  chevron?: boolean;
  danger?: boolean;
}) {
  return (
    <button className="flex items-center justify-between w-full px-4 py-4 border-b border-stone-100 last:border-0 text-left hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-stone-400'}`} />
        <span className={danger ? 'text-red-600' : 'text-stone-700'}>{label}</span>
      </div>
      {chevron && <ChevronRight className="w-5 h-5 text-stone-400" />}
    </button>
  );
}
