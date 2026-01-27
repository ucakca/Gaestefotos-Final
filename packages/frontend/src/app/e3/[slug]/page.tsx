'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import EventHero from '@/components/e3/EventHero';
import AlbumFilter from '@/components/e3/AlbumFilter';
import PhotoGrid from '@/components/e3/PhotoGrid';
import BottomNav from '@/components/e3/BottomNav';
import ChallengesTab from '@/components/e3/tabs/ChallengesTab';
import GuestbookTab from '@/components/e3/tabs/GuestbookTab';
import InfoTab from '@/components/e3/tabs/InfoTab';
import WifiNotification from '@/components/e3/WifiNotification';
import PhotoLightbox from '@/components/e3/PhotoLightbox';
import StoriesBar from '@/components/guest/StoriesBar';
import StickyHeader from '@/components/e3/StickyHeader';
import JumpToTop from '@/components/e3/JumpToTop';
import UploadFAB from '@/components/e3/UploadFAB';
import UploadModal from '@/components/e3/UploadModal';
import QRCodeShare from '@/components/e3/QRCodeShare';
import SlideshowMode from '@/components/e3/SlideshowMode';
import { Alert } from '@/components/ui/Alert';
import { Centered } from '@/components/ui/Centered';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { LoadMoreIndicator } from '@/components/ui/LoadMoreIndicator';
import { PasswordGate } from '@/components/ui/PasswordGate';
import { Section } from '@/components/ui/Section';
import { Trophy } from 'lucide-react';
import { useGuestEventData } from '@/hooks/useGuestEventData';
import { useScrollHeader } from '@/hooks/useScrollHeader';
import { useStoriesViewer } from '@/hooks/useStoriesViewer';
import api, { formatApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/store/toastStore';

const StoryViewer = dynamic(() => import('@/components/guest/StoryViewer'), { ssr: false });
const FaceSearch = dynamic(() => import('@/components/FaceSearch'), { ssr: false });

export default function PublicEventPageV2() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'guestbook' | 'info'>('feed');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [guestbookEntries, setGuestbookEntries] = useState<any[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadChallengeId, setUploadChallengeId] = useState<string | null>(null);
  const [uploadChallengeTitle, setUploadChallengeTitle] = useState<string | null>(null);
  const [likeUpdates, setLikeUpdates] = useState<Record<string, { liked: boolean; count: number }>>({});

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { isHeaderVisible, showJumpToTop, scrollToTop } = useScrollHeader(300);

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
    password,
    setPassword,
    passwordError,
    handlePasswordSubmit,
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
          password={password}
          onPasswordChange={setPassword}
          passwordError={passwordError}
          onSubmit={handlePasswordSubmit}
        />
      </Centered>
    );
  }

  const totalPhotos = filteredPhotos.length;

  return (
    <main className="relative min-h-screen bg-app-bg">
      <StickyHeader
        hostAvatar={event?.designConfig?.profileImage || '/placeholder.svg'}
        eventTitle={event?.title || ''}
        hostName={hostName || 'Host'}
        isVisible={isHeaderVisible && !loading}
        onScrollToTop={scrollToTop}
        onSlideshow={() => setSlideshowOpen(true)}
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
      />

      {/* Tab Content */}
      {activeTab === 'feed' && (
        <>
          {/* Stories Bar - only on Feed */}
          <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

          {/* WiFi Notification - if configured */}
          {(event.designConfig as any)?.wifiSsid && (event.designConfig as any)?.wifiPassword && (
            <WifiNotification
              ssid={(event.designConfig as any).wifiSsid}
              password={(event.designConfig as any).wifiPassword}
            />
          )}

          {/* V0 Album Filter (Pills) - only on Feed */}
          <AlbumFilter
            categories={categories.map(cat => ({
              id: cat.id,
              name: cat.name,
              icon: cat.iconKey || undefined,
              photoCount: photos.filter(p => p.categoryId === cat.id).length,
            }))}
            selectedAlbum={selectedAlbum}
            onAlbumSelect={setSelectedAlbum}
            totalPhotos={totalPhotos}
          />

          {featuresConfig?.challengesEnabled === true && Array.isArray(challenges) && challenges.filter((c: any) => c?.isActive).length > 0 && (
            <Section borderColorClassName="border-status-warning">
              <Alert className="bg-app-bg border-status-warning text-app-fg">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-status-warning" />
                  <p className="text-sm text-app-fg">
                    <strong>Tolle Challenges verfügbar!</strong> Klicke auf "Challenges" im Menü unten, um teilzunehmen.
                  </p>
                </div>
              </Alert>
            </Section>
          )}

          {featuresConfig?.faceSearch !== false && (
            <Section>
              <FaceSearch eventId={event.id} />
            </Section>
          )}

          {/* V0 Photo Grid (Masonry) */}
          <div className="px-4 pb-24">
            {featuresConfig?.mysteryMode ? (
              <Container>
                <EmptyState
                  icon="🎭"
                  title="Mystery Mode aktiviert"
                  description="Die Fotos werden später veröffentlicht..."
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

      {activeTab === 'challenges' && (
        <ChallengesTab
          challenges={challenges || []}
          eventId={event.id}
          onChallengeClick={(challenge) => {
            // Open upload modal for this challenge
            setUploadChallengeId(challenge.id);
            setUploadChallengeTitle(challenge.title);
            setUploadModalOpen(true);
          }}
        />
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
        challengeCount={challenges?.filter((c: any) => c?.isActive).length || 0}
        guestbookCount={0}
      />

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
        onDragPrev={onStoryPrev}
        onDragNext={onStoryNext}
      />
      </div>

      <JumpToTop
        isVisible={showJumpToTop && !loading}
        onClick={scrollToTop}
      />

      <UploadFAB
        isVisible={activeTab === 'feed' && !loading && !uploadDisabled && !isStorageLocked}
        onUploadPhoto={() => {
          setUploadChallengeId(null);
          setUploadChallengeTitle(null);
          setUploadModalOpen(true);
        }}
        onTakePhoto={() => {
          setUploadChallengeId(null);
          setUploadChallengeTitle(null);
          setUploadModalOpen(true);
        }}
      />

      <UploadModal
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
          setUploadModalOpen(false);
          setUploadChallengeId(null);
          setUploadChallengeTitle(null);
        }}
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
    </main>
  );
}
