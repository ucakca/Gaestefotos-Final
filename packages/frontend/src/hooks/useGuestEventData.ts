import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import { Category } from '@gaestefotos/shared';

export function useGuestEventData(slug: string, selectedAlbum: string | null) {
  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [passwordRequired, setPasswordRequired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const featuresConfig = useMemo(() => (event ? ((event as any).featuresConfig as any) : null), [event]);
  const hostName = useMemo(() => ((event as any)?.host?.name as string) || 'Gastgeber', [event]);

  const inviteTokenRef = useRef<string | null>(null);
  const [inviteExchangeBump, setInviteExchangeBump] = useState(0);

  const loadingRef = useRef(false);
  const feedPhotosRef = useRef<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const photosPerPage = 30;

  const extractInviteTokenFromUrl = (): string | null => {
    if (typeof window === 'undefined') return null;
    const queryParams = new URLSearchParams(window.location.search);
    const fromQuery = queryParams.get('invite');
    if (fromQuery) return fromQuery;

    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    if (!hash) return null;
    const hashParams = new URLSearchParams(hash);
    return hashParams.get('invite');
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

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
      if (data.event.hasPassword) {
        setPasswordRequired(true);
      }
    } catch {
      setError('Event nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (eventId: string) => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`, {
        params: { public: 'true' },
      });
      setCategories(data.categories || []);
    } catch {
      // ignore
    }
  };

  const loadChallenges = async (eventId: string) => {
    try {
      const { data } = await api.get(`/events/${eventId}/challenges`, {
        params: { public: 'true' },
      });
      setChallenges(Array.isArray(data?.challenges) ? data.challenges : []);
    } catch {
      setChallenges([]);
    }
  };

  const loadPhotos = async (eventId: string, reset: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (reset) {
      setCurrentPage(0);
      setHasMore(true);
      setPhotos([]);
    }

    const page = reset ? 0 : currentPage;
    const skip = page * photosPerPage;

    setLoadingMore(true);
    try {
      const moderationRequired = featuresConfig?.moderationRequired === true;
      const params: any = { limit: photosPerPage, skip };
      params.status = moderationRequired ? 'APPROVED' : 'all';

      const { data } = await api.get(`/events/${eventId}/photos`, { params });
      const nextPhotos = (data.photos || []) as Photo[];

      if (reset) {
        try {
          const feedResponse = await api.get(`/events/${eventId}/feed`);
          const feedEntries = feedResponse.data?.entries || [];
          const feedPhotos = (Array.isArray(feedEntries) ? feedEntries : []).map((entry: any) => ({
            id: `guestbook-${entry.id}`,
            eventId,
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
            isGuestbookEntry: true,
          }));
          feedPhotosRef.current = feedPhotos;
        } catch {
          feedPhotosRef.current = [];
        }
      }

      const hasMorePhotos =
        typeof data?.pagination?.hasMore === 'boolean' ? data.pagination.hasMore : nextPhotos.length >= photosPerPage;
      setHasMore(hasMorePhotos);
      setCurrentPage(page + 1);

      setPhotos((prev) => {
        const base = reset ? [] : (prev as any[]);
        const existingIds = new Set(base.map((p: any) => p.id));
        const deduped = (nextPhotos as any[]).filter((p: any) => !existingIds.has(p.id));
        const merged = [...base, ...deduped, ...(reset ? feedPhotosRef.current : [])];

        // Ensure guestbook + photos are shown newest-first
        merged.sort((a: any, b: any) => {
          const dateA = new Date(a?.createdAt).getTime();
          const dateB = new Date(b?.createdAt).getTime();
          return dateB - dateA;
        });

        // Final dedupe after merge (safety)
        const seen = new Set<string>();
        return merged.filter((p: any) => {
          const id = String(p?.id ?? '');
          if (!id) return false;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
    } catch {
      // ignore
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
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

  useEffect(() => {
    const init = async () => {
      try {
        const inviteToken = extractInviteTokenFromUrl();
        if (inviteToken) {
          inviteTokenRef.current = inviteToken;
          removeInviteFromUrl();
        }
      } catch {
        // ignore
      }

      loadEvent();
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const exchange = async () => {
      if (!event?.id) return;
      const inviteToken = inviteTokenRef.current;
      if (!inviteToken) return;

      inviteTokenRef.current = null;
      try {
        await api.post(`/events/${event.id}/access`, null, { params: { invite: inviteToken } });
      } catch {
        // ignore
      } finally {
        setInviteExchangeBump((v) => v + 1);
      }
    };

    exchange();
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    loadCategories(event.id);
    loadChallenges(event.id);
    loadPhotos(event.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    loadPhotos(event.id, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlbum, event?.id]);

  const filteredPhotos = useMemo(() => {
    if (!selectedAlbum) return photos;
    return (photos as any[]).filter((p: any) => {
      if (p?.isGuestbookEntry) return false;
      return p?.categoryId === selectedAlbum || p?.category?.id === selectedAlbum;
    }) as any;
  }, [photos, selectedAlbum]);

  return {
    event,
    categories,
    photos,
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
    loadMore: async () => {
      if (!event?.id) return;
      await loadPhotos(event.id, false);
    },
    reloadPhotos: async () => {
      if (!event?.id) return;
      await loadPhotos(event.id, true);
    },
    inviteExchangeBump,
  };
}
