'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import {
  Camera, Video, Star, Trophy, Clock, Trash2, Filter, Users,
  Image as ImageIcon, Check, X, Download, ChevronDown, ChevronLeft,
  ChevronRight, Play, CheckCheck, RotateCw, Loader2,
  ArrowUpDown, Heart, Search, DownloadCloud, Info, Eye, HardDrive,
  MousePointerClick,
} from 'lucide-react';

type GalleryFilter = 'all' | 'photos' | 'videos' | 'albums' | 'guests' | 'challenges' | 'top' | 'pending' | 'trash';
type SortMode = 'newest' | 'oldest' | 'most-liked' | 'favorites-first';

const PAGE_SIZE = 36;

interface GalleryTabV2Props {
  photos: any[];
  filter: GalleryFilter;
  onFilterChange: (f: GalleryFilter) => void;
  pendingCount: number;
  eventId: string;
  onPhotosChanged?: () => void;
  categories?: { id: string; name: string }[];
}

export default function GalleryTabV2({
  photos,
  filter,
  onFilterChange,
  pendingCount,
  eventId,
  onPhotosChanged,
  categories = [],
}: GalleryTabV2Props) {
  const { showToast } = useToastStore();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [exportingUsb, setExportingUsb] = useState(false);
  const [favLoading, setFavLoading] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);

  // Derived data
  const challengePhotos = useMemo(() => photos.filter(p => p.challengeId && p.status === 'APPROVED'), [photos]);
  const topPhotos = useMemo(() => photos.filter(p => p.isFavorite || p.likes > 0), [photos]);
  const trashedPhotos = useMemo(() => photos.filter(p => p.status === 'REJECTED' || p.status === 'DELETED'), [photos]);
  const favoriteCount = useMemo(() => photos.filter(p => p.isFavorite).length, [photos]);

  // Albums
  const albums = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    photos.filter(p => p.categoryId && p.status === 'APPROVED').forEach(p => {
      const existing = map.get(p.categoryId);
      if (existing) existing.count++;
      else map.set(p.categoryId, { id: p.categoryId, name: p.category?.name || `Album ${p.categoryId.slice(0, 6)}`, count: 1 });
    });
    return Array.from(map.values());
  }, [photos]);

  // Guests
  const guests = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    photos.filter(p => p.status === 'APPROVED').forEach(p => {
      const guestKey = p.uploadedBy || p.visitorId || p.guestId || p.deviceFingerprint || '__anonymous__';
      const existing = map.get(guestKey);
      if (existing) existing.count++;
      else {
        let guestName = 'Anonymer Teilnehmer';
        if (p.uploadedBy) guestName = p.uploadedBy;
        else if (p.guest?.firstName) guestName = `${p.guest.firstName} ${p.guest.lastName || ''}`.trim();
        else if (p.visitor?.name) guestName = p.visitor.name;
        else if (guestKey !== '__anonymous__') guestName = `Gast ${guestKey.slice(0, 6)}`;
        map.set(guestKey, { id: guestKey, name: guestName, count: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [photos]);

  const filters: { id: GalleryFilter; label: string; icon: any; count?: number }[] = [
    { id: 'all', label: 'Alle', icon: Filter },
    { id: 'photos', label: 'Fotos', icon: Camera },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'albums', label: 'Alben', icon: ImageIcon, count: albums.length },
    { id: 'guests', label: 'Gäste', icon: Users, count: guests.length },
    { id: 'challenges', label: 'Challenges', icon: Trophy, count: challengePhotos.length },
    { id: 'top', label: 'Favoriten', icon: Heart, count: topPhotos.length },
    { id: 'pending', label: 'Freigabe', icon: Clock, count: pendingCount },
    { id: 'trash', label: 'Papierkorb', icon: Trash2, count: trashedPhotos.length },
  ];

  // Reset on filter change
  useEffect(() => {
    if (filter !== 'albums') setSelectedAlbum(null);
    if (filter !== 'guests') setSelectedGuest(null);
    setSelectedIds(new Set());
    setSelectMode(false);
    setVisibleCount(PAGE_SIZE);
    setSearchQuery('');
  }, [filter]);

  // Exit select mode when no items selected
  useEffect(() => {
    if (selectedIds.size === 0 && selectMode && filter !== 'pending') {
      // Keep select mode active so user can keep selecting
    }
  }, [selectedIds.size, selectMode, filter]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectMode = () => {
    setSelectMode(true);
  };

  // Filter + sort
  const filteredPhotos = useMemo(() => {
    let result = photos.filter(p => {
      if (filter === 'all') return p.status === 'APPROVED';
      if (filter === 'photos') return p.status === 'APPROVED' && p.type !== 'VIDEO';
      if (filter === 'videos') return p.status === 'APPROVED' && p.type === 'VIDEO';
      if (filter === 'albums') {
        if (!p.categoryId || p.status !== 'APPROVED') return false;
        return selectedAlbum ? p.categoryId === selectedAlbum : true;
      }
      if (filter === 'guests') {
        if (p.status !== 'APPROVED') return false;
        const guestKey = p.uploadedBy || p.visitorId || p.guestId || p.deviceFingerprint || '__anonymous__';
        return selectedGuest ? guestKey === selectedGuest : true;
      }
      if (filter === 'challenges') return p.challengeId && p.status === 'APPROVED';
      if (filter === 'top') return (p.isFavorite || p.likes > 0) && p.status === 'APPROVED';
      if (filter === 'pending') return p.status === 'PENDING';
      if (filter === 'trash') return p.status === 'REJECTED' || p.status === 'DELETED';
      return true;
    });

    // Tag filter
    if (selectedTag) {
      result = result.filter(p => (p.tags || []).includes(selectedTag));
    }

    // Quality filter
    if (qualityFilter === 'high') result = result.filter(p => (p as any).qualityScore >= 0.7);
    else if (qualityFilter === 'medium') result = result.filter(p => (p as any).qualityScore >= 0.4 && (p as any).qualityScore < 0.7);
    else if (qualityFilter === 'low') result = result.filter(p => (p as any).qualityScore < 0.4 && (p as any).qualityScore > 0);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => {
        const guestName = p.uploadedBy || p.guest?.firstName || '';
        return guestName.toLowerCase().includes(q) ||
          (p.category?.name || '').toLowerCase().includes(q) ||
          (p.tags || []).some((t: string) => t.toLowerCase().includes(q));
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortMode === 'most-liked') return (b.likes || 0) - (a.likes || 0);
      if (sortMode === 'favorites-first') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [photos, filter, selectedAlbum, selectedGuest, sortMode, searchQuery, selectedTag, qualityFilter]);

  const displayedPhotos = filteredPhotos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPhotos.length;

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(prev => prev + PAGE_SIZE); },
      { rootMargin: '400px' }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, filteredPhotos.length]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); lightboxNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); lightboxPrev(); }
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'f' || e.key === 'F') toggleFavorite(filteredPhotos[lightboxIndex!]?.id);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, filteredPhotos]);

  // Selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPhotos.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
  };

  // Toggle favorite
  const toggleFavorite = useCallback(async (photoId: string) => {
    if (!photoId || favLoading.has(photoId)) return;
    setFavLoading(prev => new Set(prev).add(photoId));
    try {
      await api.post(`/photos/${photoId}/favorite`);
      onPhotosChanged?.();
    } catch {
      showToast('Favorit-Aktion fehlgeschlagen', 'error');
    } finally {
      setFavLoading(prev => { const n = new Set(prev); n.delete(photoId); return n; });
    }
  }, [favLoading, showToast, onPhotosChanged]);

  // Moderation actions
  const moderatePhoto = useCallback(async (photoId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/photos/${photoId}/${action}`);
      showToast(action === 'approve' ? 'Foto freigegeben' : 'Foto abgelehnt', 'success');
      onPhotosChanged?.();
    } catch {
      showToast('Aktion fehlgeschlagen', 'error');
    }
  }, [showToast, onPhotosChanged]);

  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      await api.delete(`/photos/${photoId}`);
      showToast('Foto gelöscht', 'success');
      onPhotosChanged?.();
    } catch {
      showToast('Löschen fehlgeschlagen', 'error');
    }
  }, [showToast, onPhotosChanged]);

  const restorePhoto = useCallback(async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/restore`);
      showToast('Foto wiederhergestellt', 'success');
      onPhotosChanged?.();
    } catch {
      showToast('Wiederherstellen fehlgeschlagen', 'error');
    }
  }, [showToast, onPhotosChanged]);

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`${selectedIds.size} Fotos wirklich löschen?`)) return;
    setBulkLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id => api.delete(`/photos/${id}`).catch(() => null));
      await Promise.all(promises);
      showToast(`${selectedIds.size} Fotos gelöscht`, 'success');
      setSelectedIds(new Set());
      setSelectMode(false);
      onPhotosChanged?.();
    } catch {
      showToast('Löschen fehlgeschlagen', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk actions
  const bulkModerate = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      await api.post('/photos/bulk/moderate', { photoIds: Array.from(selectedIds), action, eventId });
      showToast(`${selectedIds.size} Fotos ${action === 'approve' ? 'freigegeben' : 'abgelehnt'}`, 'success');
      setSelectedIds(new Set());
      onPhotosChanged?.();
    } catch {
      showToast('Bulk-Aktion fehlgeschlagen', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkApproveAll = async () => {
    setBulkLoading(true);
    try {
      await api.post('/photos/bulk/approve-all', { eventId });
      showToast('Alle ausstehenden Fotos freigegeben', 'success');
      setSelectedIds(new Set());
      onPhotosChanged?.();
    } catch {
      showToast('Aktion fehlgeschlagen', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkDownload = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await api.post('/photos/bulk/download', {
        photoIds: Array.from(selectedIds),
      }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fotos-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Download gestartet', 'success');
    } catch {
      showToast('Download fehlgeschlagen', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Download All
  const downloadAll = async (dlFilter?: string) => {
    setDownloadingAll(true);
    try {
      const res = await api.post('/photos/bulk/download-all', {
        eventId,
        filter: dlFilter || 'approved',
      }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `galerie-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Gallery-Download gestartet', 'success');
    } catch {
      showToast('Download fehlgeschlagen', 'error');
    } finally {
      setDownloadingAll(false);
    }
  };

  // USB-Export
  const usbExport = async () => {
    setExportingUsb(true);
    try {
      const res = await api.post(`/events/${eventId}/download/usb-export`, {
        includeOriginals: true,
      }, { responseType: 'blob', timeout: 300000 });
      const blob = new Blob([res.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `USB-Export-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('USB-Export heruntergeladen', 'success');
    } catch {
      showToast('USB-Export fehlgeschlagen', 'error');
    } finally {
      setExportingUsb(false);
    }
  };

  // Lightbox
  const lightboxPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  const lightboxPrev = useCallback(() => {
    setLightboxIndex(prev => prev === null ? null : prev > 0 ? prev - 1 : filteredPhotos.length - 1);
  }, [filteredPhotos.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex(prev => prev === null ? null : prev < filteredPhotos.length - 1 ? prev + 1 : 0);
  }, [filteredPhotos.length]);

  const openLightbox = (photo: any) => {
    const idx = filteredPhotos.findIndex(p => p.id === photo.id);
    setLightboxIndex(idx >= 0 ? idx : null);
  };

  // Touch swipe in lightbox
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) lightboxNext();
      else lightboxPrev();
    }
  };

  // Stats summary
  const approvedCount = photos.filter(p => p.status === 'APPROVED').length;
  const photoCount = photos.filter(p => p.type !== 'VIDEO' && p.status === 'APPROVED').length;
  const videoCount = photos.filter(p => p.type === 'VIDEO' && p.status === 'APPROVED').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-4"
    >
      {/* Stats Summary */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
          <Camera className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-foreground">{photoCount}</span> Fotos
        </div>
        {videoCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
            <Video className="w-4 h-4 text-purple-500" />
            <span className="font-semibold text-foreground">{videoCount}</span> Videos
          </div>
        )}
        {favoriteCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground whitespace-nowrap">
            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            <span className="font-semibold text-foreground">{favoriteCount}</span>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-orange-600">{pendingCount}</span>
          </div>
        )}
        <div className="flex-1" />
        {/* Download All */}
        <button
          onClick={() => downloadAll('approved')}
          disabled={downloadingAll || approvedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 disabled:opacity-50 whitespace-nowrap"
        >
          {downloadingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DownloadCloud className="w-3.5 h-3.5" />}
          Alle laden
        </button>
        <button
          onClick={usbExport}
          disabled={exportingUsb || approvedCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50 whitespace-nowrap"
          title="USB-Export mit Ordnerstruktur (Alben, Gäste, Originale)"
        >
          {exportingUsb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
          USB-Export
        </button>
      </div>

      {/* Search + Sort row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Gast, Album oder Tag suchen..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-border rounded">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:border-blue-300"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">
              {sortMode === 'newest' ? 'Neueste' : sortMode === 'oldest' ? 'Älteste' : sortMode === 'most-liked' ? 'Beliebt' : 'Favoriten'}
            </span>
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
                {([['newest', 'Neueste zuerst'], ['oldest', 'Älteste zuerst'], ['most-liked', 'Meiste Likes'], ['favorites-first', 'Favoriten zuerst']] as const).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => { setSortMode(mode); setShowSortMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 ${sortMode === mode ? 'text-blue-600 font-medium bg-blue-50/50' : 'text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f.id
                ? 'bg-blue-500 text-white'
                : 'bg-card border border-border text-muted-foreground hover:border-blue-300'
            }`}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                filter === f.id ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Album sub-filter */}
      {filter === 'albums' && albums.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedAlbum(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedAlbum ? 'bg-purple-500 text-white' : 'bg-purple-50 border border-purple-200 text-purple-600'
            }`}
          >Alle Alben</button>
          {albums.map(a => (
            <button key={a.id} onClick={() => setSelectedAlbum(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedAlbum === a.id ? 'bg-purple-500 text-white' : 'bg-purple-50 border border-purple-200 text-purple-600'
              }`}
            >{a.name} <span className="opacity-70">({a.count})</span></button>
          ))}
        </div>
      )}

      {/* Guest sub-filter */}
      {filter === 'guests' && guests.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setSelectedGuest(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              !selectedGuest ? 'bg-emerald-500 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
            }`}
          >Alle Gäste</button>
          {guests.map(g => (
            <button key={g.id} onClick={() => setSelectedGuest(g.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGuest === g.id ? 'bg-emerald-500 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
              }`}
            >{g.name} <span className="opacity-70">({g.count})</span></button>
          ))}
        </div>
      )}

      {/* Select Mode Toggle + Bulk Action Bar */}
      <div className="flex items-center gap-2 mb-3">
        {!selectMode && !selectedIds.size && filter !== 'pending' ? (
          <button
            onClick={enterSelectMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <MousePointerClick className="w-3.5 h-3.5" /> Auswählen
          </button>
        ) : null}
      </div>

      {(selectMode || selectedIds.size > 0 || filter === 'pending') && (
        <div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex-wrap">
          {selectedIds.size > 0 ? (
            <>
              <CheckCheck className="w-4 h-4 text-blue-600 ml-1 shrink-0" />
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.size} ausgewählt
              </span>
              <button onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 underline">
                {selectedIds.size === filteredPhotos.length ? 'Keine' : 'Alle'}
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 flex-wrap">
                {filteredPhotos.some(p => selectedIds.has(p.id) && p.status === 'PENDING') && (
                  <>
                    <button onClick={() => bulkModerate('approve')} disabled={bulkLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                      {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Freigeben
                    </button>
                    <button onClick={() => bulkModerate('reject')} disabled={bulkLoading}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 disabled:opacity-50">
                      <X className="w-3 h-3" /> Ablehnen
                    </button>
                  </>
                )}
                <button onClick={bulkDownload} disabled={bulkLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50">
                  <Download className="w-3 h-3" /> ZIP
                </button>
                <button onClick={bulkDelete} disabled={bulkLoading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 border border-red-200 disabled:opacity-50">
                  <Trash2 className="w-3 h-3" /> Löschen
                </button>
                <button onClick={exitSelectMode}
                  className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : selectMode && selectedIds.size === 0 ? (
            <>
              <MousePointerClick className="w-4 h-4 text-blue-500 ml-1" />
              <span className="text-sm text-blue-700">Tippe auf Fotos um sie auszuwählen</span>
              <button onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 underline ml-1">
                Alle auswählen
              </button>
              <div className="flex-1" />
              <button onClick={exitSelectMode}
                className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </>
          ) : filter === 'pending' && pendingCount > 0 ? (
            <>
              <Clock className="w-4 h-4 text-orange-500 ml-1" />
              <span className="text-sm text-blue-800">{pendingCount} Fotos warten auf Freigabe</span>
              <div className="flex-1" />
              <button onClick={() => { enterSelectMode(); selectAll(); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50">
                <CheckCheck className="w-3 h-3" /> Alle auswählen
              </button>
              <button onClick={bulkApproveAll} disabled={bulkLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 disabled:opacity-50">
                {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />} Alle freigeben
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16">
          {filter === 'top' ? (
            <>
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Noch keine Favoriten</p>
              <p className="text-sm text-muted-foreground mt-1">Markiere Fotos mit dem Stern als Favorit</p>
            </>
          ) : filter === 'pending' ? (
            <>
              <CheckCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-muted-foreground">Alles freigegeben</p>
              <p className="text-sm text-muted-foreground mt-1">Keine ausstehenden Fotos</p>
            </>
          ) : filter === 'trash' ? (
            <>
              <Trash2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Papierkorb ist leer</p>
            </>
          ) : searchQuery ? (
            <>
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Keine Treffer für &ldquo;{searchQuery}&rdquo;</p>
            </>
          ) : (
            <>
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Keine Medien gefunden</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 rounded-2xl overflow-hidden">
            {displayedPhotos.map((photo, i) => (
              <button
                key={photo.id || i}
                onClick={() => (selectMode || selectedIds.size > 0) ? toggleSelect(photo.id) : openLightbox(photo)}
                onContextMenu={(e) => { e.preventDefault(); if (!selectMode) enterSelectMode(); toggleSelect(photo.id); }}
                onTouchStart={(e) => {
                  longPressTimer.current = setTimeout(() => {
                    longPressTimer.current = null;
                    if (!selectMode) enterSelectMode();
                    toggleSelect(photo.id);
                    // Haptic feedback if available
                    if (navigator.vibrate) navigator.vibrate(30);
                  }, 400);
                }}
                onTouchEnd={(e) => {
                  if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                }}
                onTouchMove={() => {
                  if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                }}
                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation' } as React.CSSProperties}
                className={`aspect-square relative bg-border group cursor-pointer overflow-hidden select-none ${
                  selectedIds.has(photo.id) ? 'ring-3 ring-blue-500 ring-inset' : ''
                }`}
              >
                <img
                  src={photo.thumbnailUrl || photo.url || '/placeholder.jpg'}
                  alt=""
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Selection checkbox */}
                {(selectMode || selectedIds.size > 0 || filter === 'pending') && (
                  <div className="absolute top-1 left-1 z-10" onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(photo.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-black/30 border-white/70'
                    }`}>
                      {selectedIds.has(photo.id) && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                )}
                {/* Pending Overlay */}
                {photo.status === 'PENDING' && (
                  <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600 drop-shadow" />
                  </div>
                )}
                {/* Rejected Overlay */}
                {(photo.status === 'REJECTED' || photo.status === 'DELETED') && (
                  <div className="absolute inset-0 bg-red-500/20" />
                )}
                {/* Tags + Uploader name badge on hover */}
                {(photo.uploadedBy || (photo.tags && photo.tags.length > 0)) && (
                  <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    {photo.tags && photo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mb-0.5">
                        {photo.tags.slice(0, 2).map((tag: string) => (
                          <span key={tag} className="text-[8px] bg-white/20 text-white px-1 rounded-sm cursor-pointer" onClick={e => { e.stopPropagation(); setSelectedTag(tag); }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {photo.uploadedBy && <p className="text-white/80 text-[9px] truncate">{photo.uploadedBy}</p>}
                  </div>
                )}
                {/* Video Overlay */}
                {photo.type === 'VIDEO' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>
                )}
                {/* Challenge badge */}
                {photo.challengeId && photo.status === 'APPROVED' && !(selectedIds.size > 0 || filter === 'pending') && (
                  <div className="absolute top-1 left-1">
                    <div className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                    </div>
                  </div>
                )}
                {/* Favorite star — click to toggle */}
                {photo.status === 'APPROVED' && (
                  <div
                    className={`absolute top-1 right-1 transition-opacity ${
                      photo.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                  >
                    <Star className={`w-5 h-5 drop-shadow cursor-pointer transition-colors ${
                      photo.isFavorite
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-white/80 hover:text-yellow-300'
                    }`} />
                  </div>
                )}
              </button>
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="ml-2 text-sm text-muted-foreground">
                {displayedPhotos.length} von {filteredPhotos.length} geladen
              </span>
            </div>
          )}
          {!hasMore && filteredPhotos.length > PAGE_SIZE && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Alle {filteredPhotos.length} Medien geladen
            </p>
          )}
        </>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && lightboxIndex !== null && (
          <motion.div
            ref={lightboxRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={() => setLightboxIndex(null)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-3 z-10" onClick={e => e.stopPropagation()}>
              <span className="text-white/70 text-sm">{lightboxIndex + 1} / {filteredPhotos.length}</span>
              <div className="flex items-center gap-2">
                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(lightboxPhoto.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    lightboxPhoto.isFavorite
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-yellow-300'
                  }`}
                  title="Favorit (F)"
                >
                  <Star className={`w-4 h-4 ${lightboxPhoto.isFavorite ? 'fill-yellow-400' : ''}`} />
                </button>
                {lightboxPhoto.status === 'PENDING' && (
                  <>
                    <button onClick={() => { moderatePhoto(lightboxPhoto.id, 'approve'); lightboxNext(); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600">
                      <Check className="w-3.5 h-3.5" /> Freigeben
                    </button>
                    <button onClick={() => { moderatePhoto(lightboxPhoto.id, 'reject'); lightboxNext(); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600">
                      <X className="w-3.5 h-3.5" /> Ablehnen
                    </button>
                  </>
                )}
                {(lightboxPhoto.status === 'REJECTED' || lightboxPhoto.status === 'DELETED') && (
                  <button onClick={() => restorePhoto(lightboxPhoto.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600">
                    <RotateCw className="w-3.5 h-3.5" /> Wiederherstellen
                  </button>
                )}
                <a href={lightboxPhoto.url} download target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
                  <Download className="w-4 h-4" />
                </a>
                <button onClick={() => { deletePhoto(lightboxPhoto.id); lightboxNext(); }}
                  className="p-2 rounded-lg bg-white/10 text-red-400 hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setLightboxIndex(null)}
                  className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center relative px-12" onClick={e => e.stopPropagation()}>
              <button onClick={lightboxPrev} className="absolute left-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10">
                <ChevronLeft className="w-6 h-6" />
              </button>
              {lightboxPhoto.type === 'VIDEO' ? (
                <motion.video
                  key={lightboxPhoto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={lightboxPhoto.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[75vh] rounded-lg"
                />
              ) : (
                <motion.img
                  key={lightboxPhoto.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={lightboxPhoto.url || lightboxPhoto.thumbnailUrl}
                  alt=""
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              )}
              <button onClick={lightboxNext} className="absolute right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-center gap-4 px-4 py-3 z-10" onClick={e => e.stopPropagation()}>
              <span className="text-white/60 text-sm">
                {lightboxPhoto.uploadedBy || 'Unbekannt'} &bull; {new Date(lightboxPhoto.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                lightboxPhoto.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                (lightboxPhoto.status === 'REJECTED' || lightboxPhoto.status === 'DELETED') ? 'bg-red-500/20 text-red-300' :
                'bg-orange-500/20 text-orange-300'
              }`}>
                {lightboxPhoto.status === 'APPROVED' ? 'Freigegeben' : lightboxPhoto.status === 'REJECTED' ? 'Abgelehnt' : lightboxPhoto.status === 'DELETED' ? 'Gelöscht' : 'Ausstehend'}
              </span>
              {lightboxPhoto.likes > 0 && (
                <span className="text-yellow-400 text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-yellow-400" /> {lightboxPhoto.likes}</span>
              )}
              {(lightboxPhoto as any).views > 0 && (
                <span className="text-white/40 text-xs">👁 {(lightboxPhoto as any).views}</span>
              )}
              {(lightboxPhoto as any).faceCount > 0 && (
                <span className="text-white/40 text-xs">👤 {(lightboxPhoto as any).faceCount}</span>
              )}
              <button
                onClick={async () => {
                  const val = window.prompt('Tags (kommagetrennt):', (lightboxPhoto.tags || []).join(', '));
                  if (val === null) return;
                  const tags = val.split(',').map((t: string) => t.trim()).filter(Boolean);
                  try {
                    await api.patch(`/photos/${lightboxPhoto.id}`, { tags });
                    onPhotosChanged?.();
                  } catch { /* silent */ }
                }}
                className="text-xs text-white/50 hover:text-white/80 transition-colors px-1"
                title="Tags bearbeiten"
              >
                🏷️
              </button>
              {categories.length > 0 && (
                <select
                  value={lightboxPhoto.categoryId || ''}
                  onChange={async (e) => {
                    const catId = e.target.value || null;
                    try {
                      await api.patch(`/photos/${lightboxPhoto.id}`, { categoryId: catId });
                      onPhotosChanged?.();
                    } catch { /* silent */ }
                  }}
                  onClick={e => e.stopPropagation()}
                  className="text-xs bg-white/10 text-white/70 border border-white/20 rounded px-2 py-0.5"
                >
                  <option value="">Kein Album</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
