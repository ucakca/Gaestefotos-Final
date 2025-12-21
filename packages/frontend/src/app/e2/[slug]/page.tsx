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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex items-center gap-2 text-gray-600">
          <Spinner size="md" />
          <div>Laden...</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-4">
          <Alert variant="danger">{error || 'Event nicht gefunden'}</Alert>
        </div>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">Event-Passwort</h2>
          <p className="text-gray-600 mb-6 text-sm">Dieses Event ist passwortgeschützt.</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                required
              />
              {passwordError && (
                <Alert variant="danger" className="mt-2">
                  {passwordError}
                </Alert>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg">
              Zugriff erhalten
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const totalPhotos = filteredPhotos.length;

  return (
    <div className="min-h-screen bg-white">
      <EventHeader event={event} hostName={hostName} />
      <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

      <AlbumNavigation
        categories={categories}
        selectedAlbum={selectedAlbum}
        onAlbumSelect={setSelectedAlbum}
        totalPhotos={totalPhotos}
      />

      {featuresConfig?.challengesEnabled === true && Array.isArray(challenges) && challenges.filter((c: any) => c?.isActive).length > 0 && (
        <div className="px-4 py-3 border-b border-yellow-200">
          <Alert className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 text-gray-900">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <p className="text-sm text-gray-700">
                <strong>Tolle Challenges verfügbar!</strong> Klicke auf "Challenges" im Menü unten, um teilzunehmen.
              </p>
            </div>
          </Alert>
        </div>
      )}

      {featuresConfig?.faceSearch !== false && (
        <div className="px-4 py-3 border-b border-gray-100">
          <FaceSearch eventId={event.id} />
        </div>
      )}

      <div className="pb-24">
        {featuresConfig?.mysteryMode ? (
          <div className="flex flex-col items-center justify-center py-32 px-4">
            <div className="text-6xl mb-4">🎭</div>
            <p className="text-xl text-gray-900 mb-2 font-semibold">Mystery Mode aktiviert</p>
            <p className="text-gray-500 text-sm text-center max-w-sm">Die Fotos werden später veröffentlicht...</p>
          </div>
        ) : (
          <ModernPhotoGrid
            photos={filteredPhotos as any}
            allowDownloads={featuresConfig?.allowDownloads}
            eventSlug={slug}
            eventTitle={event.title}
            eventId={(event as any).id}
            onUploadSuccess={reloadPhotos}
            allowUploads={featuresConfig?.allowUploads}
          />
        )}

        {hasMore && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Spinner size="sm" />
                <div>Lade weitere Fotos...</div>
              </div>
            )}
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
