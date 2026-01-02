'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Photo, Event as EventType } from '@gaestefotos/shared';
import { Check, X, Trash2, Download, Square, CheckSquare, Edit, ScanFace, Image as ImageIcon, Copy, Folder, FileDown, Upload, MoreVertical, ChevronDown, Star } from 'lucide-react';
import SocialShare from '@/components/SocialShare';
import PhotoEditor from '@/components/PhotoEditor';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import FaceSearch from '@/components/FaceSearch';
import PageHeader from '@/components/PageHeader';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import FilterButtons from '@/components/FilterButtons';
import UploadModal from '@/components/UploadModal';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { buildApiUrl } from '@/lib/api';

export default function PhotoManagementPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const confirmResolveRef = useRef<((value: boolean) => void) | null>(null);
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }>(null);

  const confirmOpen = confirmState !== null;

  function requestConfirm(opts: {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }) {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmState(opts);
    });
  }

  function closeConfirm(result: boolean) {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmState(null);
    resolve?.(result);
  }

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploaders, setUploaders] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

  const [storiesByPhotoId, setStoriesByPhotoId] = useState<Record<string, any>>({});
  const [togglingStoryPhotoId, setTogglingStoryPhotoId] = useState<string | null>(null);

  const loadStories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/stories`);
      const stories = Array.isArray(data?.stories) ? data.stories : [];
      const next: Record<string, any> = {};
      for (const s of stories) {
        if (s?.photoId) {
          next[String(s.photoId)] = s;
        }
      }
      setStoriesByPhotoId(next);
    } catch {
      setStoriesByPhotoId({});
    }
  };

  const toggleStory = async (photoId: string) => {
    try {
      setTogglingStoryPhotoId(photoId);
      const existing = storiesByPhotoId[photoId];
      const isActive = !(existing?.isActive === true);
      const { data } = await api.post(`/photos/${photoId}/story`, { isActive });
      const story = data?.story;
      if (story?.photoId) {
        setStoriesByPhotoId((prev) => ({ ...prev, [String(story.photoId)]: story }));
      } else {
        await loadStories();
      }
      showToast(isActive ? 'Story aktiviert' : 'Story deaktiviert', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler bei Story', 'error');
    } finally {
      setTogglingStoryPhotoId(null);
    }
  };

  useEffect(() => {
    loadEvent();
    loadCategories();
    loadPhotos();
    loadStories();
  }, [eventId, filter, viewMode]);

  useEffect(() => {
    // Extract unique uploaders from photos
    // Replace null/empty with "Unbekannt"
    const uniqueUploaders = Array.from(
      new Set(
        photos
          .map((p: any) => (p as any).uploadedBy || 'Unbekannt')
          .filter((name): name is string => !!name)
      )
    ).sort();
    setUploaders(uniqueUploaders);
  }, [photos]);


  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);

      if (viewMode === 'trash') {
        const { data } = await api.get(`/photos/${eventId}/trash`);
        setPhotos(data.photos || []);
        return;
      }

      const params: any = {};
      if (filter === 'all' || filter === 'all-uploader' || filter === 'all-albums') {
        // No filter
      } else if (['pending', 'approved', 'rejected'].includes(filter)) {
        params.status = filter.toUpperCase();
      } else if (filter.startsWith('category-')) {
        const categoryId = filter.replace('category-', '');
        params.categoryId = categoryId;
      } else if (filter.startsWith('uploader-')) {
        const uploaderName = filter.replace('uploader-', '');
        // Handle "Unbekannt" case - send null to backend
        if (uploaderName === 'Unbekannt') {
          params.uploadedBy = null;
        } else {
          params.uploadedBy = uploaderName;
        }
      }

      const { data } = await api.get(`/events/${eventId}/photos`, { params });
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Fehler beim Laden der Fotos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/restore`);
      showToast('Foto wiederhergestellt', 'success');
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler beim Wiederherstellen', 'error');
    }
  };

  const handlePurge = async (photoId: string) => {
    const ok = await requestConfirm({
      title: 'Foto endgültig löschen?'
    , description: 'Kann nicht rückgängig gemacht werden.'
    , confirmText: 'Endgültig löschen'
    });
    if (!ok) return;
    try {
      await api.delete(`/photos/${photoId}/purge`);
      showToast('Foto endgültig gelöscht', 'success');
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler beim endgültigen Löschen', 'error');
    }
  };

  const handleApprove = async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/approve`);
      showToast('Foto freigegeben', 'success');
      loadPhotos();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      showToast('Fehler beim Freigeben', 'error');
    }
  };

  const handleReject = async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/reject`);
      showToast('Foto abgelehnt', 'info');
      loadPhotos();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      showToast('Fehler beim Ablehnen', 'error');
    }
  };

  const handleDelete = async (photoId: string) => {
    const ok = await requestConfirm({
      title: 'Foto wirklich löschen?'
    , description: '30 Tage im Papierkorb.'
    , confirmText: 'Löschen'
    });
    if (!ok) return;

    try {
      await api.delete(`/photos/${photoId}`);
      showToast('Foto gelöscht (Papierkorb)', 'success');
      loadPhotos();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  const handleUpload = async (file: File, categoryId?: string, uploaderName?: string, alsoInGuestbook?: boolean) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      if (categoryId) {
        formData.append('categoryId', categoryId);
      }
      if (uploaderName && uploaderName.trim()) {
        formData.append('uploaderName', uploaderName.trim());
      }
      if (alsoInGuestbook) {
        formData.append('alsoInGuestbook', 'true');
      }

      await api.post(`/events/${eventId}/photos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Foto erfolgreich hochgeladen' + (alsoInGuestbook ? ' und im Gästebuch eingetragen' : ''), 'success');
      await loadPhotos();
    } catch (err: any) {
      console.error('Fehler beim Hochladen:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Hochladen';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    } finally {
      setUploading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };


  const handlePhotoClick = (photo: Photo, event: React.MouseEvent | React.TouchEvent) => {
    // Prevent opening photo detail if clicking on checkbox
    if ((event.target as HTMLElement).closest('.photo-checkbox')) {
      return;
    }
    
    // Always open photo detail, checkbox handles selection
    setSelectedPhoto(photo);
  };

  const handleBulkApprove = async () => {
    if (selectedPhotos.size === 0) return;
    try {
      await api.post('/photos/bulk/approve', {
        photoIds: Array.from(selectedPhotos),
      });
      showToast(`${selectedPhotos.size} Foto(s) freigegeben`, 'success');
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler bei Bulk-Freigabe', 'error');
    }
  };

  const handleBulkReject = async () => {
    if (selectedPhotos.size === 0) return;
    const ok = await requestConfirm({
      title: `${selectedPhotos.size} Foto(s) wirklich ablehnen?`,
      confirmText: 'Ablehnen',
    });
    if (!ok) return;
    try {
      await api.post('/photos/bulk/reject', {
        photoIds: Array.from(selectedPhotos),
      });
      showToast(`${selectedPhotos.size} Foto(s) abgelehnt`, 'success');
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler bei Bulk-Ablehnung', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    const ok = await requestConfirm({
      title: `${selectedPhotos.size} Foto(s) wirklich löschen?`,
      confirmText: 'Löschen',
    });
    if (!ok) return;
    try {
      await api.post('/photos/bulk/delete', {
        photoIds: Array.from(selectedPhotos),
      });
      showToast(`${selectedPhotos.size} Foto(s) gelöscht`, 'success');
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler bei Bulk-Löschung', 'error');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPhotos.size === 0) return;
    try {
      const response = await api.post('/photos/bulk/download', {
        photoIds: Array.from(selectedPhotos),
      }, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fotos-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast(`${selectedPhotos.size} Foto(s) heruntergeladen`, 'success');
      setSelectedPhotos(new Set());
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'STORAGE_LOCKED') {
        showToast('Speicherperiode beendet – Download nicht mehr möglich', 'error');
      } else {
        showToast('Fehler beim Download', 'error');
      }
    }
  };

  const handleBulkMoveToAlbum = async (categoryId: string | null) => {
    if (selectedPhotos.size === 0) return;
    try {
      await api.post('/photos/bulk/move-to-album', {
        photoIds: Array.from(selectedPhotos),
        categoryId,
      });
      showToast(`${selectedPhotos.size} Foto(s) verschoben`, 'success');
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler beim Verschieben', 'error');
    }
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPhotos(new Set());
  };

  // Check if moderation is enabled
  const featuresConfig = event?.featuresConfig && typeof event.featuresConfig === 'object' && 'moderationRequired' in event.featuresConfig
    ? (event.featuresConfig as any)
    : null;
  const moderationRequired = featuresConfig?.moderationRequired === true;

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

  const uploadDisabled = isStorageLocked || !withinUploadWindow;
  const uploadDisabledReason = isStorageLocked
    ? 'Die Speicherperiode ist beendet – Uploads sind nicht mehr möglich.'
    : 'Uploads sind nur 1 Tag vor/nach dem Event möglich.';

  if (loading && photos.length === 0) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <FullPageLoader label="Laden..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmState?.title}</DialogTitle>
            {confirmState?.description ? <DialogDescription>{confirmState.description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState?.cancelText || 'Abbrechen'}
              </Button>
            </DialogClose>
            <Button variant="danger" onClick={() => closeConfirm(true)}>
              {confirmState?.confirmText || 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
        <FaceSearch 
          eventId={eventId} 
          open={showFaceSearch}
          onClose={() => setShowFaceSearch(false)}
        />

        <PageHeader
          title={viewMode === 'trash' ? 'Fotos - Papierkorb' : 'Fotos'}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => selectAll()}
              disabled={viewMode === 'trash' || photos.length === 0}
            >
              <CheckSquare className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Alle auswählen</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => deselectAll()}
              disabled={viewMode === 'trash' || selectedPhotos.size === 0}
            >
              <Square className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Auswahl löschen</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => {
                setSelectedPhotos(new Set());
                setSelectedPhoto(null);
                setViewMode(viewMode === 'trash' ? 'active' : 'trash');
              }}
            >
              <Trash2 className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">{viewMode === 'trash' ? 'Zurück' : 'Papierkorb'}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="gap-2"
              onClick={() => {
                if (uploadDisabled) {
                  showToast(uploadDisabledReason, 'error');
                  return;
                }
                setShowUploadModal(true);
              }}
              disabled={viewMode === 'trash' || uploadDisabled}
            >
              <Upload className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Foto hochladen</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setShowFaceSearch(true)}
              disabled={viewMode === 'trash'}
            >
              <ScanFace className="h-5 w-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Finde meine eigenen Fotos</span>
            </Button>
            <Button asChild variant="primary" size="sm" className="gap-2">
              <Link href={`/events/${eventId}/duplicates`}>
                <Copy className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm">Duplikate verwalten</span>
              </Link>
            </Button>
          </div>
        </PageHeader>

        {isStorageLocked && (
          <div className="mb-4 rounded-xl border border-app-border bg-app-card p-4">
            <div className="flex items-start gap-3">
              <div>
                <p className="font-semibold text-sm text-app-fg">Speicherperiode beendet</p>
                <p className="text-xs text-app-muted mt-1">
                  Uploads und Downloads sind deaktiviert. Bitte verlängere das Paket, um wieder Zugriff zu erhalten.
                </p>
              </div>
            </div>
          </div>
        )}

        {uploading && (
          <div className="mb-4 p-4 bg-app-card border border-app-border rounded-lg">
            <p className="text-app-fg">Foto wird hochgeladen...</p>
          </div>
        )}

        {/* Filter Buttons - Status (only show if moderation is enabled) */}
        {viewMode === 'active' && moderationRequired && (
          <FilterButtons
            options={[
              { id: 'all', label: 'Alle' },
              { id: 'pending', label: 'Ausstehend' },
              { id: 'approved', label: 'Freigegeben' },
              { id: 'rejected', label: 'Abgelehnt' },
            ]}
            selected={filter}
            onSelect={setFilter}
          />
        )}

        {/* Filter Buttons - Albums */}
        {viewMode === 'active' && categories.length > 0 && (
          <FilterButtons
            options={[
              { id: 'all-albums', label: 'Alle Alben' },
              ...categories.map(cat => ({
                id: `category-${cat.id}`,
                label: cat.name,
              }))
            ]}
            selected={filter.startsWith('category-') ? filter : filter === 'all-albums' ? 'all-albums' : 'all-albums'}
            onSelect={(id) => {
              if (id === 'all-albums') {
                // Remove album filter, but keep other filters
                if (filter.startsWith('category-')) {
                  // If current filter is category, reset to 'all' or keep status/uploader filter
                  const otherFilters = filter.split('-').filter(f => !f.startsWith('category'));
                  setFilter(otherFilters.length > 0 ? otherFilters.join('-') : 'all');
                } else {
                  setFilter(filter === 'all' ? 'all' : filter);
                }
              } else {
                setFilter(id);
              }
            }}
            label="Alben:"
          />
        )}

        {/* Filter Buttons - Uploader with Actions Menu */}
        <div className="flex items-center gap-3 flex-wrap w-full mb-4">
          {/* Uploader Dropdown */}
          {viewMode === 'active' && uploaders.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2 px-3 py-2">
                  <span className="text-sm font-medium">
                    Hochgeladen von:{' '}
                    {filter.startsWith('uploader-')
                      ? uploaders.find((u) => `uploader-${u}` === filter) || 'Alle Uploader'
                      : 'Alle Uploader'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[300px] min-w-[200px] overflow-y-auto" align="start">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setFilter('all');
                  }}
                  className={!filter.startsWith('uploader-') ? 'bg-app-bg font-medium' : ''}
                >
                  Alle Uploader
                </DropdownMenuItem>
                {uploaders.map((uploader) => (
                  <DropdownMenuItem
                    key={uploader}
                    onSelect={(e) => {
                      e.preventDefault();
                      setFilter(`uploader-${uploader}`);
                    }}
                    className={filter === `uploader-${uploader}` ? 'bg-app-bg font-medium' : ''}
                  >
                    {uploader}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Actions Menu - Right aligned */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2 px-3 py-2" disabled={viewMode === 'trash'}>
                  <MoreVertical className="h-5 w-5" />
                  <span className="text-xs sm:text-sm font-medium">Aktionen</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="min-w-[220px]">
                {selectedPhotos.size > 0 ? (
                  <>
                    <DropdownMenuItem disabled className="text-xs text-app-muted">
                      {selectedPhotos.size} Foto(s) ausgewählt
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Folder className="mr-2 h-4 w-4" />
                        <span>Verschieben</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleBulkMoveToAlbum(null);
                          }}
                        >
                          <Folder className="mr-2 h-4 w-4" />
                          Kein Album
                        </DropdownMenuItem>
                        {categories.map((category) => (
                          <DropdownMenuItem
                            key={category.id}
                            onSelect={(e) => {
                              e.preventDefault();
                              handleBulkMoveToAlbum(category.id);
                            }}
                          >
                            <Folder className="mr-2 h-4 w-4" />
                            {category.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {moderationRequired && (
                      <>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            const hasPending = Array.from(selectedPhotos).some((id) => {
                              const photo = photos.find((p) => p.id === id);
                              return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                            });
                            if (hasPending) handleBulkApprove();
                          }}
                          disabled={!Array.from(selectedPhotos).some((id) => {
                            const photo = photos.find((p) => p.id === id);
                            return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                          })}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Freigeben
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            const hasPending = Array.from(selectedPhotos).some((id) => {
                              const photo = photos.find((p) => p.id === id);
                              return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                            });
                            if (hasPending) handleBulkReject();
                          }}
                          disabled={!Array.from(selectedPhotos).some((id) => {
                            const photo = photos.find((p) => p.id === id);
                            return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                          })}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Ablehnen
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleBulkDownload();
                      }}
                      disabled={isStorageLocked}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Herunterladen
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        handleBulkDelete();
                      }}
                      className="text-[var(--status-danger)] focus:text-[var(--status-danger)]"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Löschen
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                  </>
                ) : null}

                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    if (selectedPhotos.size === photos.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {selectedPhotos.size === photos.length ? 'Auswahl aufheben' : 'Alle auswählen'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Upload Modal */}
        <UploadModal
          open={showUploadModal && !uploadDisabled}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          categories={categories}
          accept="image/*"
          title="Foto hochladen"
          showGuestbookOption={true}
        />

        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-app-muted mb-4" />
            <p className="text-app-muted">{viewMode === 'trash' ? 'Papierkorb ist leer' : 'Noch keine Fotos hochgeladen'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`relative bg-app-card rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  selectedPhotos.has(photo.id) ? 'ring-2 ring-tokens-brandGreen shadow-lg' : ''
                }`}
                onClick={(e) => {
                  if (viewMode === 'trash') return;
                  handlePhotoClick(photo, e);
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="relative bg-app-bg aspect-square">
                  {/* Checkbox always visible - top left */}
                  {viewMode === 'active' && (
                  <div 
                    className="absolute top-2 left-2 z-10 photo-checkbox cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo.id);
                    }}
                  >
                    <div className={`p-1.5 rounded-full shadow-lg transition-colors ${
                      selectedPhotos.has(photo.id) 
                        ? 'bg-tokens-brandGreen' 
                        : 'bg-app-card/90 hover:bg-app-card'
                    }`}>
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="w-4 h-4 text-app-bg" />
                      ) : (
                        <Square className="w-4 h-4 text-app-muted" />
                      )}
                    </div>
                  </div>
                  )}

                  {viewMode === 'trash' && (
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(photo.id);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90"
                      >
                        Wiederherstellen
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurge(photo.id);
                        }}
                        className="px-2 py-1 text-xs bg-[var(--status-danger)] text-app-bg rounded-md hover:opacity-90"
                      >
                        Endgültig
                      </Button>
                    </div>
                  )}
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt="Foto"
                      className={`w-full h-full object-cover ${isStorageLocked ? 'blur-md' : ''}`}
                      loading="lazy"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-app-muted">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  {((photo.status as string)?.toLowerCase() === 'pending' || (photo.status as string) === 'PENDING') && (
                    <div className="absolute top-2 right-2 bg-[var(--status-warning)] text-app-bg px-1.5 py-0.5 rounded text-xs font-medium">
                      Ausstehend
                    </div>
                  )}
                  {((photo.status as string)?.toLowerCase() === 'rejected' || (photo.status as string) === 'REJECTED') && (
                    <div className="absolute top-2 right-2 bg-[var(--status-danger)] text-app-bg px-1.5 py-0.5 rounded text-xs font-medium">
                      Abgelehnt
                    </div>
                  )}

                  {viewMode === 'active' && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStory(photo.id);
                      }}
                      icon={
                        <Star
                          className={`w-4 h-4 ${storiesByPhotoId[photo.id]?.isActive ? 'text-[var(--status-warning)] fill-[var(--status-warning)]' : 'text-app-muted'}`}
                        />
                      }
                      type="button"
                      disabled={togglingStoryPhotoId === photo.id}
                      variant="ghost"
                      size="sm"
                      aria-label={storiesByPhotoId[photo.id]?.isActive ? 'Story deaktivieren' : 'Als Story markieren'}
                      title={storiesByPhotoId[photo.id]?.isActive ? 'Story deaktivieren' : 'Als Story markieren'}
                      className="absolute bottom-2 right-2 z-10 p-2 rounded-full bg-app-card/90 hover:bg-app-card shadow disabled:opacity-50"
                    />
                  )}
                </div>
                <div className="p-2 bg-app-bg border-t border-app-border">
                  <p className="text-xs text-app-muted truncate">von {(photo as any).uploadedBy || 'Unbekannt'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bulk Actions Bar removed - now handled by actions menu in header */}

        {/* Floating Action Button for ZIP Download */}
        {photos.length > 0 && !isStorageLocked && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              try {
                const allIds = photos.map((p: any) => p.id).filter(Boolean);
                if (allIds.length === 0) return;
                const response = await api.post('/photos/bulk/download', {
                  photoIds: allIds,
                }, {
                  responseType: 'blob',
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `fotos-${Date.now()}.zip`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                showToast('Alle Fotos heruntergeladen', 'success');
              } catch (err: any) {
                const code = err?.response?.data?.code;
                if (code === 'STORAGE_LOCKED') {
                  showToast('Speicherperiode beendet – Download nicht mehr möglich', 'error');
                } else {
                  showToast('Fehler beim Download', 'error');
                }
              }
            }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-tokens-brandGreen text-app-bg rounded-full shadow-lg flex items-center justify-center z-40 hover:opacity-90 transition-colors"
          >
            <FileDown className="w-6 h-6" />
          </motion.button>
        )}

        {/* Photo Detail Modal */}
        <Dialog open={selectedPhoto !== null} onOpenChange={(open) => (open ? null : setSelectedPhoto(null))}>
          {selectedPhoto !== null && (
            <DialogContent className="bg-app-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
                <div className="mb-4 flex justify-between items-center sticky top-0 bg-app-card z-10 pb-2 border-b border-app-border">
                  <h2 className="text-lg font-semibold">Foto-Details</h2>
                  <div className="flex items-center gap-2">
                    {/* Photo Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="gap-2 px-3 py-2">
                          <MoreVertical className="h-5 w-5" />
                          <span className="text-sm font-medium">Aktionen</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="min-w-[220px]">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Folder className="mr-2 h-4 w-4" />
                            <span>Verschieben</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                const photoIds = [selectedPhoto.id];
                                api
                                  .post('/photos/bulk/move-to-album', {
                                    photoIds,
                                    categoryId: null,
                                  })
                                  .then(() => {
                                    showToast('Foto verschoben', 'success');
                                    loadPhotos();
                                  });
                              }}
                            >
                              <Folder className="mr-2 h-4 w-4" />
                              Kein Album
                            </DropdownMenuItem>
                            {categories.map((category) => (
                              <DropdownMenuItem
                                key={category.id}
                                onSelect={(e) => {
                                  e.preventDefault();
                                  const photoIds = [selectedPhoto.id];
                                  api
                                    .post('/photos/bulk/move-to-album', {
                                      photoIds,
                                      categoryId: category.id,
                                    })
                                    .then(() => {
                                      showToast('Foto verschoben', 'success');
                                      loadPhotos();
                                    });
                                }}
                              >
                                <Folder className="mr-2 h-4 w-4" />
                                {category.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            setEditingPhoto(selectedPhoto);
                            setSelectedPhoto(null);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Bearbeiten
                        </DropdownMenuItem>

                        {moderationRequired && (
                          <>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                if ((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') {
                                  handleApprove(selectedPhoto.id);
                                }
                              }}
                              disabled={!((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING')}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Freigeben
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                if ((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') {
                                  handleReject(selectedPhoto.id);
                                }
                              }}
                              disabled={!((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING')}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Ablehnen
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            if (isStorageLocked) {
                              showToast('Speicherperiode beendet – Download nicht mehr möglich', 'error');
                              return;
                            }
                            const url = buildApiUrl(`/photos/${selectedPhoto.id}/download`);
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Herunterladen
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            handleDelete(selectedPhoto.id);
                          }}
                          className="text-[var(--status-danger)] focus:text-[var(--status-danger)]"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DialogClose asChild>
                      <IconButton
                        onClick={() => setSelectedPhoto(null)}
                        icon={<X className="w-6 h-6" />}
                        variant="ghost"
                        size="sm"
                        aria-label="Schließen"
                        title="Schließen"
                        className="text-app-muted hover:text-app-fg"
                      />
                    </DialogClose>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start">
                    {selectedPhoto.url ? (
                      <img
                        src={selectedPhoto.url}
                        alt="Foto"
                        className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-app-bg rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-app-muted" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-app-muted">Status</p>
                      <p className="font-medium">
                        {(selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING'
                          ? 'Ausstehend'
                          : (selectedPhoto.status as string)?.toLowerCase() === 'approved' || (selectedPhoto.status as string) === 'APPROVED'
                          ? 'Freigegeben'
                          : (selectedPhoto.status as string)?.toLowerCase() === 'rejected' || (selectedPhoto.status as string) === 'REJECTED'
                          ? 'Abgelehnt'
                          : 'Unbekannt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-app-muted">Hochgeladen von</p>
                      <p className="font-medium">{(selectedPhoto as any).uploadedBy || 'Unbekannt'}</p>
                    </div>
                    {(selectedPhoto as any).guest && (
                      <div>
                        <p className="text-sm text-app-muted">Gast</p>
                        <p className="font-medium">
                          {(selectedPhoto as any).guest?.firstName} {(selectedPhoto as any).guest?.lastName}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-app-muted">Hochgeladen</p>
                      <p className="font-medium">{new Date(selectedPhoto.createdAt).toLocaleString('de-DE')}</p>
                    </div>

                    <div className="pt-4">
                      <p className="text-sm text-app-muted mb-2">Teilen & Download</p>
                      <div className="flex gap-2">
                        <a
                          href={`/api/photos/${selectedPhoto.id}/download`}
                          download
                          className="px-4 py-2 bg-[var(--status-info)] text-app-bg rounded-md hover:opacity-90 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Herunterladen
                        </a>
                        <SocialShare
                          url={selectedPhoto.url || ''}
                          title="Event Foto"
                          imageUrl={selectedPhoto.url || undefined}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setEditingPhoto(selectedPhoto);
                          setSelectedPhoto(null);
                        }}
                        className="px-4 py-2 bg-[var(--status-info)] text-app-bg rounded-md hover:opacity-90 flex items-center justify-center gap-2"
                      >
                        <Edit className="w-5 h-5" />
                        Bearbeiten
                      </motion.button>
                      {((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') && (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(selectedPhoto.id)}
                            className="flex-1 px-4 py-2 bg-[var(--status-success)] text-app-bg rounded-md hover:opacity-90 flex items-center justify-center gap-2"
                          >
                            <Check className="w-5 h-5" />
                            Freigeben
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReject(selectedPhoto.id)}
                            className="flex-1 px-4 py-2 bg-[var(--status-danger)] text-app-bg rounded-md hover:opacity-90 flex items-center justify-center gap-2"
                          >
                            <X className="w-5 h-5" />
                            Ablehnen
                          </motion.button>
                        </>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(selectedPhoto.id)}
                        className="px-4 py-2 bg-[var(--status-neutral)] text-app-bg rounded-md hover:opacity-90 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          )}
        </Dialog>

        {/* Photo Editor Modal */}
        <AnimatePresence>
          {editingPhoto && (
            <PhotoEditor
              photoId={editingPhoto.id}
              photoUrl={editingPhoto.url || ''}
              onClose={() => setEditingPhoto(null)}
              onSave={() => {
                loadPhotos();
                setEditingPhoto(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}
