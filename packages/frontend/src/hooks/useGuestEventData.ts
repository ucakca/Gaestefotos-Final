import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import { Category } from '@gaestefotos/shared';

export function useGuestEventData(slug: string, selectedAlbum: string | null) {
  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

      const hasMorePhotos =
        typeof data?.pagination?.hasMore === 'boolean' ? data.pagination.hasMore : nextPhotos.length >= photosPerPage;
      setHasMore(hasMorePhotos);
      setCurrentPage(page + 1);

      setPhotos((prev) => {
        const existingIds = new Set((prev as any[]).map((p: any) => p.id));
        const deduped = (nextPhotos as any[]).filter((p: any) => !existingIds.has(p.id));
        return [...prev, ...deduped] as any;
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
    return (photos as any[]).filter((p: any) => p?.categoryId === selectedAlbum || p?.category?.id === selectedAlbum) as any;
  }, [photos, selectedAlbum]);

  return {
    event,
    categories,
    photos,
    filteredPhotos,
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
