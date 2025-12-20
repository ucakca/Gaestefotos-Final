 'use client';

 import { useEffect, useMemo, useRef, useState } from 'react';
 import { useParams } from 'next/navigation';
 import api from '@/lib/api';
 import { Event as EventType, Photo } from '@gaestefotos/shared';
 import { Category } from '@gaestefotos/shared';
 import EventHeader from '@/components/EventHeader';
 import AlbumNavigation from '@/components/AlbumNavigation';
 import ModernPhotoGrid from '@/components/ModernPhotoGrid';
 import BottomNavigation from '@/components/BottomNavigation';
 import StoriesBar from '@/components/guest/StoriesBar';
 import StoryViewer from '@/components/guest/StoryViewer';

 export default function PublicEventPageV2() {
   const params = useParams();
   const slug = params.slug as string;

   const [event, setEvent] = useState<EventType | null>(null);
   const [photos, setPhotos] = useState<Photo[]>([]);
   const [categories, setCategories] = useState<Category[]>([]);
   const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [passwordRequired, setPasswordRequired] = useState(false);
   const [password, setPassword] = useState('');
   const [passwordError, setPasswordError] = useState('');

   const [stories, setStories] = useState<any[]>([]);
   const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
   const [storyProgress, setStoryProgress] = useState(0);
   const storyProgressRafRef = useRef<number | null>(null);
   const storyProgressStartedAtRef = useRef<number>(0);
   const storyProgressRef = useRef<number>(0);
   const storyPausedRef = useRef<boolean>(false);
   const viewedStoriesRef = useRef<Set<string>>(new Set());
   const STORY_DURATION_MS = 6000;

   const inviteTokenRef = useRef<string | null>(null);
   const loadingRef = useRef(false);
   const [hasMore, setHasMore] = useState(true);
   const [loadingMore, setLoadingMore] = useState(false);
   const [currentPage, setCurrentPage] = useState(0);
   const photosPerPage = 30;

   const featuresConfig = useMemo(() => (event ? ((event as any).featuresConfig as any) : null), [event]);
   const hostName = useMemo(() => ((event as any)?.host?.name as string) || 'Gastgeber', [event]);

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

   const loadStories = async (eventId: string) => {
     try {
       const { data } = await api.get(`/events/${eventId}/stories`);
       setStories(Array.isArray(data?.stories) ? data.stories : []);
     } catch {
       setStories([]);
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
         loadStories(event.id);
       }
     };

     exchange();
   }, [event?.id]);

   useEffect(() => {
     if (!event?.id) return;
     loadCategories(event.id);
     loadStories(event.id);
     loadPhotos(event.id, true);
   }, [event?.id]);

   useEffect(() => {
     if (!event?.id) return;
     loadPhotos(event.id, true);
   }, [selectedAlbum, event?.id]);

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
               {passwordError && <p className="mt-2 text-sm text-red-600">{passwordError}</p>}
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

   const filteredPhotos = selectedAlbum
     ? (photos as any[]).filter((p: any) => p?.categoryId === selectedAlbum || p?.category?.id === selectedAlbum)
     : photos;

   return (
     <div className="min-h-screen bg-white">
       <EventHeader event={event} hostName={hostName} />
       <StoriesBar stories={stories} onSelect={setSelectedStoryIndex} />

       <AlbumNavigation
         categories={categories}
         selectedAlbum={selectedAlbum}
         onAlbumSelect={setSelectedAlbum}
         totalPhotos={filteredPhotos.length}
       />

       <div className="pb-24">
         <ModernPhotoGrid
           photos={filteredPhotos as any}
           allowDownloads={featuresConfig?.allowDownloads}
           eventSlug={slug}
           eventTitle={event.title}
           eventId={(event as any).id}
           onUploadSuccess={() => loadPhotos(event.id, true)}
           allowUploads={featuresConfig?.allowUploads}
         />

         {hasMore && (
           <div className="py-8 flex justify-center">
             {loadingMore ? (
               <div className="text-gray-500 text-sm">Lade weitere Fotos...</div>
             ) : (
               <button
                 type="button"
                 onClick={() => loadPhotos(event.id, false)}
                 className="text-sm text-gray-700 underline"
               >
                 Mehr laden
               </button>
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
