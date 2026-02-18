'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import EventHero from '@/components/e3/EventHero';
import AlbumFilter from '@/components/e3/AlbumFilter';
import PhotoGrid from '@/components/e3/PhotoGrid';
import BottomNav, { TabId } from '@/components/e3/BottomNav';
import ChallengesTab from '@/components/e3/tabs/ChallengesTab';
import GuestbookTab from '@/components/e3/tabs/GuestbookTab';
import InfoTab from '@/components/e3/tabs/InfoTab';
import WifiNotification from '@/components/e3/WifiNotification';
import PhotoLightbox from '@/components/e3/PhotoLightbox';
import StoriesBar from '@/components/guest/StoriesBar';
import StickyHeader from '@/components/e3/StickyHeader';
import JumpToTop from '@/components/e3/JumpToTop';
// UploadModal replaced by WorkflowUploadModal (loaded dynamically below)
import QRCodeShare from '@/components/e3/QRCodeShare';
import SlideshowMode from '@/components/e3/SlideshowMode';
import LeaderboardOverlay from '@/components/e3/LeaderboardOverlay';
import AchievementToast from '@/components/e3/AchievementToast';
const SocialProofToast = dynamic(() => import('@/components/gamification/SocialProofToast'), { ssr: false });
const NewPhotoIndicator = dynamic(() => import('@/components/gamification/MicroInteractions').then(m => ({ default: m.NewPhotoIndicator })), { ssr: false });
import PushNotificationBanner from '@/components/e3/PushNotificationBanner';
import { Alert } from '@/components/ui/Alert';
import { Centered } from '@/components/ui/Centered';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { LoadMoreIndicator } from '@/components/ui/LoadMoreIndicator';
import { PasswordGate } from '@/components/ui/PasswordGate';
import { Section } from '@/components/ui/Section';
import { motion, AnimatePresence } from 'framer-motion';
import { EventThemeProvider } from '@/components/event-theme/EventThemeProvider';
import { Trophy, Play, X } from 'lucide-react';
import { useGuestEventData } from '@/hooks/useGuestEventData';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useScrollHeader } from '@/hooks/useScrollHeader';
import { useStoriesViewer } from '@/hooks/useStoriesViewer';
import api, { formatApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';
import { useTranslations } from '@/components/I18nProvider';

const StoryViewer = dynamic(() => import('@/components/guest/StoryViewer'), { ssr: false });
// FaceSearch replaced by WorkflowFaceSearchModal
const MosaicPrintUpload = dynamic(() => import('@/components/mosaic/MosaicPrintUpload'), { ssr: false });
const WorkflowUploadModal = dynamic(() => import('@/components/workflow-runtime/WorkflowUploadModal'), { ssr: false });
const WorkflowFaceSearchModal = dynamic(() => import('@/components/workflow-runtime/WorkflowFaceSearchModal'), { ssr: false });
const QuickUploadModal = dynamic(() => import('@/components/upload/QuickUploadModal'), { ssr: false });

export default function PublicEventPageV2() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const [fotospassOpen, setFotospassOpen] = useState(false);
  const [hasMosaicWall, setHasMosaicWall] = useState(false);
  const [liveSheetOpen, setLiveSheetOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [faceSearchOpen, setFaceSearchOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadChallengeId, setUploadChallengeId] = useState<string | null>(null);
  const [uploadChallengeTitle, setUploadChallengeTitle] = useState<string | null>(null);
  const [likeUpdates, setLikeUpdates] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [forceShowWifi, setForceShowWifi] = useState(false);
  const [mosaicPrintEnabled, setMosaicPrintEnabled] = useState(false);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { isHeaderVisible, showJumpToTop, scrollToTop } = useScrollHeader(300);
  const tNav = useTranslations('nav');
  const tGuest = useTranslations('guest');

  const didInitAuthRef = useRef(false);
  const didInitAuthFromUrlRef = useRef(false);
  const didInitCohostInviteRef = useRef(false);
  const didAcceptCohostInviteRef = useRef(false);
  const { isAuthenticated, loadUser, hasCheckedAuth, loading: authLoading } = useAuthStore();
  const { showToast } = useToastStore();

  const {
    event,
    categories,
    photos,
    filteredPhotos,
    challenges,
    featuresConfig,
    hostName,
    isStorageLocked,
    uploadDisabled,
    uploadDisabledReason,
    loading,
    error,
    passwordRequired,
    passwordError,
    submitPassword,
    hasMore,
    loadingMore,
    loadMore,
    reloadPhotos,
    inviteExchangeBump,
  } = useGuestEventData(slug, selectedAlbum);

  const {
    stories,
    selectedStoryIndex,
    setSelectedStoryIndex,
    storyProgress,
    onStoryPrev,
    onStoryNext,
    onStoryPause,
    onStoryResume,
    reloadStories,
  } = useStoriesViewer(event?.id ?? null, inviteExchangeBump);

  // Realtime notifications for gamification (Social Proof Toast + New Photo Indicator)
  const {
    notifications: realtimeNotifications,
    newPhotoCount,
    clearNewPhotos,
  } = useRealtimeNotifications(event?.id || '');

  // Check if mosaic wall is active for this event
  useEffect(() => {
    if (!event?.id) return;
    api.get(`/events/${event.id}/mosaic/display`)
      .then(res => {
        const wall = res.data?.wall;
        if (wall?.status === 'ACTIVE') {
          setHasMosaicWall(true);
          if (wall?.printEnabled) {
            setMosaicPrintEnabled(true);
          }
        }
      })
      .catch(() => {});
  }, [event?.id]);

  // Load guestbook entries
  useEffect(() => {
    if (!event?.id) return;
    api.get(`/events/${event.id}/guestbook`)
      .then(res => setGuestbookEntries(res.data?.entries || []))
      .catch(() => {});
  }, [event?.id]);

  const reloadGuestbook = () => {
    if (!event?.id) return;
    api.get(`/events/${event.id}/guestbook`)
      .then(res => setGuestbookEntries(res.data?.entries || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (didInitAuthRef.current) return;
    didInitAuthRef.current = true;
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didInitAuthFromUrlRef.current) return;
    didInitAuthFromUrlRef.current = true;

    try {
      if (typeof window === 'undefined') return;

      const url = new URL(window.location.href);
      const tokenFromUrl = url.searchParams.get('token');
      if (!tokenFromUrl) return;

      try {
        sessionStorage.setItem('token', tokenFromUrl);
        localStorage.removeItem('token');
      } catch {
      }

      url.searchParams.delete('token');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);

      loadUser();
    } catch {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (didInitCohostInviteRef.current) return;
    didInitCohostInviteRef.current = true;

    try {
      if (typeof window === 'undefined') return;

      const url = new URL(window.location.href);
      const token = url.searchParams.get('cohostInvite');
      if (token) {
        try {
          sessionStorage.setItem('cohost_invite_token', token);
        } catch {
        }
        url.searchParams.delete('cohostInvite');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!hasCheckedAuth || authLoading) return;
    if (typeof window === 'undefined') return;

    let token: string | null = null;
    try {
      token = sessionStorage.getItem('cohost_invite_token');
    } catch {
      token = null;
    }

    if (!token) return;

    if (!isAuthenticated) {
      const returnUrl = window.location.pathname + window.location.search + window.location.hash;
      const kaufUrl = new URL('https://xn--gstefotos-v2a.com/register/');
      kaufUrl.searchParams.set('gfReturnUrl', returnUrl);
      window.location.href = kaufUrl.toString();
    }
  }, [hasCheckedAuth, authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (didAcceptCohostInviteRef.current) return;
    if (!event?.id) return;
    if (!hasCheckedAuth || authLoading) return;
    if (!isAuthenticated) return;

    let token: string | null = null;
    try {
      token = sessionStorage.getItem('cohost_invite_token');
    } catch {
      token = null;
    }
    if (!token) return;

    didAcceptCohostInviteRef.current = true;

    (async () => {
      try {
        await api.post('/cohosts/accept', { inviteToken: token });
        try {
          sessionStorage.removeItem('cohost_invite_token');
        } catch {
        }
        showToast('Co-Host Einladung angenommen', 'success');
      } catch (e: any) {
        try {
          sessionStorage.removeItem('cohost_invite_token');
        } catch {
        }
        showToast(formatApiError(e), 'error');
      }
    })().catch(() => null);
  }, [event?.id, hasCheckedAuth, authLoading, isAuthenticated, showToast]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    const el = loadMoreRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  if (error || !event) {
    return <ErrorState message={error || 'Event nicht gefunden'} />;
  }

  if (passwordRequired) {
    return (
      <Centered>
        <PasswordGate
          onSubmit={submitPassword}
          serverError={passwordError}
        />
      </Centered>
    );
  }

  const totalPhotos = filteredPhotos.length;

  const eventTheme = (event as any)?.theme || null;
  const customThemeData = (event as any)?.customThemeData || null;

  return (
    <EventThemeProvider theme={eventTheme} customOverrides={customThemeData}>
    <main className="relative min-h-screen bg-background">
      <StickyHeader
        hostAvatar={event?.designConfig?.profileImage || '/placeholder.svg'}
        eventTitle={event?.title || ''}
        hostName={hostName || 'Host'}
        isVisible={isHeaderVisible && !loading}
        onScrollToTop={scrollToTop}
        onLeaderboard={() => setLeaderboardOpen(true)}
        onShare={() => setQrCodeOpen(true)}
      />
      <div className="min-h-screen bg-background pb-20">
      {/* V0 EventHero */}
      <EventHero
        event={event}
        hostName={hostName}
        hasStories={Array.isArray(stories) && stories.length > 0}
        onProfileClick={() => {
          if (Array.isArray(stories) && stories.length > 0) {
            setSelectedStoryIndex(0);
          }
        }}
        onAddStory={() => {
          reloadStories();
          reloadPhotos();
        }}
        photoCount={totalPhotos}
        videoCount={(event as any)?._count?.videos || 0}
        visitorCount={(event as any)?.visitCount || 0}
        isStorageLocked={isStorageLocked}
        uploadDisabled={uploadDisabled}
        uploadDisabledReason={uploadDisabledReason}
        dashboardUrl={`/events/${event.id}/dashboard`}
        onShare={() => setQrCodeOpen(true)}
        hasWifi={!!((event as any).wifiName && (event as any).wifiPassword)}
        onWifiClick={() => setForceShowWifi(true)}
      />

      {/* Tab Content */}
      {activeTab === 'feed' && (
        <>
          {/* Stories Bar - only on Feed */}
          <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

          {/* WiFi Notification - if configured */}
          {(event as any).wifiName && (event as any).wifiPassword && (
            <WifiNotification
              ssid={(event as any).wifiName}
              password={(event as any).wifiPassword}
              eventId={event.id}
              forceShow={forceShowWifi}
              onDismiss={() => setForceShowWifi(false)}
            />
          )}

          {/* Mosaic Print Upload - if print terminal mode is active */}
          {mosaicPrintEnabled && event?.id && (
            <div className="px-4 mt-4 mb-4">
              <MosaicPrintUpload eventId={event.id} eventSlug={slug} />
            </div>
          )}

          {/* V0 Album Filter (Pills) - only on Feed */}
          <AlbumFilter
            categories={categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              icon: (cat as any).iconKey || undefined,
              photoCount: (cat as any)._count?.photos ?? photos.filter(p => p.categoryId === cat.id).length,
            }))}
            selectedAlbum={selectedAlbum}
            onAlbumSelect={setSelectedAlbum}
            totalPhotos={totalPhotos}
          />

          {featuresConfig?.challengesEnabled === true && Array.isArray(challenges) && challenges.filter((c: any) => c?.isActive).length > 0 && (
            <Section borderColorClassName="border-status-warning">
              <Alert className="bg-background border-status-warning text-foreground">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-status-warning" />
                  <p className="text-sm text-foreground">
                    <strong>{tGuest('challengesAvailable')}</strong> {tGuest('challengesHint')}
                  </p>
                </div>
              </Alert>
            </Section>
          )}

          {/* Face Search now handled by WorkflowFaceSearchModal below */}

          {/* V0 Photo Grid (Masonry) */}
          <div className="px-4 pt-4 pb-24">
            {featuresConfig?.mysteryMode ? (
              <Container>
                <EmptyState
                  icon="🎭"
                  title={tGuest('mysteryMode')}
                  description={tGuest('mysteryModeDesc')}
                />
              </Container>
            ) : (
              <PhotoGrid
                photos={filteredPhotos as any}
                eventId={event.id}
                eventSlug={slug}
                allowDownloads={featuresConfig?.allowDownloads !== false}
                allowComments={featuresConfig?.allowComments}
                onPhotoClick={(photo, index) => setSelectedPhotoIndex(index)}
                onUploadSuccess={reloadPhotos}
                hasMore={hasMore}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
                isStorageLocked={isStorageLocked}
                uploadDisabled={uploadDisabled}
                externalLikeUpdates={likeUpdates}
              />
            )}

            {hasMore && (
              <div ref={loadMoreRef}>
                <LoadMoreIndicator loading={loadingMore} />
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'guestbook' && (
        <GuestbookTab
          entries={guestbookEntries}
          eventId={event.id}
          onEntrySubmit={reloadGuestbook}
        />
      )}

      {activeTab === 'info' && (
        <InfoTab
          event={event}
          hostName={hostName}
        />
      )}

      {/* V0 Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLivePress={() => {
          if (hasMosaicWall) {
            setLiveSheetOpen(true);
          } else {
            setSlideshowOpen(true);
          }
        }}
        onCameraAction={(action) => {
          switch (action) {
            case 'photo':
              setQuickUploadOpen(true);
              break;
            case 'game':
              setFotospassOpen(true);
              break;
            case 'ki-style':
              setUploadChallengeId(null);
              setUploadChallengeTitle('KI Foto-Stil');
              setUploadModalOpen(true);
              break;
            case 'face-search':
              setActiveTab('feed');
              setFaceSearchOpen(true);
              break;
            case 'mosaic-upload':
              setUploadChallengeId(null);
              setUploadChallengeTitle('Mosaic Wall');
              setUploadModalOpen(true);
              break;
          }
        }}
        challengeCount={challenges?.filter((c: any) => c?.isActive).length || 0}
        guestbookCount={guestbookEntries.length}
        showFotoSpass={featuresConfig?.enableFotoSpass !== false && featuresConfig?.challengesEnabled !== false}
        showStyleTransfer={featuresConfig?.enableFotoSpass !== false && featuresConfig?.enableStyleTransfer !== false}
        showAiGames={featuresConfig?.enableFotoSpass !== false && featuresConfig?.enableAiGames !== false}
        showFaceSearch={featuresConfig?.faceSearch !== false}
        hasMosaicWall={hasMosaicWall}
      />

      {/* Live Wall Sheet — Diashow vs Mosaic choice */}
      <AnimatePresence>
        {liveSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
              onClick={() => setLiveSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setLiveSheetOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-card text-card-foreground rounded-t-3xl shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6 pb-2">
                <h3 className="text-lg font-bold">{tNav('liveView')}</h3>
              </div>
              <div className="px-4 pb-8 space-y-1">
                <button
                  onClick={() => { setLiveSheetOpen(false); setSlideshowOpen(true); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 active:bg-muted/70 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Play className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">{tNav('slideshow')}</div>
                    <div className="text-xs text-muted-foreground">{tNav('slideshowDesc')}</div>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setLiveSheetOpen(false);
                    router.push(`/live/${slug}/mosaic`);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/50 active:bg-muted/70 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'hsl(var(--primary) / 0.1)' }}>
                    <span className="text-xl">🧩</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold">{tNav('mosaicWall')}</div>
                    <div className="text-xs text-muted-foreground">{tNav('mosaicWallDesc')}</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Foto-Spaß Overlay (opened from AI Bottom Sheet → game) */}
      <AnimatePresence>
        {fotospassOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm"
              onClick={() => setFotospassOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setFotospassOpen(false); }}
              className="fixed bottom-0 left-0 right-0 z-[56] bg-card text-card-foreground rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              <div className="px-6 pb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold">{tGuest('fotoGames')}</h3>
                <button
                  onClick={() => setFotospassOpen(false)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="pb-8">
                <ChallengesTab
                  challenges={challenges || []}
                  eventId={event.id}
                  onChallengeClick={(challenge) => {
                    setFotospassOpen(false);
                    setUploadChallengeId(challenge.id);
                    setUploadChallengeTitle(challenge.title);
                    setUploadModalOpen(true);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Photo Lightbox */}
      <PhotoLightbox
        photos={filteredPhotos as any}
        selectedIndex={selectedPhotoIndex}
        onClose={() => setSelectedPhotoIndex(null)}
        onPrev={() => setSelectedPhotoIndex(prev => prev !== null && prev > 0 ? prev - 1 : prev)}
        onNext={() => setSelectedPhotoIndex(prev => prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : prev)}
        allowDownloads={featuresConfig?.allowDownloads !== false}
        allowComments={featuresConfig?.allowComments}
        eventSlug={slug}
        eventTitle={event?.title}
        onLikeChange={(photoId, liked, count) => {
          setLikeUpdates(prev => ({ ...prev, [photoId]: { liked, count } }));
        }}
      />

      <StoryViewer
        stories={stories}
        selectedStoryIndex={selectedStoryIndex}
        storyProgress={storyProgress}
        onClose={() => setSelectedStoryIndex(null)}
        onPrev={onStoryPrev}
        onNext={onStoryNext}
        onPause={onStoryPause}
        onResume={onStoryResume}
      />
      </div>

      <JumpToTop
        isVisible={showJumpToTop && !loading}
        onClick={scrollToTop}
      />

      {/* UploadFAB hidden — camera is now in center nav button */}

      <WorkflowFaceSearchModal
        isOpen={faceSearchOpen && featuresConfig?.faceSearch !== false}
        onClose={() => setFaceSearchOpen(false)}
        eventId={event?.id || ''}
      />

      <QuickUploadModal
        open={quickUploadOpen}
        onClose={() => setQuickUploadOpen(false)}
        eventId={event?.id || ''}
        categories={categories?.map((cat: any) => ({ id: cat.id, name: cat.name, icon: cat.iconKey })) || []}
        onComplete={() => reloadPhotos()}
      />

      <WorkflowUploadModal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadChallengeId(null);
          setUploadChallengeTitle(null);
        }}
        eventId={event?.id || ''}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        challengeId={uploadChallengeId}
        challengeTitle={uploadChallengeTitle}
        onUploadSuccess={() => {
          reloadPhotos();
          setUploadChallengeId(null);
          setUploadChallengeTitle(null);
        }}
        flowType={uploadChallengeTitle === 'KI Foto-Stil' ? 'KI_KUNST' : 'UPLOAD'}
      />

      <QRCodeShare
        eventUrl={typeof window !== 'undefined' ? window.location.origin + '/e3/' + slug : ''}
        eventTitle={event?.title || ''}
        isOpen={qrCodeOpen}
        onClose={() => setQrCodeOpen(false)}
      />

      <SlideshowMode
        photos={filteredPhotos}
        isOpen={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        eventTitle={event?.title || ''}
        eventSlug={slug}
        eventId={event?.id || ''}
      />

      <LeaderboardOverlay
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        eventId={event?.id || ''}
      />

      <AchievementToast eventId={event?.id || ''} />
      <PushNotificationBanner eventId={event?.id || ''} />

      {/* Gamification: Social Proof Toast (realtime activity) */}
      <SocialProofToast notifications={realtimeNotifications} maxVisible={2} />

      {/* Gamification: New Photo Indicator (realtime) */}
      <AnimatePresence>
        {newPhotoCount > 0 && activeTab === 'feed' && (
          <NewPhotoIndicator onClick={() => {
            clearNewPhotos();
            reloadPhotos();
            scrollToTop();
          }} />
        )}
      </AnimatePresence>
    </main>
    </EventThemeProvider>
  );
}
