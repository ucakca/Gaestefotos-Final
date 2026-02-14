'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Image, Download, Trash2, Loader2, RefreshCw,
  ChevronLeft, ChevronRight, HardDrive, Camera, Video,
  Eye, X, Check, XCircle, Filter, Grid, List,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Photo {
  id: string;
  eventId: string;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  originalUrl: string | null;
  fileSize: number | null;
  fileSizeMB: number | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  status: string;
  source: string | null;
  uploadedBy: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
}

interface StorageStats {
  totalPhotos: number;
  totalVideos: number;
  photoSizeBytes: number;
  videoSizeBytes: number;
  totalSizeBytes: number;
  totalSizeMB: number;
}

interface EventInfo {
  id: string;
  title: string;
  slug: string | null;
}

export default function EventPhotosPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const limit = 50;

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get(`/admin/photos/storage-stats/${eventId}`);
      setStats(res.data.stats);
      if (res.data.event) setEvent(res.data.event);
    } catch {
      // silent
    }
  }, [eventId]);

  const loadPhotos = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const params: any = { limit, offset };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get(`/admin/photos/event/${eventId}`, { params });
      setPhotos(res.data.photos || []);
      setTotal(res.data.total || 0);
      if (res.data.event) setEvent(res.data.event);
    } catch (err: any) {
      toast.error('Fehler beim Laden der Fotos');
    } finally {
      setLoading(false);
    }
  }, [eventId, offset, statusFilter]);

  useEffect(() => {
    loadStats();
    loadPhotos();
  }, [loadStats, loadPhotos]);

  const handleDownload = async (photo: Photo) => {
    setDownloading(photo.id);
    try {
      const res = await api.get(`/admin/photos/${photo.id}/download`);
      if (res.data.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      }
    } catch {
      toast.error('Download fehlgeschlagen');
    } finally {
      setDownloading(null);
    }
  };

  const toggleSelect = (photoId: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const handleBulkModerate = async (approve: boolean) => {
    if (selectedPhotos.size === 0) return;
    setBulkAction(true);
    try {
      await api.post('/admin/photos/bulk-moderate', {
        photoIds: Array.from(selectedPhotos),
        isApproved: approve,
      });
      toast.success(`${selectedPhotos.size} Fotos ${approve ? 'freigegeben' : 'abgelehnt'}`);
      setSelectedPhotos(new Set());
      loadPhotos();
    } catch {
      toast.error('Fehler bei der Moderation');
    } finally {
      setBulkAction(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`${selectedPhotos.size} Fotos wirklich löschen?`)) return;
    setBulkAction(true);
    try {
      await api.delete('/admin/photos/bulk-delete', {
        data: { photoIds: Array.from(selectedPhotos) },
      });
      toast.success(`${selectedPhotos.size} Fotos gelöscht`);
      setSelectedPhotos(new Set());
      loadPhotos();
      loadStats();
    } catch {
      toast.error('Fehler beim Löschen');
    } finally {
      setBulkAction(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/manage/events/${eventId}`)}
          className="p-2 rounded-lg hover:bg-app-bg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-app-muted" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-app-fg">
            {event?.title || 'Event'} — Fotos
          </h1>
          <p className="text-sm text-app-muted">
            Storage-Verwaltung & Foto-Browser
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { loadStats(); loadPhotos(); }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Storage Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={Camera}
            label="Fotos"
            value={stats.totalPhotos.toLocaleString()}
            sub={formatBytes(stats.photoSizeBytes)}
            color="blue"
          />
          <StatCard
            icon={Video}
            label="Videos"
            value={stats.totalVideos.toLocaleString()}
            sub={formatBytes(stats.videoSizeBytes)}
            color="purple"
          />
          <StatCard
            icon={HardDrive}
            label="Gesamt"
            value={formatBytes(stats.totalSizeBytes)}
            sub={`${stats.totalPhotos + stats.totalVideos} Dateien`}
            color="green"
          />
          <StatCard
            icon={Image}
            label="Seite"
            value={`${currentPage} / ${totalPages || 1}`}
            sub={`${total} Fotos gefunden`}
            color="amber"
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-app-border bg-app-card">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-app-muted" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="px-3 py-1.5 rounded-lg border border-app-border bg-app-bg text-app-fg text-sm"
          >
            <option value="">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="approved">Freigegeben</option>
            <option value="rejected">Abgelehnt</option>
          </select>
        </div>

        {/* View Mode */}
        <div className="flex items-center border border-app-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-app-accent text-white' : 'bg-app-bg text-app-muted'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Selection Actions */}
        {selectedPhotos.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-app-muted">{selectedPhotos.size} ausgewählt</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkModerate(true)} disabled={bulkAction}>
              <Check className="w-4 h-4 mr-1" /> Freigeben
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkModerate(false)} disabled={bulkAction}>
              <XCircle className="w-4 h-4 mr-1" /> Ablehnen
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={bulkAction} className="text-red-500 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-1" /> Löschen
            </Button>
          </div>
        )}

        {/* Select All */}
        <Button size="sm" variant="outline" onClick={selectAll}>
          {selectedPhotos.size === photos.length && photos.length > 0 ? 'Keine' : 'Alle'} auswählen
        </Button>
      </div>

      {/* Photo Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-app-accent" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-app-muted">
          <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Keine Fotos gefunden</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                selectedPhotos.has(photo.id) ? 'border-app-accent ring-2 ring-app-accent/30' : 'border-transparent'
              }`}
            >
              {photo.thumbnailUrl ? (
                <img
                  src={photo.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onClick={() => setViewPhoto(photo)}
                />
              ) : (
                <div className="w-full h-full bg-app-bg flex items-center justify-center">
                  <Image className="w-8 h-8 text-app-muted" />
                </div>
              )}

              {/* Selection checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(photo.id); }}
                className={`absolute top-1 left-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedPhotos.has(photo.id)
                    ? 'bg-app-accent text-white'
                    : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                }`}
              >
                {selectedPhotos.has(photo.id) && <Check className="w-4 h-4" />}
              </button>

              {/* Status badge */}
              <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                photo.status === 'APPROVED' ? 'bg-green-500' :
                photo.status === 'REJECTED' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setViewPhoto(photo)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                >
                  <Eye className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => handleDownload(photo)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30"
                  disabled={downloading === photo.id}
                >
                  {downloading === photo.id ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                selectedPhotos.has(photo.id) ? 'border-app-accent bg-app-accent/5' : 'border-app-border bg-app-card'
              }`}
            >
              <button
                onClick={() => toggleSelect(photo.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  selectedPhotos.has(photo.id) ? 'bg-app-accent text-white' : 'bg-app-bg border border-app-border'
                }`}
              >
                {selectedPhotos.has(photo.id) && <Check className="w-4 h-4" />}
              </button>

              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-app-bg">
                {photo.thumbnailUrl ? (
                  <img src={photo.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-6 h-6 text-app-muted" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-app-fg truncate">
                  {photo.id.slice(0, 8)}...
                </div>
                <div className="text-xs text-app-muted">
                  {photo.width}×{photo.height} • {photo.fileSizeMB || '?'} MB • {photo.source || 'Upload'}
                </div>
                <div className="text-xs text-app-muted">
                  {new Date(photo.createdAt).toLocaleString('de-DE')}
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                photo.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                photo.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-600'
              }`}>
                {photo.status}
              </span>

              <div className="flex items-center gap-1">
                <button onClick={() => setViewPhoto(photo)} className="p-2 rounded-lg hover:bg-app-bg">
                  <Eye className="w-4 h-4 text-app-muted" />
                </button>
                <button
                  onClick={() => handleDownload(photo)}
                  className="p-2 rounded-lg hover:bg-app-bg"
                  disabled={downloading === photo.id}
                >
                  {downloading === photo.id ? (
                    <Loader2 className="w-4 h-4 text-app-muted animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-app-muted" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4">
          <Button
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
          </Button>
          <span className="text-sm text-app-muted">
            Seite {currentPage} von {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
          >
            Weiter <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Photo Lightbox */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setViewPhoto(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div
            className="max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={viewPhoto.mediumUrl || viewPhoto.originalUrl || viewPhoto.thumbnailUrl || ''}
              alt=""
              className="max-h-[70vh] object-contain rounded-lg"
            />
            <div className="mt-4 p-4 bg-white/10 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono">{viewPhoto.id}</p>
                  <p className="text-xs text-white/70">
                    {viewPhoto.width}×{viewPhoto.height} • {viewPhoto.fileSizeMB} MB • {viewPhoto.mimeType}
                  </p>
                  <p className="text-xs text-white/70">
                    {new Date(viewPhoto.createdAt).toLocaleString('de-DE')} • {viewPhoto.source || 'Upload'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleDownload(viewPhoto)}
                  disabled={downloading === viewPhoto.id}
                >
                  {downloading === viewPhoto.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  Original herunterladen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-lg font-bold text-app-fg">{value}</p>
          <p className="text-xs text-app-muted">{label}</p>
          <p className="text-xs text-app-muted">{sub}</p>
        </div>
      </div>
    </div>
  );
}
