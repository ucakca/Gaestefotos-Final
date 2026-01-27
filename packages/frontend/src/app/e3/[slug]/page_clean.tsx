'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AlbumNavigation from '@/components/AlbumNavigation';
import BottomNavigation from '@/components/BottomNavigation';

const EventHeader = dynamic(() => import('@/components/EventHeader'), { ssr: false });
const ModernPhotoGrid = dynamic(() => import('@/components/ModernPhotoGrid'), { ssr: false });
import StoriesBar from '@/components/guest/StoriesBar';
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

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const didInitAuthRef = useRef(false);
  const didInitAuthFromUrlRef = useRef(false);
  const didInitCohostInviteRef = useRef(false);
  const didAcceptCohostInviteRef = useRef(false);
  const { isAuthenticated, loadUser, hasCheckedAuth, loading: authLoading } = useAuthStore();
  const { showToast } = useToastStore();

  const {
    event,
    categories,
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
    <div className="min-h-screen bg-app-bg">
      <EventHeader
        event={event}
        hostName={hostName}
        variant="hero"
        isStorageLocked={isStorageLocked}
        uploadDisabled={uploadDisabled}
        uploadDisabledReason={uploadDisabledReason}
        showUploadCta={false}
        hasStories={Array.isArray(stories) && stories.length > 0}
        onProfileClick={() => {
          if (Array.isArray(stories) && stories.length > 0) {
            setSelectedStoryIndex(0);
          }
        }}
        onStoryCreated={() => {
          reloadStories();
          reloadPhotos();
        }}
        onPhotosChanged={reloadPhotos}
      />

      <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

      <AlbumNavigation
        categories={categories}
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

      <div className="pb-24">
        {featuresConfig?.mysteryMode ? (
          <Container>
            <EmptyState
              icon="🎭"
              title="Mystery Mode aktiviert"
              description="Die Fotos werden später veröffentlicht..."
            />
          </Container>
        ) : (
          <ModernPhotoGrid
            photos={filteredPhotos as any}
            allowDownloads={featuresConfig?.allowDownloads !== false}
            allowComments={featuresConfig?.allowComments}
            eventSlug={slug}
            eventTitle={event.title}
            eventId={(event as any).id}
            onUploadSuccess={reloadPhotos}
            allowUploads={featuresConfig?.allowUploads}
            isStorageLocked={isStorageLocked}
            uploadDisabled={uploadDisabled}
            uploadDisabledReason={uploadDisabledReason}
          />
        )}

        {hasMore && (
          <div ref={loadMoreRef}>
            <LoadMoreIndicator loading={loadingMore} />
          </div>
        )}
      </div>

      <BottomNavigation
        eventId={event.id}
        eventSlug={slug}
        categories={categories}
        onAlbumSelect={setSelectedAlbum}
        selectedAlbum={selectedAlbum}
        event={event}
        guestId={undefined}
        uploaderName={undefined}
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
  );
}
