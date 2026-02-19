'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Film, Loader2, Download, X, Plus, Image as ImageIcon, Play, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useToastStore } from '@/store/toastStore';

const JOB_TYPES = [
  { value: 'GIF', label: 'GIF Animation', description: 'Animiertes GIF aus mehreren Fotos', icon: '🎞️' },
  { value: 'BOOMERANG', label: 'Boomerang', description: 'Vor- und rückwärts loopende Animation', icon: '🔄' },
  { value: 'VIDEO', label: 'Slideshow-Video', description: 'MP4 Video-Diashow', icon: '🎬' },
] as const;

const STATUS_ICONS: Record<string, React.ReactNode> = {
  QUEUED:     <Clock className="w-4 h-4 text-amber-500" />,
  PROCESSING: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  COMPLETED:  <CheckCircle className="w-4 h-4 text-green-500" />,
  FAILED:     <XCircle className="w-4 h-4 text-red-500" />,
  CANCELLED:  <X className="w-4 h-4 text-muted-foreground" />,
};

export default function VideoJobsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id as string;
  const { showToast } = useToastStore();

  const [photos, setPhotos] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [jobType, setJobType] = useState<'GIF' | 'BOOMERANG' | 'VIDEO'>('GIF');
  const [fps, setFps] = useState(8);
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}/photos?limit=100&status=APPROVED`);
      setPhotos(res.data?.photos || []);
    } catch { /* ignore */ }
    finally { setLoadingPhotos(false); }
  }, [eventId]);

  const loadJobs = useCallback(async () => {
    try {
      const res = await api.get(`/events/${eventId}/video-jobs`);
      setJobs(res.data?.jobs || []);
    } catch { /* ignore */ }
    finally { setLoadingJobs(false); }
  }, [eventId]);

  useEffect(() => { loadPhotos(); loadJobs(); }, [loadPhotos, loadJobs]);

  const togglePhoto = (id: string) => {
    setSelectedPhotoIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedPhotoIds.length < 2) {
      showToast('Bitte mindestens 2 Fotos auswählen', 'error');
      return;
    }
    setCreating(true);
    try {
      await api.post(`/events/${eventId}/video-jobs`, {
        type: jobType,
        photoIds: selectedPhotoIds,
        fps: jobType !== 'VIDEO' ? fps : undefined,
        quality,
      });
      showToast('Job gestartet!', 'success');
      setSelectedPhotoIds([]);
      loadJobs();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Fehler beim Erstellen', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (jobId: string) => {
    try {
      const res = await api.get(`/video-jobs/${jobId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job_${jobId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download fehlgeschlagen', 'error');
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await api.post(`/video-jobs/${jobId}/cancel`);
      showToast('Job abgebrochen', 'success');
      loadJobs();
    } catch {
      showToast('Abbrechen fehlgeschlagen', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Film className="w-5 h-5 text-rose-500" /> Video & GIF Jobs
            </h1>
            <p className="text-sm text-muted-foreground">GIF, Boomerang oder Video aus Event-Fotos erstellen</p>
          </div>
        </div>

        {/* Create Job */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Neuen Job erstellen</h2>

          {/* Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            {JOB_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setJobType(t.value)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  jobType === t.value ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20' : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Settings */}
          <div className="flex gap-4">
            {jobType !== 'VIDEO' && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">FPS</label>
                <select
                  value={fps}
                  onChange={e => setFps(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                >
                  {[4, 6, 8, 10, 12, 15, 24].map(f => <option key={f} value={f}>{f} fps</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Qualität</label>
              <select
                value={quality}
                onChange={e => setQuality(e.target.value as any)}
                className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
              >
                <option value="low">Niedrig (klein)</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch (groß)</option>
              </select>
            </div>
          </div>

          {/* Photo selection info */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {selectedPhotoIds.length} Fotos ausgewählt
              {selectedPhotoIds.length < 2 && ' (mindestens 2 benötigt)'}
            </span>
            <button
              onClick={handleCreate}
              disabled={creating || selectedPhotoIds.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Job erstellen
            </button>
          </div>
        </div>

        {/* Photo Grid */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Fotos auswählen
          </h2>
          {loadingPhotos ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : photos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine freigegebenen Fotos vorhanden</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => togglePhoto(photo.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedPhotoIds.includes(photo.id) ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-transparent'
                  }`}
                >
                  <img src={photo.thumbnailUrl || photo.url} alt="" className="w-full h-full object-cover" />
                  {selectedPhotoIds.includes(photo.id) && (
                    <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                      <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {selectedPhotoIds.indexOf(photo.id) + 1}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Jobs List */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Play className="w-4 h-4" /> Bisherige Jobs</span>
            <button onClick={loadJobs} className="text-xs text-muted-foreground hover:text-foreground">
              Aktualisieren
            </button>
          </h2>
          {loadingJobs ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Noch keine Jobs erstellt</p>
          ) : (
            <div className="divide-y divide-border/40">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex items-center gap-3 py-3">
                  {STATUS_ICONS[job.status] || STATUS_ICONS.QUEUED}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{job.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.photoCount} Fotos · {new Date(job.createdAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {job.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleDownload(job.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-lg transition-colors"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    )}
                    {(job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-muted text-muted-foreground hover:bg-muted/80 rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" /> Abbrechen
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
