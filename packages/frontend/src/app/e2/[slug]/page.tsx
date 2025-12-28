'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import EventHeader from '@/components/EventHeader';
import AlbumNavigation from '@/components/AlbumNavigation';
import ModernPhotoGrid from '@/components/ModernPhotoGrid';
import BottomNavigation from '@/components/BottomNavigation';
import StoriesBar from '@/components/guest/StoriesBar';
import StoryViewer from '@/components/guest/StoryViewer';
import FaceSearch from '@/components/FaceSearch';
import { Alert } from '@/components/ui/Alert';
import { Centered } from '@/components/ui/Centered';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadMoreIndicator } from '@/components/ui/LoadMoreIndicator';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { PasswordGate } from '@/components/ui/PasswordGate';
import { Section } from '@/components/ui/Section';
import { Spinner } from '@/components/ui/Spinner';
import { Trophy } from 'lucide-react';
import { useGuestEventData } from '@/hooks/useGuestEventData';
import { useStoriesViewer } from '@/hooks/useStoriesViewer';

export default function PublicEventPageV2() {
  const params = useParams();
  const slug = params.slug as string;

  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
    return (
      <Centered>
        <LoadingRow text="Laden..." size="md" />
      </Centered>
    );
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
    <div className="min-h-screen bg-white">
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
        <Section borderColorClassName="border-yellow-200">
          <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-gray-900">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <p className="text-sm text-gray-700">
                <strong>Tolle Challenges verfügbar!</strong> Klicke auf "Challenges" im Menü unten, um teilzunehmen.
              </p>
            </div>
          </Alert>
        </Section>
      )}

      {featuresConfig?.faceSearch !== false && (
        <Section borderColorClassName="border-gray-100">
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
            allowDownloads={featuresConfig?.allowDownloads}
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
