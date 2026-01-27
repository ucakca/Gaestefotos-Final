'use client';

import { useState, useEffect } from 'react';
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
  BookOpen,
  Sparkles,
  Eye,
  Play,
  QrCode,
  Link as LinkIcon,
  Calendar,
  MapPin,
  CheckCircle2,
  Video,
  Target,
  Star,
  Trash2,
  Download,
  FileText,
  Palette,
  Info,
  ScanFace,
  Filter,
  Rocket,
  Trophy,
  Mail,
  PartyPopper,
} from 'lucide-react';

/**
 * HOST DASHBOARD V3 - FINALES KONZEPT
 * 
 * Mobile-First Event Management Dashboard
 * Konsistent mit /e3/ Gästeseite (helle, warme Farben)
 * 
 * Navigation:
 * - 🏠 Übersicht: Onboarding, Stats, QR, Countdown
 * - 🖼️ Galerie: Alle Medien mit Smart Filters
 * - 📖 Gästebuch: Nachrichten + PDF Export mit Themes
 * - ⚙️ Setup: Design, Info, Konfigurationen
 * 
 * Header (sticky): Event Name, Gesichtserkennung, QR-Button
 */

// Mock Data
const mockEvent = {
  title: 'Hochzeit Anna & Max',
  date: '15. März 2026',
  location: 'Schloss Neuschwanstein',
  coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=600&fit=crop',
  profileImage: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=200&h=200&fit=crop',
  isActive: true,
  uploadStartsIn: null, // or "2 Tage 4 Stunden"
};

const mockStats = {
  photos: 247,
  videos: 12,
  guests: 89,
  pending: 5,
  storage: '2.4 GB',
};

// Onboarding Step Type
type OnboardingStep = {
  id: string;
  label: string;
  completed: boolean;
  icon: any;
  current?: boolean;
};

// Onboarding Steps
const onboardingSteps: OnboardingStep[] = [
  { id: 'event', label: 'Event erstellt', completed: true, icon: CheckCircle2 },
  { id: 'cover', label: 'Titelbild hochgeladen', completed: true, icon: ImageIcon },
  { id: 'welcome', label: 'Willkommensnachricht', completed: true, icon: CheckCircle2 },
  { id: 'qr', label: 'QR-Code erstellt', completed: true, icon: QrCode },
  { id: 'table', label: 'Tischaufsteller gestalten', completed: false, icon: Sparkles, current: true },
  { id: 'invite', label: 'Gäste einladen', completed: false, icon: Mail },
  { id: 'challenges', label: 'Challenges aktivieren', completed: false, icon: Trophy },
];

// Mock Media for Gallery
const mockMedia = [
  { id: '1', type: 'photo', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400', pending: false, challenge: null, likes: 24 },
  { id: '2', type: 'photo', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', pending: true, challenge: null, likes: 0 },
  { id: '3', type: 'video', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400', pending: false, challenge: null, likes: 18 },
  { id: '4', type: 'photo', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400', pending: true, challenge: null, likes: 0 },
  { id: '5', type: 'photo', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400', pending: false, challenge: 'Selfie mit Brautpaar', likes: 45 },
  { id: '6', type: 'photo', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400', pending: false, challenge: null, likes: 12 },
  { id: '7', type: 'video', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=400', pending: false, challenge: 'Tanzvideo', likes: 67 },
  { id: '8', type: 'photo', url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400', pending: true, challenge: null, likes: 0 },
];

// Mock Guestbook Messages
const mockMessages = [
  { id: '1', name: 'Maria & Thomas', message: 'Was für ein wundervoller Tag! Wir wünschen euch alles Gute für eure gemeinsame Zukunft. 💕', photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200', time: 'vor 2 Std.' },
  { id: '2', name: 'Familie Müller', message: 'Herzlichen Glückwunsch! Es war eine traumhafte Feier.', photo: null, time: 'vor 3 Std.' },
  { id: '3', name: 'Lisa K.', message: 'Ihr seid das beste Paar! Auf eine glückliche Ehe! 🥂', photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=200', time: 'vor 5 Std.' },
];

type TabType = 'overview' | 'gallery' | 'guestbook' | 'setup';
type GalleryFilter = 'all' | 'photos' | 'videos' | 'challenges' | 'top' | 'pending' | 'trash';

export default function HostDashboardV3Preview() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showQR, setShowQR] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');

  const tabs = [
    { id: 'overview' as const, label: 'Übersicht', icon: Home },
    { id: 'gallery' as const, label: 'Galerie', icon: ImageIcon },
    { id: 'guestbook' as const, label: 'Gästebuch', icon: BookOpen },
    { id: 'setup' as const, label: 'Setup', icon: Settings },
  ];

  // Calculate onboarding progress
  const completedSteps = onboardingSteps.filter(s => s.completed).length;
  const totalSteps = onboardingSteps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-[hsl(30_20%_98%)] text-stone-800">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-stone-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button className="p-1 -ml-1">
              <ChevronRight className="w-5 h-5 text-stone-400 rotate-180" />
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-stone-800 truncate">{mockEvent.title}</h1>
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span className={`w-2 h-2 rounded-full ${mockEvent.isActive ? 'bg-green-500' : 'bg-stone-300'}`} />
                {mockEvent.isActive ? 'Aktiv' : 'Inaktiv'}
              </div>
            </div>
          </div>
          
          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2.5 rounded-full bg-stone-100 hover:bg-stone-200 transition-colors">
              <ScanFace className="w-5 h-5 text-stone-600" />
            </button>
            <button 
              onClick={() => setShowQR(true)}
              className="p-2.5 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm"
            >
              <QrCode className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Tab Content */}
      <main className="pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab 
              key="overview" 
              stats={mockStats} 
              event={mockEvent}
              onboardingSteps={onboardingSteps}
              progressPercent={progressPercent}
              completedSteps={completedSteps}
              totalSteps={totalSteps}
            />
          )}
          {activeTab === 'gallery' && (
            <GalleryTab 
              key="gallery" 
              media={mockMedia}
              filter={galleryFilter}
              onFilterChange={setGalleryFilter}
              pendingCount={mockStats.pending}
            />
          )}
          {activeTab === 'guestbook' && (
            <GuestbookTab key="guestbook" messages={mockMessages} />
          )}
          {activeTab === 'setup' && (
            <SetupTab key="setup" />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-stone-200 backdrop-blur-xl">
        <div className="flex items-center justify-around py-2 safe-area-inset-bottom">
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
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-6 h-6 transition-colors ${isActive ? 'text-blue-600' : 'text-stone-400'}`}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                <span className={`text-[10px] transition-colors ${isActive ? 'text-blue-600 font-medium' : 'text-stone-400'}`}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-stone-800 mb-2">Event QR-Code</h2>
                <p className="text-sm text-stone-500 mb-4">{mockEvent.title}</p>
                
                <div className="w-48 h-48 mx-auto bg-stone-50 rounded-2xl p-4 border border-stone-200 mb-4">
                  <div className="w-full h-full bg-white rounded-lg flex items-center justify-center shadow-inner">
                    <QrCode className="w-24 h-24 text-stone-800" />
                  </div>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <button className="flex-1 py-2.5 px-4 rounded-xl bg-stone-100 text-stone-700 text-sm font-medium hover:bg-stone-200 transition-colors flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Speichern
                  </button>
                  <button className="flex-1 py-2.5 px-4 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Teilen
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowQR(false)}
                  className="text-sm text-stone-500 hover:text-stone-700"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ OVERVIEW TAB ============
function OverviewTab({ stats, event, onboardingSteps, progressPercent, completedSteps, totalSteps }: {
  stats: typeof mockStats;
  event: typeof mockEvent;
  onboardingSteps: OnboardingStep[];
  progressPercent: number;
  completedSteps: number;
  totalSteps: number;
}) {
  const currentStep = onboardingSteps.find(s => s.current);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 pt-4 space-y-4"
    >
      {/* Hero Card with Cover */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg">
        <div className="h-32 bg-gradient-to-br from-stone-200 to-stone-300">
          <img 
            src={event.coverImage} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl border-2 border-white shadow-lg overflow-hidden">
              <img src={event.profileImage} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{event.date}</p>
              <p className="text-white/80 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </p>
            </div>
          </div>
          <button className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            Vorschau
          </button>
        </div>
      </div>

      {/* Quick Stats - wie Screenshot mit farbigen Hintergründen */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={Camera} value={stats.photos} label="FOTOS" color="blue" />
        <StatCard icon={Users} value={stats.guests} label="GÄSTE" color="green" />
        <StatCard icon={Clock} value={stats.pending} label="AUSSTEHEND" color="yellow" highlight={stats.pending > 0} />
        <StatCard icon={BarChart3} value={stats.storage} label="SPEICHER" color="purple" />
      </div>

      {/* Onboarding Progress */}
      {progressPercent < 100 && (
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
              <p className="text-xs text-stone-500">Noch {totalSteps - completedSteps} Schritte</p>
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
          
          {/* Next Step */}
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
      )}

      {/* All Steps - aufgeklappt mit Klapp-Option */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <button 
          className="flex items-center justify-between w-full p-4 text-left hover:bg-stone-50 transition-colors"
        >
          <h3 className="font-semibold text-stone-800">Alle Schritte</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">{completedSteps}/{totalSteps}</span>
            <ChevronRight className="w-5 h-5 text-stone-400 rotate-90" />
          </div>
        </button>
        <div className="px-4 pb-4 space-y-1">
          {onboardingSteps.map((step, index) => (
            <div 
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                step.completed ? 'bg-green-50' : step.current ? 'bg-amber-50' : 'hover:bg-stone-50'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step.completed ? 'bg-green-500 text-white' : step.current ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-500'
              }`}>
                {step.completed ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`text-sm flex-1 ${
                step.completed ? 'text-green-700' : step.current ? 'text-amber-700 font-medium' : 'text-stone-500'
              }`}>
                {step.label}
              </span>
              {step.current && (
                <ChevronRight className="w-4 h-4 text-amber-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Event Status */}
      <EventStatusCard event={event} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction icon={Play} title="Live Wall" subtitle="Slideshow starten" color="purple" />
        <QuickAction icon={Share2} title="Teilen" subtitle="Link kopieren" color="blue" />
      </div>
    </motion.div>
  );
}

// ============ GALLERY TAB ============
function GalleryTab({ media, filter, onFilterChange, pendingCount }: {
  media: typeof mockMedia;
  filter: GalleryFilter;
  onFilterChange: (f: GalleryFilter) => void;
  pendingCount: number;
}) {
  const filters: { id: GalleryFilter; label: string; icon: any; count?: number }[] = [
    { id: 'all', label: 'Alle', icon: Filter },
    { id: 'photos', label: 'Fotos', icon: Camera },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'challenges', label: 'Challenges', icon: Target },
    { id: 'top', label: 'Top', icon: Star },
    { id: 'pending', label: 'Freigabe', icon: Clock, count: pendingCount },
    { id: 'trash', label: 'Papierkorb', icon: Trash2 },
  ];

  const filteredMedia = media.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'photos') return m.type === 'photo';
    if (filter === 'videos') return m.type === 'video';
    if (filter === 'challenges') return m.challenge;
    if (filter === 'top') return m.likes > 20;
    if (filter === 'pending') return m.pending;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="pt-4"
    >
      {/* Filter Chips - Horizontal Scroll */}
      <div className="px-4 pb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2">
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Media Grid */}
      <div className="px-4 grid grid-cols-3 gap-1">
        {filteredMedia.map((item) => (
          <motion.div
            key={item.id}
            layout
            className="relative aspect-square rounded-lg overflow-hidden bg-stone-100"
          >
            <img src={item.url} alt="" className="w-full h-full object-cover" />
            
            {/* Type indicator */}
            {item.type === 'video' && (
              <div className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                <Play className="w-3 h-3 text-white fill-white" />
              </div>
            )}
            
            {/* Pending badge */}
            {item.pending && (
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                <Clock className="w-3 h-3 text-white" />
              </div>
            )}
            
            {/* Challenge overlay */}
            {item.challenge && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-transparent p-2">
                <div className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-white" />
                  <span className="text-[10px] text-white font-medium truncate">{item.challenge}</span>
                </div>
              </div>
            )}
            
            {/* Top badge */}
            {item.likes > 20 && !item.pending && !item.challenge && (
              <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-yellow-400 flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 text-yellow-800 fill-yellow-800" />
                <span className="text-[10px] text-yellow-800 font-bold">{item.likes}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 flex items-center justify-center">
            <Camera className="w-8 h-8 text-stone-400" />
          </div>
          <p className="text-stone-500">Keine Medien in dieser Kategorie</p>
        </div>
      )}
    </motion.div>
  );
}

// ============ GUESTBOOK TAB ============
function GuestbookTab({ messages }: { messages: typeof mockMessages }) {
  const [showPDFModal, setShowPDFModal] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 pt-4 space-y-4"
    >
      {/* Header with PDF Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-800">Gästebuch</h2>
          <p className="text-sm text-stone-500">{messages.length} Einträge</p>
        </div>
        <button 
          onClick={() => setShowPDFModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Als PDF
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {msg.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-stone-800">{msg.name}</span>
                  <span className="text-xs text-stone-400">{msg.time}</span>
                </div>
                <p className="text-sm text-stone-600">{msg.message}</p>
                {msg.photo && (
                  <div className="mt-2 w-32 h-24 rounded-lg overflow-hidden">
                    <img src={msg.photo} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PDF Theme Modal */}
      <AnimatePresence>
        {showPDFModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowPDFModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-stone-800 mb-4">PDF Theme wählen</h2>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {['Elegant', 'Modern', 'Verspielt', 'Klassisch'].map((theme) => (
                  <button
                    key={theme}
                    className="p-4 rounded-xl border-2 border-stone-200 hover:border-blue-500 transition-colors text-center"
                  >
                    <div className="w-full aspect-[3/4] bg-stone-100 rounded-lg mb-2" />
                    <span className="text-sm font-medium text-stone-700">{theme}</span>
                  </button>
                ))}
              </div>
              
              <button className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
                PDF erstellen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ SETUP TAB ============
function SetupTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="px-4 pt-4 space-y-4"
    >
      {/* Design Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Design
          </h3>
        </div>
        <SetupRow icon={ImageIcon} label="Titelbild ändern" />
        <SetupRow icon={ImageIcon} label="Profilbild ändern" />
        <SetupRow icon={Sparkles} label="Willkommensnachricht" />
        <SetupRow icon={QrCode} label="QR-Code Designer" />
      </div>

      {/* Event Info Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Event-Info
          </h3>
        </div>
        <SetupRow icon={Calendar} label="Datum & Uhrzeit" />
        <SetupRow icon={MapPin} label="Location" />
        <SetupRow icon={LinkIcon} label="Event-URL" />
      </div>

      {/* Features Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Features
          </h3>
        </div>
        <SetupRow icon={Trophy} label="Challenges" />
        <SetupRow icon={Users} label="Gästeliste" />
        <SetupRow icon={BookOpen} label="Alben" />
        <SetupRow icon={BarChart3} label="Statistiken" />
      </div>

      {/* Settings Section */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <h3 className="font-semibold text-stone-700 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Einstellungen
          </h3>
        </div>
        <SetupRow icon={Eye} label="Sichtbarkeit" />
        <SetupRow icon={Clock} label="Upload-Zeitfenster" />
        <SetupRow icon={Users} label="Co-Hosts verwalten" />
        <SetupRow icon={Settings} label="Erweiterte Optionen" danger />
      </div>
    </motion.div>
  );
}

// ============ HELPER COMPONENTS ============

// Stats Card mit farbigem Hintergrund (wie Screenshot)
function StatCard({ icon: Icon, value, label, color, highlight }: {
  icon: any;
  value: number | string;
  label: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  highlight?: boolean;
}) {
  const colorStyles = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-100 to-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-900',
    },
    green: {
      bg: 'bg-gradient-to-br from-green-100 to-green-50',
      border: 'border-green-200',
      icon: 'text-green-500',
      text: 'text-green-900',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-100 to-yellow-50',
      border: highlight ? 'border-yellow-400 border-2' : 'border-yellow-200',
      icon: 'text-yellow-600',
      text: 'text-yellow-900',
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-100 to-purple-50',
      border: 'border-purple-200',
      icon: 'text-purple-500',
      text: 'text-purple-900',
    },
  };
  
  const styles = colorStyles[color];
  
  return (
    <div className={`rounded-2xl p-3 ${styles.bg} border ${styles.border} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${styles.icon}`} />
      </div>
      <div className={`text-2xl font-bold ${styles.text}`}>{value}</div>
      <div className="text-[10px] text-stone-500 font-medium tracking-wide">{label}</div>
    </div>
  );
}

function QuickAction({ icon: Icon, title, subtitle, color }: {
  icon: any;
  title: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'green';
}) {
  const colors = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-200',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-200',
    green: 'from-green-500/10 to-green-600/5 border-green-200',
  };
  const iconColors = {
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    green: 'text-green-500',
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

function SetupRow({ icon: Icon, label, danger }: {
  icon: any;
  label: string;
  danger?: boolean;
}) {
  return (
    <button className="flex items-center justify-between w-full px-4 py-4 border-b border-stone-100 last:border-0 text-left hover:bg-stone-50 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? 'text-red-500' : 'text-stone-400'}`} />
        <span className={danger ? 'text-red-600' : 'text-stone-700'}>{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-stone-400" />
    </button>
  );
}

// Event Status Card mit Info-Tooltip
function EventStatusCard({ event }: { event: typeof mockEvent }) {
  const [showInfo, setShowInfo] = useState(false);
  
  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${event.isActive ? 'bg-green-500' : 'bg-stone-300'}`} />
            <span className="font-semibold text-stone-800">Event Status</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked={event.isActive} className="sr-only peer" />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-6">
          <p className="text-sm text-stone-500">
            {event.isActive ? 'Gäste können Fotos hochladen' : 'Event ist deaktiviert'}
          </p>
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 rounded-full hover:bg-stone-100 transition-colors"
          >
            <Info className="w-4 h-4 text-stone-400" />
          </button>
        </div>
        
        {/* Info Tooltip */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 ml-6 overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Was bedeutet das?</p>
                    <p className="text-blue-700 text-xs">
                      Bei Deaktivierung werden folgende Funktionen gesperrt:
                    </p>
                    <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                      <li>• Upload-Funktion für Gäste</li>
                      <li>• Gäste-Galerie (öffentlich)</li>
                      <li>• Event-Link funktioniert nicht mehr</li>
                    </ul>
                    <p className="text-xs text-blue-600 mt-2">
                      ✓ Du als Host kannst die Fotos weiterhin sehen und herunterladen.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Erstellt am</span>
          <span className="text-stone-700">15. Jan 2026</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Event-Datum</span>
          <span className="text-stone-700">{event.date}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Speicher gültig bis</span>
          <span className="text-stone-700">15. März 2027</span>
        </div>
      </div>
    </div>
  );
}
