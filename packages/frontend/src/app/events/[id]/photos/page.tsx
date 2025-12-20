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
import ActionButton from '@/components/ActionButton';
import FilterButtons from '@/components/FilterButtons';
import UploadModal from '@/components/UploadModal';
import Link from 'next/link';

export default function PhotoManagementPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

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
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showPhotoActionsMenu, setShowPhotoActionsMenu] = useState(false);
  const [showPhotoMoveMenu, setShowPhotoMoveMenu] = useState(false);
  const [showUploaderMenu, setShowUploaderMenu] = useState(false);
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showActionsMenu && !(e.target as HTMLElement).closest('.actions-menu')) {
        setShowActionsMenu(false);
        setShowMoveMenu(false);
      }
      if (showPhotoActionsMenu && !(e.target as HTMLElement).closest('.photo-actions-menu')) {
        setShowPhotoActionsMenu(false);
        setShowPhotoMoveMenu(false);
      }
      // Close uploader menu when clicking outside
      if (showUploaderMenu) {
        setShowUploaderMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showActionsMenu, showPhotoActionsMenu]);

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
    if (!confirm('Foto endgültig löschen? (Kann nicht rückgängig gemacht werden)')) return;
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
    if (!confirm('Foto wirklich löschen? (30 Tage im Papierkorb)')) return;

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
    if (!confirm(`${selectedPhotos.size} Foto(s) wirklich ablehnen?`)) return;
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
    if (!confirm(`${selectedPhotos.size} Foto(s) wirklich löschen?`)) return;
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
      showToast('Fehler beim Download', 'error');
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

  if (loading && photos.length === 0) {
    return (
      <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/dashboard`}>
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
            <ActionButton
              icon={CheckSquare}
              label="Alle auswählen"
              onClick={() => selectAll()}
              disabled={viewMode === 'trash' || photos.length === 0}
            />
            <ActionButton
              icon={Square}
              label="Auswahl löschen"
              onClick={() => deselectAll()}
              disabled={viewMode === 'trash' || selectedPhotos.size === 0}
            />
            <ActionButton
              icon={Trash2}
              label={viewMode === 'trash' ? 'Zurück' : 'Papierkorb'}
              onClick={() => {
                setSelectedPhotos(new Set());
                setSelectedPhoto(null);
                setViewMode(viewMode === 'trash' ? 'active' : 'trash');
              }}
            />
            <ActionButton
              icon={Upload}
              label="Foto hochladen"
              onClick={() => setShowUploadModal(true)}
              disabled={viewMode === 'trash'}
            />
            <ActionButton
              icon={ScanFace}
              label="Finde meine eigenen Fotos"
              onClick={() => setShowFaceSearch(true)}
              disabled={viewMode === 'trash'}
            />
            <Link href={`/events/${eventId}/duplicates`} className="flex items-center justify-center gap-2 px-3 py-2 bg-[#295B4D] text-white rounded-lg hover:bg-[#204a3e] transition-colors whitespace-nowrap">
              <Copy className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Duplikate verwalten</span>
            </Link>
          </div>
        </PageHeader>

        {uploading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">Foto wird hochgeladen...</p>
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
            <div className="relative uploader-menu">
              <button
                onClick={() => setShowUploaderMenu(!showUploaderMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <span className="text-sm font-medium">
                  Hochgeladen von: {filter.startsWith('uploader-') 
                    ? uploaders.find(u => `uploader-${u}` === filter) || 'Alle Uploader'
                    : 'Alle Uploader'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUploaderMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showUploaderMenu && (
                <div 
                  className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50 max-h-[300px] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      if (filter.startsWith('uploader-')) {
                        setFilter('all');
                      } else {
                        setFilter('all-uploader');
                      }
                      setShowUploaderMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                      !filter.startsWith('uploader-') ? 'bg-gray-50 font-medium' : ''
                    }`}
                  >
                    Alle Uploader
                  </button>
                  {uploaders.map(uploader => (
                    <button
                      key={uploader}
                      onClick={() => {
                        setFilter(`uploader-${uploader}`);
                        setShowUploaderMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                        filter === `uploader-${uploader}` ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      {uploader}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Actions Menu - Right aligned */}
          <div className="relative actions-menu ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsMenu(!showActionsMenu);
                setShowMoveMenu(false);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={viewMode === 'trash'}
            >
              <MoreVertical className="w-5 h-5" />
              <span className="text-xs sm:text-sm font-medium">Aktionen</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showActionsMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] z-50">
                {selectedPhotos.size > 0 ? (
                  <>
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                      {selectedPhotos.size} Foto(s) ausgewählt
                    </div>
                    
                    {/* Verschieben */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoveMenu(!showMoveMenu);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          <span>Verschieben</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showMoveMenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showMoveMenu && (
                        <div className="bg-gray-50 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBulkMoveToAlbum(null);
                              setShowMoveMenu(false);
                              setShowActionsMenu(false);
                            }}
                            className="w-full px-4 py-2 pl-8 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Folder className="w-4 h-4" />
                            Kein Album
                          </button>
                          {categories.map((category) => (
                            <button
                              key={category.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBulkMoveToAlbum(category.id);
                                setShowMoveMenu(false);
                                setShowActionsMenu(false);
                              }}
                              className="w-full px-4 py-2 pl-8 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Folder className="w-4 h-4" />
                              {category.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {moderationRequired && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasPending = Array.from(selectedPhotos).some(id => {
                              const photo = photos.find(p => p.id === id);
                              return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                            });
                            if (hasPending) {
                              handleBulkApprove();
                              setShowActionsMenu(false);
                            }
                          }}
                          disabled={!Array.from(selectedPhotos).some(id => {
                            const photo = photos.find(p => p.id === id);
                            return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                          })}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <Check className="w-4 h-4" />
                          Freigeben
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const hasPending = Array.from(selectedPhotos).some(id => {
                              const photo = photos.find(p => p.id === id);
                              return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                            });
                            if (hasPending) {
                              handleBulkReject();
                              setShowActionsMenu(false);
                            }
                          }}
                          disabled={!Array.from(selectedPhotos).some(id => {
                            const photo = photos.find(p => p.id === id);
                            return (photo?.status as string)?.toLowerCase() === 'pending' || (photo?.status as string) === 'PENDING';
                          })}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <X className="w-4 h-4" />
                          Ablehnen
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkDownload();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Herunterladen
                    </button>
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBulkDelete();
                        setShowActionsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Löschen
                    </button>
                    
                    <div className="border-t border-gray-200 my-1"></div>
                  </>
                ) : null}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPhotos.size === photos.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                    setShowActionsMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectedPhotos.size === photos.length ? 'Auswahl aufheben' : 'Alle auswählen'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Modal */}
        <UploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          categories={categories}
          accept="image/*"
          title="Foto hochladen"
          showGuestbookOption={true}
        />

        {photos.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{viewMode === 'trash' ? 'Papierkorb ist leer' : 'Noch keine Fotos hochgeladen'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`relative bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
                  selectedPhotos.has(photo.id) ? 'ring-2 ring-[#295B4D] shadow-lg' : ''
                }`}
                onClick={(e) => {
                  if (viewMode === 'trash') return;
                  handlePhotoClick(photo, e);
                }}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="relative bg-gray-100 aspect-square">
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
                        ? 'bg-[#295B4D]' 
                        : 'bg-white bg-opacity-90 hover:bg-opacity-100'
                    }`}>
                      {selectedPhotos.has(photo.id) ? (
                        <CheckSquare className="w-4 h-4 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  </div>
                  )}

                  {viewMode === 'trash' && (
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(photo.id);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-[#295B4D] text-white rounded-md hover:bg-[#204a3e]"
                      >
                        Wiederherstellen
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePurge(photo.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Endgültig
                      </button>
                    </div>
                  )}
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt="Foto"
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onContextMenu={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  {((photo.status as string)?.toLowerCase() === 'pending' || (photo.status as string) === 'PENDING') && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      Ausstehend
                    </div>
                  )}
                  {((photo.status as string)?.toLowerCase() === 'rejected' || (photo.status as string) === 'REJECTED') && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                      Abgelehnt
                    </div>
                  )}

                  {viewMode === 'active' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStory(photo.id);
                      }}
                      disabled={togglingStoryPhotoId === photo.id}
                      className="absolute bottom-2 right-2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow disabled:opacity-50"
                      title={storiesByPhotoId[photo.id]?.isActive ? 'Story deaktivieren' : 'Als Story markieren'}
                    >
                      <Star
                        className={`w-4 h-4 ${storiesByPhotoId[photo.id]?.isActive ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}`}
                      />
                    </button>
                  )}
                </div>
                <div className="p-2 bg-gray-50 border-t">
                  <p className="text-xs text-gray-600 truncate">von {(photo as any).uploadedBy || 'Unbekannt'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Bulk Actions Bar removed - now handled by actions menu in header */}

        {/* Floating Action Button for ZIP Download */}
        {photos.length > 0 && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              try {
                const response = await api.get(`/events/${eventId}/download-zip`, {
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
                showToast('Fehler beim Download', 'error');
              }
            }}
            className="fixed bottom-24 right-6 w-14 h-14 bg-[#295B4D] text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-[#204a3e] transition-colors"
          >
            <FileDown className="w-6 h-6" />
          </motion.button>
        )}

        {/* Photo Detail Modal */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPhoto(null)}
              className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
              >
                <div className="mb-4 flex justify-between items-center sticky top-0 bg-white z-10 pb-2 border-b">
                  <h2 className="text-lg font-semibold">Foto-Details</h2>
                  <div className="flex items-center gap-2">
                    {/* Photo Actions Menu */}
                    <div className="relative photo-actions-menu">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPhotoActionsMenu(!showPhotoActionsMenu);
                          setShowPhotoMoveMenu(false);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                        <span className="text-sm font-medium">Aktionen</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showPhotoActionsMenu ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {showPhotoActionsMenu && (
                        <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[220px] z-50">
                          {/* Verschieben */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowPhotoMoveMenu(!showPhotoMoveMenu);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <Folder className="w-4 h-4" />
                                <span>Verschieben</span>
                              </div>
                              <ChevronDown className={`w-4 h-4 transition-transform ${showPhotoMoveMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showPhotoMoveMenu && (
                              <div className="bg-gray-50 border-t border-gray-200">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Move single photo
                                    const photoIds = [selectedPhoto.id];
                                    api.post('/photos/bulk/move-to-album', {
                                      photoIds,
                                      categoryId: null,
                                    }).then(() => {
                                      showToast('Foto verschoben', 'success');
                                      loadPhotos();
                                      setShowPhotoMoveMenu(false);
                                      setShowPhotoActionsMenu(false);
                                    });
                                  }}
                                  className="w-full px-4 py-2 pl-8 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Folder className="w-4 h-4" />
                                  Kein Album
                                </button>
                                {categories.map((category) => (
                                  <button
                                    key={category.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Move single photo
                                      const photoIds = [selectedPhoto.id];
                                      api.post('/photos/bulk/move-to-album', {
                                        photoIds,
                                        categoryId: category.id,
                                      }).then(() => {
                                        showToast('Foto verschoben', 'success');
                                        loadPhotos();
                                        setShowPhotoMoveMenu(false);
                                        setShowPhotoActionsMenu(false);
                                      });
                                    }}
                                    className="w-full px-4 py-2 pl-8 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Folder className="w-4 h-4" />
                                    {category.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhoto(selectedPhoto);
                              setSelectedPhoto(null);
                              setShowPhotoActionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Bearbeiten
                          </button>
                          
                          {moderationRequired && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if ((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') {
                                    handleApprove(selectedPhoto.id);
                                    setShowPhotoActionsMenu(false);
                                  }
                                }}
                                disabled={!((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                <Check className="w-4 h-4" />
                                Freigeben
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if ((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') {
                                    handleReject(selectedPhoto.id);
                                    setShowPhotoActionsMenu(false);
                                  }
                                }}
                                disabled={!((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                <X className="w-4 h-4" />
                                Ablehnen
                              </button>
                            </>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = selectedPhoto.url || '';
                              if (url) {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `foto-${selectedPhoto.id}.jpg`;
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                              }
                              setShowPhotoActionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            Herunterladen
                          </button>
                          
                          <div className="border-t border-gray-200 my-1"></div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(selectedPhoto.id);
                              setShowPhotoActionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-6 h-6" />
                    </button>
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
                      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">
                        {((selectedPhoto.status as string)?.toLowerCase() === 'pending' || (selectedPhoto.status as string) === 'PENDING') ? 'Ausstehend' : 
                         ((selectedPhoto.status as string)?.toLowerCase() === 'approved' || (selectedPhoto.status as string) === 'APPROVED') ? 'Freigegeben' : 
                         ((selectedPhoto.status as string)?.toLowerCase() === 'rejected' || (selectedPhoto.status as string) === 'REJECTED') ? 'Abgelehnt' : 
                         'Unbekannt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Hochgeladen von</p>
                      <p className="font-medium">
                        {(selectedPhoto as any).uploadedBy || 'Unbekannt'}
                      </p>
                    </div>
                    {(selectedPhoto as any).guest && (
                      <div>
                        <p className="text-sm text-gray-500">Gast</p>
                        <p className="font-medium">
                          {(selectedPhoto as any).guest?.firstName} {(selectedPhoto as any).guest?.lastName}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Hochgeladen</p>
                      <p className="font-medium">
                        {new Date(selectedPhoto.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>

                    <div className="pt-4">
                      <p className="text-sm text-gray-500 mb-2">Teilen & Download</p>
                      <div className="flex gap-2">
                        <a
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}/api/photos/${selectedPhoto.id}/download`}
                          download
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
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
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
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
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
                          >
                            <Check className="w-5 h-5" />
                            Freigeben
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReject(selectedPhoto.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
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
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
