'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Photo, Event as EventType } from '@gaestefotos/shared';
import { Check, X, Trash2, Download, Square, CheckSquare, Edit, ScanFace, Image as ImageIcon, Copy, Folder, FileDown, Upload, MoreVertical, ChevronDown, Star } from 'lucide-react';
import SocialShare from '@/components/SocialShare';
import { useToastStore } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import FaceSearch from '@/components/FaceSearch';
import PageHeader from '@/components/PageHeader';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import PhotoCard from '@/components/dashboard/PhotoCard';
import PhotoFilterBar, { type PhotoFilterStatus } from '@/components/dashboard/PhotoFilterBar';
import BulkActionsToolbar from '@/components/dashboard/BulkActionsToolbar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { buildApiUrl } from '@/lib/api';
import { useRealtimePhotos } from '@/hooks/useRealtimePhotos';

const PhotoEditor = dynamic(() => import('@/components/PhotoEditor'), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-pulse text-muted-foreground">Editor wird geladen...</div>
    </div>
  )
});

export default function PhotoManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const [eventId, setEventId] = React.useState<string | null>(null);

  React.useEffect(() => {
    params.then(p => setEventId(p.id));
  }, []);
  
  const { showToast } = useToastStore();
  const { user } = useAuthStore();

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
  const [filter, setFilter] = useState<PhotoFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [showFaceSearch, setShowFaceSearch] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
    if (eventId) {
      loadEvent();
      loadCategories();
      loadPhotos();
      loadStories();
    }
  }, [eventId, filter]);

  useRealtimePhotos({
    eventId: eventId || '',
    onRefreshNeeded: () => {
      loadPhotos();
      loadStories();
    },
  });

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      void err;
    }
  };

  const loadCategories = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/categories`);
      setCategories(data.categories || []);
    } catch (err) {
      void err;
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (['pending', 'approved', 'rejected'].includes(filter)) {
        params.status = filter.toUpperCase();
      }

      const { data } = await api.get(`/events/${eventId}/photos`, { params });
      setPhotos(data.photos || []);
    } catch (err) {
      void err;
    } finally {
      setLoading(false);
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
      title: 'Foto wirklich löschen?',
      description: '30 Tage im Papierkorb.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.delete(`/photos/${photoId}`);
      showToast('Foto gelöscht', 'success');
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
      formData.append('photo', file);
      if (categoryId) formData.append('categoryId', categoryId);
      if (uploaderName) formData.append('uploaderName', uploaderName);
      if (alsoInGuestbook) formData.append('alsoInGuestbook', 'true');

      await api.post(`/events/${eventId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Foto hochgeladen', 'success');
      setShowUploadModal(false);
      loadPhotos();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Upload', 'error');
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
      showToast('Fehler beim Freigeben', 'error');
    }
  };

  const handleBulkReject = async () => {
    if (selectedPhotos.size === 0) return;
    const ok = await requestConfirm({
      title: `${selectedPhotos.size} Foto(s) wirklich ablehnen?`,
      description: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmText: 'Ablehnen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.post('/photos/bulk/reject', {
        photoIds: Array.from(selectedPhotos),
      });
      showToast(`${selectedPhotos.size} Foto(s) abgelehnt`, 'info');
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch (err: any) {
      showToast('Fehler beim Ablehnen', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    const ok = await requestConfirm({
      title: `${selectedPhotos.size} Foto(s) wirklich löschen?`,
      description: '30 Tage im Papierkorb.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
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
      showToast('Fehler beim Löschen', 'error');
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
      showToast('Fotos heruntergeladen', 'success');
    } catch (err: any) {
      showToast('Fehler beim Download', 'error');
    }
  };

  const isStorageLocked = (() => {
    if (!event) return false;
    if (typeof (event as any).isStorageLocked === 'boolean') return (event as any).isStorageLocked;
    const endsAt = (event as any).storageEndsAt ? new Date((event as any).storageEndsAt).getTime() : null;
    if (!endsAt || Number.isNaN(endsAt)) return false;
    return Date.now() > endsAt;
  })();

  const withinUploadWindow = (() => {
    if (!event?.dateTime) return true;
    const eventTime = new Date(event.dateTime).getTime();
    if (!Number.isFinite(eventTime)) return true;
    const windowMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return now >= eventTime - windowMs && now <= eventTime + windowMs;
  })();

  const isHost = event?.hostId === user?.id;
  const uploadDisabled = isStorageLocked || (!isHost && !withinUploadWindow);

  if (loading && photos.length === 0) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <FullPageLoader label="Laden..." />
      </AppLayout>
    );
  }

  const filteredPhotos = photos.filter(photo => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const uploader = (photo as any).uploadedBy || '';
      return uploader.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => (open ? null : closeConfirm(false))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            {confirmState?.description && (
              <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="secondary" onClick={() => closeConfirm(false)}>
                {confirmState?.cancelText || 'Abbrechen'}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="danger" onClick={() => closeConfirm(true)}>
                {confirmState?.confirmText || 'Bestätigen'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
          <FaceSearch 
            eventId={eventId!} 
            open={showFaceSearch}
            onClose={() => setShowFaceSearch(false)}
          />

          <PageHeader title="Fotos">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowFaceSearch(true)}
                className="gap-2"
              >
                <ScanFace className="h-5 w-5" />
                <span className="hidden sm:inline">Gesichtserkennung</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowUploadModal(true)}
                disabled={uploadDisabled}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                <span className="hidden sm:inline">Hochladen</span>
              </Button>
            </div>
          </PageHeader>

          {isStorageLocked && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div>
                  <p className="font-semibold text-sm text-foreground">Speicherperiode beendet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Uploads sind nicht mehr möglich. Fotos können weiterhin angesehen werden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploading && (
            <div className="mb-4 p-4 bg-card border border-border rounded-lg">
              <p className="text-foreground">Foto wird hochgeladen...</p>
            </div>
          )}

          <PhotoFilterBar
            activeFilter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            counts={{
              all: photos.length,
              pending: photos.filter(p => (p.status as string)?.toLowerCase() === 'pending').length,
              approved: photos.filter(p => (p.status as string)?.toLowerCase() === 'approved').length,
              rejected: photos.filter(p => (p.status as string)?.toLowerCase() === 'rejected').length,
            }}
          />

          <BulkActionsToolbar
            selectedCount={selectedPhotos.size}
            totalCount={filteredPhotos.length}
            onClear={() => setSelectedPhotos(new Set())}
            onDelete={handleBulkDelete}
            onMarkConfirmed={handleBulkApprove}
            onMarkDeclined={handleBulkReject}
            onExport={handleBulkDownload}
          />

          <UploadModal
            open={showUploadModal && !uploadDisabled}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUpload}
            categories={categories}
            accept="image/*"
            title="Foto hochladen"
            showGuestbookOption={true}
          />

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Noch keine Fotos hochgeladen</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={{ ...photo, uploaderName: (photo as any).uploadedBy || 'Unbekannt' }}
                  isSelected={selectedPhotos.has(photo.id)}
                  onSelect={() => togglePhotoSelection(photo.id)}
                  onApprove={() => handleApprove(photo.id)}
                  onReject={() => handleReject(photo.id)}
                  onDelete={() => handleDelete(photo.id)}
                  onView={() => setSelectedPhoto(photo)}
                />
              ))}
            </div>
          )}
        </div>
        <DashboardFooter eventId={eventId!} />
      </AppLayout>

      {/* Photo Detail Modal */}
      <Dialog open={selectedPhoto !== null} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        {selectedPhoto && (
          <DialogContent className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Foto-Details</h2>
              </div>
              
              <div className="mb-4">
                <img
                  src={selectedPhoto.url}
                  alt="Foto"
                  className="w-full rounded-lg"
                />
              </div>

              <div className="space-y-2 text-sm">
                <p><strong>Hochgeladen von:</strong> {(selectedPhoto as any).uploadedBy || 'Unbekannt'}</p>
                <p><strong>Datum:</strong> {new Date(selectedPhoto.createdAt).toLocaleDateString('de-DE')}</p>
                <p><strong>Status:</strong> {
                  (selectedPhoto.status as string)?.toLowerCase() === 'approved' ? 'Freigegeben' :
                  (selectedPhoto.status as string)?.toLowerCase() === 'rejected' ? 'Abgelehnt' : 'Ausstehend'
                }</p>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                {(selectedPhoto.status as string)?.toLowerCase() === 'pending' && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleApprove(selectedPhoto.id);
                        setSelectedPhoto(null);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Freigeben
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        handleReject(selectedPhoto.id);
                        setSelectedPhoto(null);
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Ablehnen
                    </Button>
                  </>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedPhoto(null)}
                >
                  Schließen
                </Button>
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
    </>
  );
}
