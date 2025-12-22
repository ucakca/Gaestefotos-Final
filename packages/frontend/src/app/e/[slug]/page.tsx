'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import BottomNavigation from '@/components/BottomNavigation';
import EventHeader from '@/components/EventHeader';
import AlbumNavigation from '@/components/AlbumNavigation';
import ModernPhotoGrid from '@/components/ModernPhotoGrid';
import FaceSearch from '@/components/FaceSearch';
import StoriesBar from '@/components/guest/StoriesBar';
import StoryViewer from '@/components/guest/StoryViewer';
import { Trophy } from 'lucide-react';

type Category = {
  id: string;
  eventId: string;
  name: string;
  order: number;
  createdAt: any;
  updatedAt: any;
  _count?: {
    photos: number;
  };
};

export default function PublicEventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [guestId, setGuestId] = useState<string | undefined>();
  const [uploaderName, setUploaderName] = useState<string | undefined>();

  const [stories, setStories] = useState<any[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const viewedStoriesRef = useRef<Set<string>>(new Set());
  const storyProgressRafRef = useRef<number | null>(null);
  const storyProgressStartedAtRef = useRef<number>(0);
  const storyProgressRef = useRef<number>(0);
  const storyPausedRef = useRef<boolean>(false);
  const STORY_DURATION_MS = 6000;
  
  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const photosPerPage = 30; // Anzahl Fotos pro Seite
  
  // Loading flag to prevent multiple simultaneous loads
  const loadingRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const inviteTokenRef = useRef<string | null>(null);

  const extractInviteTokenFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;

    // 1) Query param (?invite=...)
    const queryParams = new URLSearchParams(window.location.search);
    const fromQuery = queryParams.get('invite');
    if (fromQuery) return fromQuery;

    // 2) Hash (#invite=...)
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    if (!hash) return null;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get('invite');
  };

  const loadStories = async () => {
    if (!event?.id) return;
    try {
      const { data } = await api.get(`/events/${event.id}/stories`);
      setStories(Array.isArray(data?.stories) ? data.stories : []);
    } catch {
      setStories([]);
    }
  };

  const removeInviteFromUrl = (): void => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('invite');

    if (url.hash) {
      const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
      const hashParams = new URLSearchParams(hash);
      hashParams.delete('invite');
      const nextHash = hashParams.toString();
      url.hash = nextHash ? `#${nextHash}` : '';
    }

    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const inviteToken = extractInviteTokenFromUrl();
        if (inviteToken) {
          inviteTokenRef.current = inviteToken;
          removeInviteFromUrl();
        }
      } catch {
        // Ignore invite exchange errors here; access will be enforced by API calls.
      }

      loadEvent();
    };

    init();
  }, [slug]);

  useEffect(() => {
    const exchange = async () => {
      if (!event?.id) return;
      const inviteToken = inviteTokenRef.current;
      if (!inviteToken) return;

      inviteTokenRef.current = null;
      try {
        await api.post(`/events/${event.id}/access`, null, {
          params: { invite: inviteToken },
        });
      } catch {
        // Ignore invite exchange errors here; access will be enforced by API calls.
      } finally {
        // Stories require event access; after the cookie is issued, re-fetch stories to avoid a race
        // where /stories was loaded before the invite token exchange completed.
        loadStories();
      }
    };

    exchange();
  }, [event?.id]);

  useEffect(() => {
    if (event?.id) {
      loadPhotos(true); // Reset and load first page
      loadCategories();
      loadChallenges();
      loadStories();
    }
  }, [event?.id]);

  useEffect(() => {
    const trackView = async () => {
      if (selectedStoryIndex === null) return;
      const s = stories[selectedStoryIndex];
      const storyId = s?.id ? String(s.id) : '';
      if (!storyId) return;
      if (viewedStoriesRef.current.has(storyId)) return;
      viewedStoriesRef.current.add(storyId);
      try {
        await api.post(`/events/${storyId}/view`);
      } catch {
        // ignore
      }
    };

    trackView();
  }, [selectedStoryIndex, stories]);

  useEffect(() => {
    storyProgressRef.current = storyProgress;
  }, [storyProgress]);

  useEffect(() => {
    if (selectedStoryIndex === null) return;
    if (!stories[selectedStoryIndex]) return;

    const preload = (idx: number) => {
      const url = stories[idx]?.photo?.url;
      if (!url || typeof Image === 'undefined') return;
      const img = new Image();
      img.src = url;
    };

    if (stories.length > 1) {
      preload((selectedStoryIndex + 1) % stories.length);
      preload((selectedStoryIndex - 1 + stories.length) % stories.length);
    }
  }, [selectedStoryIndex, stories]);

  useEffect(() => {
    if (storyProgressRafRef.current !== null) {
      cancelAnimationFrame(storyProgressRafRef.current);
      storyProgressRafRef.current = null;
    }

    if (selectedStoryIndex === null || !stories[selectedStoryIndex]) {
      setStoryProgress(0);
      return;
    }

    setStoryProgress(0);
    storyProgressStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = () => {
      if (selectedStoryIndex === null) return;

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (storyPausedRef.current) {
        storyProgressStartedAtRef.current = now - storyProgressRef.current * STORY_DURATION_MS;
        storyProgressRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = now - storyProgressStartedAtRef.current;
      const nextProgress = Math.min(1, elapsed / STORY_DURATION_MS);
      setStoryProgress(nextProgress);
      storyProgressRef.current = nextProgress;

      if (nextProgress >= 1) {
        setSelectedStoryIndex((i) => {
          if (i === null) return null;
          if (stories.length <= 1) return null;
          if (i >= stories.length - 1) return null;
          return i + 1;
        });
        return;
      }

      storyProgressRafRef.current = requestAnimationFrame(tick);
    };

    storyProgressRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (storyProgressRafRef.current !== null) {
        cancelAnimationFrame(storyProgressRafRef.current);
        storyProgressRafRef.current = null;
      }
    };
  }, [selectedStoryIndex, stories]);

  useEffect(() => {
    if (selectedStoryIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedStoryIndex(null);
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedStoryIndex((i) => {
          if (i === null) return 0;
          if (stories.length <= 1) return i;
          return (i - 1 + stories.length) % stories.length;
        });
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedStoryIndex((i) => {
          if (i === null) return 0;
          if (stories.length <= 1) return i;
          return (i + 1) % stories.length;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedStoryIndex, stories.length]);

  const loadCategories = async () => {
    if (!event?.id) return;
    
    try {
      // Only load visible categories for public view
      const { data } = await api.get(`/events/${event.id}/categories`, {
        params: { public: 'true' },
      });
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadChallenges = async () => {
    if (!event?.id) return;
    
    try {
      const { data } = await api.get(`/events/${event.id}/challenges`, {
        params: { public: 'true' },
      });
      setChallenges(data.challenges || []);
    } catch (err) {
      console.error('Error loading challenges:', err);
    }
  };

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
      
      // Check if password is required
      if (data.event.hasPassword) {
        setPasswordRequired(true);
      }
    } catch (err: any) {
      setError('Event nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!event) return;

    try {
      const { data } = await api.post(`/events/${event.id}/verify-password`, { password });
      if (data.valid) {
        setPasswordRequired(false);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || 'Ungültiges Passwort');
    }
  };
  
  const loadPhotos = async (reset: boolean = false) => {
    if (!event?.id) return;
    
    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      // Silently skip if already loading (prevents duplicate API calls)
      return;
    }
    
    loadingRef.current = true;
    
    // Reset pagination if this is a fresh load
    if (reset) {
      setCurrentPage(0);
      setHasMore(true);
      setPhotos([]);
    }
    
    const page = reset ? 0 : currentPage;
    const skip = page * photosPerPage;
    
    try {
      // Check if moderation is required
      const featuresConfig = event.featuresConfig as any;
      const moderationRequired = featuresConfig?.moderationRequired === true;
      
      // Load approved photos, or all photos if moderation is not required
      const params: any = {
        limit: photosPerPage,
        skip: skip,
      };
      if (moderationRequired) {
        params.status = 'APPROVED';
      } else {
        // If moderation not required, show all non-deleted photos
        params.status = 'all';
      }
      
      const { data } = await api.get(`/events/${event.id}/photos`, { params });
      let filteredPhotos = data.photos || [];
      
      // Update pagination state
      if (data.pagination) {
        setHasMore(data.pagination.hasMore);
        if (!reset) {
          setCurrentPage(page + 1);
        } else {
          setCurrentPage(1);
        }
      } else {
        // Fallback: if no pagination metadata, check if we got fewer photos than requested
        const hasMorePhotos = filteredPhotos.length >= photosPerPage;
        setHasMore(hasMorePhotos);
        if (!reset) {
          setCurrentPage(page + 1);
        } else {
          setCurrentPage(1);
        }
      }
      
      // Load feed entries (guestbook entries with photos) and convert them to photo-like objects
      try {
        const feedResponse = await api.get(`/events/${event.id}/feed`);
        const feedEntries = feedResponse.data.entries || [];
        
        // Convert feed entries to photo-like objects for display in grid
        const feedPhotos = feedEntries.map((entry: any) => ({
          id: `guestbook-${entry.id}`,
          eventId: event.id,
          storagePath: entry.photoStoragePath,
          url: entry.photoUrl,
          status: 'APPROVED',
          createdAt: entry.createdAt,
          guestbookEntry: {
            id: entry.id,
            authorName: entry.authorName,
            message: entry.message,
            photoUrl: entry.photoUrl,
            createdAt: entry.createdAt,
          },
          isGuestbookEntry: true, // Flag to identify guestbook entries
        }));

        // Load challenge completions and convert to photo-like objects
        try {
          const challengesResponse = await api.get(`/events/${event.id}/challenges`, {
            params: { public: 'true' },
          });
          const activeChallenges = challengesResponse.data.challenges || [];
          
          const challengePhotos = activeChallenges
            .filter((challenge: any) => challenge.isVisible && challenge.completions?.length > 0)
            .flatMap((challenge: any) =>
              challenge.completions.map((completion: any) => {
                // Generate photo URL from photoId (same as normal photos)
                let photoUrl = completion.photo.url;
                if (completion.photo.id && completion.photo.storagePath) {
                  // Use same URL format as normal photos: /api/photos/{photoId}/file
                  photoUrl = `/api/photos/${completion.photo.id}/file`;
                } else if (completion.photo.storagePath && !photoUrl?.startsWith('http') && !photoUrl?.startsWith('/api/')) {
                  // Fallback: use guestbook proxy route if no photoId
                  photoUrl = `/api/events/${event.id}/guestbook/photo/${encodeURIComponent(completion.photo.storagePath)}`;
                }
                
                return {
                  id: `challenge-${completion.id}`,
                  eventId: event.id,
                  photoId: completion.photo.id, // Store photoId for reference
                  storagePath: completion.photo.storagePath,
                  url: photoUrl,
                  status: 'APPROVED',
                  createdAt: completion.completedAt,
                  uploadedBy: completion.uploaderName || null, // Also store as uploadedBy for consistency
                  challenge: {
                    id: challenge.id,
                    title: challenge.title,
                    description: challenge.description,
                  },
                  completion: {
                    id: completion.id,
                    guest: completion.guest,
                    uploaderName: completion.uploaderName || null,
                    averageRating: completion.averageRating,
                    ratingCount: completion.ratingCount,
                  },
                  isChallengePhoto: true, // Flag to identify challenge photos
                };
              })
            );
          
          // Filter out challenge photos that are already in regular photos (prevent duplicates)
          const regularPhotoIds = new Set(filteredPhotos.map((p: any) => p.id));
          const challengePhotoIds = new Set(challengePhotos.map((p: any) => p.photoId).filter(Boolean));
          
          // Remove regular photos that are also challenge photos
          filteredPhotos = filteredPhotos.filter((p: any) => !challengePhotoIds.has(p.id));
          
          // Add challenge photos
          filteredPhotos = [...filteredPhotos, ...challengePhotos];
        } catch (challengeErr) {
          console.error('Error loading challenge photos:', challengeErr);
        }
        
        // Combine regular photos and guestbook photos, sort by date (newest first)
        filteredPhotos = [...filteredPhotos, ...feedPhotos].sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
      } catch (feedErr) {
        console.error('Error loading feed entries:', feedErr);
        // Continue without feed entries if there's an error
      }
      
      // Filter by selected album/category
      if (selectedAlbum) {
        filteredPhotos = filteredPhotos.filter((photo: any) => {
          // Guestbook entries don't have categories, so skip them when filtering
          if (photo.isGuestbookEntry) {
            return false;
          }
          // Check both categoryId and category.id
          return (photo.categoryId === selectedAlbum) || 
                 (photo.category?.id === selectedAlbum);
        });
      }
      
      if (reset) {
        setPhotos(filteredPhotos);
      } else {
        // Append new photos to existing ones, but filter out duplicates
        setPhotos(prev => {
          const existingIds = new Set(prev.map((p: any) => p.id));
          const newPhotos = filteredPhotos.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newPhotos];
        });
      }
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  };
  
  // Load more photos when scrolling to bottom
  const loadMorePhotos = async () => {
    if (loadingMore || !hasMore || loadingRef.current) return;
    
    setLoadingMore(true);
    await loadPhotos(false);
  };
  
  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePhotos();
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, loadingMore, event?.id]);

  useEffect(() => {
    if (event?.id) {
      loadPhotos(true); // Reset when album changes
    }
  }, [selectedAlbum, event?.id]);

  // Realtime updates
  const realtimePhotos = useEventRealtime(event?.id || '', photos);

  useEffect(() => {
    setPhotos(realtimePhotos);
  }, [realtimePhotos]);

  const handleUploadSuccess = () => {
    loadPhotos(true); // Reset and reload from beginning
    // Also reload feed if it's being displayed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('photoUploaded'));
    }
  };

  // Listen for photo upload events (from ChallengeCompletion, etc.)
  useEffect(() => {
    if (!event?.id) return;
    
    let debounceTimer: NodeJS.Timeout;
    
    const handlePhotoUploaded = () => {
      console.log('Photo uploaded event received, reloading photos...');
      // Debounce: Warte 500ms bevor reload, um mehrere Events zu bündeln
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadPhotos(true); // Reset and reload from beginning
      }, 500);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('photoUploaded', handlePhotoUploaded);
      return () => {
        clearTimeout(debounceTimer);
        window.removeEventListener('photoUploaded', handlePhotoUploaded);
      };
    }
  }, [event?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600">{error || 'Event nicht gefunden'}</div>
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black text-gray-900 bg-white text-sm"
                placeholder="Passwort eingeben"
                required
              />
              {passwordError && (
                <p className="mt-2 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 font-medium text-sm"
            >
              Zugriff erhalten
            </button>
          </form>
        </div>
      </div>
    );
  }

  const featuresConfig = event.featuresConfig as any;
  const hostName = (event as any).host?.name || 'Gastgeber';

  const isStorageLocked = (() => {
    const e: any = event as any;
    if (!e) return false;
    if (typeof e.isStorageLocked === 'boolean') return e.isStorageLocked;
    const endsAt = e.storageEndsAt ? new Date(e.storageEndsAt).getTime() : null;
    if (!endsAt || Number.isNaN(endsAt)) return false;
    return Date.now() > endsAt;
  })();

  const withinUploadWindow = (() => {
    const e: any = event as any;
    if (!e?.dateTime) return true;
    const eventTime = new Date(e.dateTime).getTime();
    if (!Number.isFinite(eventTime)) return true;
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return now >= eventTime - windowMs && now <= eventTime + windowMs;
  })();

  const uploadDisabled = !featuresConfig?.allowUploads || isStorageLocked || !withinUploadWindow;
  const uploadDisabledReason = !featuresConfig?.allowUploads
    ? 'Uploads sind deaktiviert.'
    : isStorageLocked
      ? 'Die Speicherzeit ist abgelaufen.'
      : !withinUploadWindow
        ? 'Uploads sind nur 1 Tag vor/nach dem Event möglich.'
        : undefined;

  const onStoryPrev = () => {
    setSelectedStoryIndex((i) => {
      if (i === null) return 0;
      if (stories.length <= 1) return i;
      return (i - 1 + stories.length) % stories.length;
    });
  };

  const onStoryNext = () => {
    setSelectedStoryIndex((i) => {
      if (i === null) return 0;
      if (stories.length <= 1) return i;
      return (i + 1) % stories.length;
    });
  };

  const onStoryPause = () => {
    storyPausedRef.current = true;
  };

  const onStoryResume = () => {
    storyPausedRef.current = false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    storyProgressStartedAtRef.current = now - storyProgressRef.current * STORY_DURATION_MS;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Event Header with Profile */}
      <EventHeader event={event} hostName={hostName} />

      <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

      {/* Album Navigation - Instagram Stories Style */}
      <AlbumNavigation
        categories={categories}
        selectedAlbum={selectedAlbum}
        onAlbumSelect={setSelectedAlbum}
        totalPhotos={photos.length}
      />

      {/* Challenge Hinweis - nur wenn Challenges aktiviert und vorhanden */}
      {featuresConfig?.challengesEnabled === true && challenges.filter((c: any) => c.isActive).length > 0 && (
        <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-200">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <p className="text-sm text-gray-700">
              <strong>Tolle Challenges verfügbar!</strong> Klicke auf "Challenges" im Menü unten, um teilzunehmen.
            </p>
          </div>
        </div>
      )}

      {/* Face Search - Finde Bilder von mir */}
      {featuresConfig?.faceSearch !== false && (
        <div className="px-4 py-3 border-b border-gray-100">
          <FaceSearch eventId={event.id} />
            </div>
          )}

      {/* Modern Photo Grid */}
      <div className="pb-24">
                  {featuresConfig?.mysteryMode ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 px-4"
                    >
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="text-6xl mb-4"
                      >
                        🎭
                      </motion.div>
            <p className="text-xl text-gray-900 mb-2 font-semibold">
                        Mystery Mode aktiviert
                      </p>
            <p className="text-gray-500 text-sm text-center max-w-sm">
                        Die Fotos werden später veröffentlicht...
                      </p>
                    </motion.div>
                  ) : (
          <ModernPhotoGrid
                      photos={photos} 
                      allowDownloads={featuresConfig?.allowDownloads}
                      eventSlug={slug}
            eventTitle={event.title}
            eventId={event.id}
            onUploadSuccess={handleUploadSuccess}
            allowUploads={featuresConfig?.allowUploads}
            isStorageLocked={isStorageLocked}
            uploadDisabled={uploadDisabled}
            uploadDisabledReason={uploadDisabledReason}
          />
        )}
        
        {/* Infinite Scroll Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="text-gray-500 text-sm">Lade weitere Fotos...</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        eventId={event.id}
        eventSlug={slug}
        categories={categories}
        onAlbumSelect={setSelectedAlbum}
        selectedAlbum={selectedAlbum}
        event={event}
        guestId={guestId}
        uploaderName={uploaderName}
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

