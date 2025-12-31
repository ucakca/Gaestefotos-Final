'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { buildApiUrl } from '@/lib/api';
import AppLayout from '@/components/AppLayout';
import DashboardFooter from '@/components/DashboardFooter';
import { Video, Upload, Download, Trash2, Check, X, Square, CheckSquare, Folder, FileDown, MoreVertical, ChevronDown } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import PageHeader from '@/components/PageHeader';
import ActionButton from '@/components/ActionButton';
import FilterButtons from '@/components/FilterButtons';
import UploadModal from '@/components/UploadModal';
import { Button } from '@/components/ui/Button';
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

interface VideoItem {
  id: string;
  url: string;
  storagePath: string;
  title?: string;
  description?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED';
  createdAt: string;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  category?: {
    id: string;
    name: string;
  };
}

export default function VideosPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { showToast } = useToastStore();
  
  const [event, setEvent] = useState<any>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [uploaders, setUploaders] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | string>('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');

  useEffect(() => {
    loadEvent();
    loadCategories();
    loadVideos();
  }, [eventId, filter, viewMode]);

  useEffect(() => {
    // Extract unique uploaders from videos
    // Replace null/empty with "Unbekannt"
    const uniqueUploaders = Array.from(
      new Set(
        videos
          .map((v: any) => (v as any).uploadedBy || 'Unbekannt')
          .filter((name): name is string => !!name)
      )
    ).sort();
    setUploaders(uniqueUploaders);
  }, [videos]);

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

  const loadVideos = async () => {
    try {
      setLoading(true);

      if (viewMode === 'trash') {
        const { data } = await api.get(`/videos/${eventId}/trash`);
        setVideos(data.videos || []);
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

      const { data } = await api.get(`/events/${eventId}/videos`, { params });
      setVideos(data.videos || []);
    } catch (err: any) {
      console.error('Fehler beim Laden der Videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/restore`);
      showToast('Video wiederhergestellt', 'success');
      await loadVideos();
    } catch (err: any) {
      showToast('Fehler beim Wiederherstellen', 'error');
    }
  };

  const handlePurge = async (videoId: string) => {
    if (!confirm('Video endgültig löschen? (Kann nicht rückgängig gemacht werden)')) return;
    try {
      await api.delete(`/videos/${videoId}/purge`);
      showToast('Video endgültig gelöscht', 'success');
      await loadVideos();
    } catch (err: any) {
      showToast('Fehler beim endgültigen Löschen', 'error');
    }
  };

  const handleUpload = async (file: File, categoryId?: string, uploaderName?: string) => {
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
      
      await api.post(`/events/${eventId}/videos/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      showToast('Video erfolgreich hochgeladen', 'success');
      await loadVideos();
    } catch (err: any) {
      console.error('Fehler beim Hochladen:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Fehler beim Hochladen';
      showToast(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleApprove = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/approve`);
      showToast('Video freigegeben', 'success');
      await loadVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err: any) {
      console.error('Fehler beim Freigeben:', err);
      showToast('Fehler beim Freigeben des Videos', 'error');
    }
  };

  const handleReject = async (videoId: string) => {
    try {
      await api.post(`/videos/${videoId}/reject`);
      showToast('Video abgelehnt', 'info');
      await loadVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err: any) {
      console.error('Fehler beim Ablehnen:', err);
      showToast('Fehler beim Ablehnen des Videos', 'error');
    }
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Möchten Sie dieses Video wirklich löschen? (30 Tage im Papierkorb)')) return;
    
    try {
      await api.delete(`/videos/${videoId}`);
      showToast('Video gelöscht (Papierkorb)', 'success');
      await loadVideos();
      if (selectedVideo?.id === videoId) {
        setSelectedVideo(null);
      }
    } catch (err: any) {
      console.error('Fehler beim Löschen:', err);
      showToast('Fehler beim Löschen des Videos', 'error');
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoId)) {
      newSelection.delete(videoId);
    } else {
      newSelection.add(videoId);
    }
    setSelectedVideos(newSelection);
  };


  const handleVideoClick = (video: VideoItem, event: React.MouseEvent | React.TouchEvent) => {
    // Prevent opening video detail if clicking on checkbox
    if ((event.target as HTMLElement).closest('.video-checkbox')) {
      return;
    }
    
    // Always open video detail, checkbox handles selection
    setSelectedVideo(video);
  };

  const handleBulkApprove = async () => {
    if (selectedVideos.size === 0) return;
    try {
      await api.post('/videos/bulk/approve', {
        videoIds: Array.from(selectedVideos),
      });
      showToast(`${selectedVideos.size} Video(s) freigegeben`, 'success');
      setSelectedVideos(new Set());
      await loadVideos();
    } catch (err: any) {
      console.error('Fehler bei Bulk-Freigabe:', err);
      showToast('Fehler bei Bulk-Freigabe der Videos', 'error');
    }
  };

  const handleBulkReject = async () => {
    if (selectedVideos.size === 0) return;
    if (!confirm(`${selectedVideos.size} Video(s) wirklich ablehnen?`)) return;
    try {
      await api.post('/videos/bulk/reject', {
        videoIds: Array.from(selectedVideos),
      });
      showToast(`${selectedVideos.size} Video(s) abgelehnt`, 'success');
      setSelectedVideos(new Set());
      await loadVideos();
    } catch (err: any) {
      console.error('Fehler bei Bulk-Ablehnung:', err);
      showToast('Fehler bei Bulk-Ablehnung der Videos', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVideos.size === 0) return;
    if (!confirm(`${selectedVideos.size} Video(s) wirklich löschen?`)) return;
    try {
      await api.post('/videos/bulk/delete', {
        videoIds: Array.from(selectedVideos),
      });
      showToast(`${selectedVideos.size} Video(s) gelöscht`, 'success');
      setSelectedVideos(new Set());
      await loadVideos();
    } catch (err: any) {
      console.error('Fehler bei Bulk-Löschung:', err);
      showToast('Fehler bei Bulk-Löschung der Videos', 'error');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedVideos.size === 0) return;
    try {
      const response = await api.post('/videos/bulk/download', {
        videoIds: Array.from(selectedVideos),
      }, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `videos-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast(`${selectedVideos.size} Video(s) heruntergeladen`, 'success');
      setSelectedVideos(new Set());
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
    if (selectedVideos.size === 0) return;
    try {
      await api.post('/videos/bulk/move-to-album', {
        videoIds: Array.from(selectedVideos),
        categoryId,
      });
      showToast(`${selectedVideos.size} Video(s) verschoben`, 'success');
      setSelectedVideos(new Set());
      await loadVideos();
    } catch (err: any) {
      showToast('Fehler beim Verschieben', 'error');
    }
  };

  const selectAll = () => {
    setSelectedVideos(new Set(videos.map(v => v.id)));
  };

  const deselectAll = () => {
    setSelectedVideos(new Set());
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

  if (loading && videos.length === 0) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <FullPageLoader label="Laden..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24">
        <PageHeader
          title={viewMode === 'trash' ? 'Videos - Papierkorb' : 'Videos'}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ActionButton
              icon={Trash2}
              label={viewMode === 'trash' ? 'Zurück' : 'Papierkorb'}
              onClick={() => {
                setSelectedVideos(new Set());
                setSelectedVideo(null);
                setViewMode(viewMode === 'trash' ? 'active' : 'trash');
              }}
            />
            <ActionButton
              icon={Upload}
              label="Video hochladen"
              onClick={() => {
                if (uploadDisabled) {
                  showToast(uploadDisabledReason, 'error');
                  return;
                }
                setShowUploadModal(true);
              }}
              disabled={viewMode === 'trash' || uploadDisabled}
            />
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
            <p className="text-app-fg">Video wird hochgeladen...</p>
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
                {selectedVideos.size > 0 ? (
                  <>
                    <DropdownMenuItem disabled className="text-xs text-app-muted">
                      {selectedVideos.size} Video(s) ausgewählt
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
                            const hasPending = Array.from(selectedVideos).some((id) => {
                              const video = videos.find((v) => v.id === id);
                              return (video?.status as string)?.toLowerCase() === 'pending' || video?.status === 'PENDING';
                            });
                            if (hasPending) handleBulkApprove();
                          }}
                          disabled={!Array.from(selectedVideos).some((id) => {
                            const video = videos.find((v) => v.id === id);
                            return (video?.status as string)?.toLowerCase() === 'pending' || video?.status === 'PENDING';
                          })}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Freigeben
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(e) => {
                            e.preventDefault();
                            const hasPending = Array.from(selectedVideos).some((id) => {
                              const video = videos.find((v) => v.id === id);
                              return (video?.status as string)?.toLowerCase() === 'pending' || video?.status === 'PENDING';
                            });
                            if (hasPending) handleBulkReject();
                          }}
                          disabled={!Array.from(selectedVideos).some((id) => {
                            const video = videos.find((v) => v.id === id);
                            return (video?.status as string)?.toLowerCase() === 'pending' || video?.status === 'PENDING';
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
                    if (selectedVideos.size === videos.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {selectedVideos.size === videos.length ? 'Auswahl aufheben' : 'Alle auswählen'}
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
          accept="video/*"
          title="Video hochladen"
        />

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="w-16 h-16 mx-auto text-app-muted mb-4" />
            <p className="text-app-muted">{viewMode === 'trash' ? 'Papierkorb ist leer' : 'Noch keine Videos hochgeladen'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {videos.map((video) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => {
                  if (viewMode === 'trash') return;
                  handleVideoClick(video, e);
                }}
                className={`relative bg-app-card rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  selectedVideos.has(video.id) ? 'ring-2 ring-tokens-brandGreen shadow-lg' : ''
                }`}
              >
                <div className="relative bg-app-bg rounded-lg overflow-hidden">
                  {/* Checkbox */}
                  {viewMode === 'active' && (
                    <div
                      className="absolute top-2 left-2 z-10 video-checkbox cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVideoSelection(video.id);
                      }}
                    >
                      <div className={`p-1.5 rounded-full shadow-lg transition-colors ${
                        selectedVideos.has(video.id)
                          ? 'bg-tokens-brandGreen'
                          : 'bg-app-card/90 hover:bg-app-card'
                      }`}>
                        {selectedVideos.has(video.id) ? (
                          <CheckSquare className="w-4 h-4 text-app-bg" />
                        ) : (
                          <Square className="w-4 h-4 text-app-muted" />
                        )}
                      </div>
                    </div>
                  )}

                  {viewMode === 'trash' && (
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(video.id);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-tokens-brandGreen text-app-bg rounded-md hover:opacity-90"
                      >
                        Wiederherstellen
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurge(video.id);
                        }}
                        className="px-2 py-1 text-xs bg-[var(--status-danger)] text-app-bg rounded-md hover:opacity-90"
                      >
                        Endgültig
                      </button>
                    </div>
                  )}
                  {video.url ? (
                    <video
                      src={video.url}
                      className={`w-full h-48 object-cover ${isStorageLocked ? 'blur-md' : ''}`}
                      muted
                      playsInline
                      onContextMenu={(e) => e.preventDefault()}
                      controlsList="nodownload"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-app-muted">
                      <Video className="w-8 h-8" />
                    </div>
                  )}
                  {video.status === 'PENDING' && (
                    <div className="absolute top-2 right-2 bg-[var(--status-warning)] text-app-bg px-1.5 py-0.5 rounded text-xs font-medium">
                      Ausstehend
                    </div>
                  )}
                  {video.status === 'REJECTED' && (
                    <div className="absolute top-2 right-2 bg-[var(--status-danger)] text-app-bg px-1.5 py-0.5 rounded text-xs font-medium">
                      Abgelehnt
                    </div>
                  )}
                </div>
                <div className="p-2 bg-app-bg border-t border-app-border">
                  <p className="text-xs text-app-muted truncate">von {(video as any).uploadedBy || 'Unbekannt'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bulk Actions Bar removed - now handled by actions menu in header */}

        {/* Video Detail Modal */}
        <AnimatePresence>
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="fixed inset-0 bg-app-fg/75 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-app-card rounded-lg max-w-4xl w-full p-6"
              >
                <div className="mb-4">
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-app-muted hover:text-app-fg"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {selectedVideo.url ? (
                      <video
                        src={selectedVideo.url}
                        className="w-full rounded-lg"
                        controls
                        autoPlay
                      />
                    ) : (
                      <div className="w-full aspect-video bg-app-bg rounded-lg flex items-center justify-center">
                        <Video className="w-12 h-12 text-app-muted" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-app-muted">Status</p>
                      <p className="font-medium">
                        {selectedVideo.status === 'PENDING' ? 'Ausstehend' : selectedVideo.status === 'APPROVED' ? 'Freigegeben' : 'Abgelehnt'}
                      </p>
                    </div>
                    {selectedVideo.guest && (
                      <div>
                        <p className="text-sm text-app-muted">Gast</p>
                        <p className="font-medium">
                          {selectedVideo.guest.firstName} {selectedVideo.guest.lastName}
                        </p>
                      </div>
                    )}
                    {selectedVideo.category && (
                      <div>
                        <p className="text-sm text-app-muted">Album</p>
                        <p className="font-medium">
                          {selectedVideo.category.name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-app-muted">Hochgeladen</p>
                      <p className="font-medium">
                        {new Date(selectedVideo.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>

                    {(selectedVideo as any).uploadedBy && (
                      <div>
                        <p className="text-sm text-app-muted">Hochgeladen von</p>
                        <p className="font-medium">
                          {(selectedVideo as any).uploadedBy || 'Unbekannt'}
                        </p>
                      </div>
                    )}

                    <div className="pt-4">
                      <p className="text-sm text-app-muted mb-2">Download</p>
                      <button
                        onClick={() => {
                          if (isStorageLocked) {
                            showToast('Speicherperiode beendet – Download nicht mehr möglich', 'error');
                            return;
                          }
                          const url = buildApiUrl(`/videos/${selectedVideo.id}/download`);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="px-4 py-2 bg-[var(--status-info)] text-app-bg rounded-md hover:opacity-90 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Original herunterladen
                      </button>
                    </div>
                    
                    {/* Actions are now in the header dropdown - keeping this section for additional info if needed */}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button for ZIP Download */}
        {videos.length > 0 && !isStorageLocked && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              try {
                const allIds = videos.map((v: any) => v.id).filter(Boolean);
                if (allIds.length === 0) return;
                const response = await api.post('/videos/bulk/download', {
                  videoIds: allIds,
                }, {
                  responseType: 'blob',
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `videos-${Date.now()}.zip`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
                showToast('Alle Videos heruntergeladen', 'success');
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
      </div>
      <DashboardFooter eventId={eventId} />
    </AppLayout>
  );
}
