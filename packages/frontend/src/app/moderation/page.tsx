'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Photo, Event as EventType } from '@gaestefotos/shared';
import { Check, X, Trash2 } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ModerationPage() {
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

  const [pendingPhotos, setPendingPhotos] = useState<(Photo & { event: EventType })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadPendingPhotos();
  }, []);

  const loadPendingPhotos = async () => {
    try {
      // Get all events first
      const { data: eventsData } = await api.get('/events');
      const events = eventsData.events || [];

      // Get pending photos for each event
      const allPendingPhotos: (Photo & { event: EventType })[] = [];
      
      for (const event of events) {
        try {
          const { data: photosData } = await api.get(`/events/${event.id}/photos`, {
            params: { status: 'PENDING' },
          });
          
          const photos = photosData.photos || [];
          allPendingPhotos.push(
            ...photos.map((photo: Photo) => ({ ...photo, event }))
          );
        } catch (err) {
          // Fehler für einzelne Events ignorieren
        }
      }

      setPendingPhotos(allPendingPhotos);
    } catch (err) {
      console.error('Fehler beim Laden der Fotos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/approve`);
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      showToast('Foto freigegeben', 'success');
    } catch (err: any) {
      showToast(String(err.response?.data?.error || 'Unbekannter Fehler'), 'error');
    }
  };

  const handleReject = async (photoId: string) => {
    try {
      await api.post(`/photos/${photoId}/reject`);
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      showToast('Foto abgelehnt', 'success');
    } catch (err: any) {
      showToast(String(err.response?.data?.error || 'Unbekannter Fehler'), 'error');
    }
  };

  const handleDelete = async (photoId: string) => {
    const ok = await requestConfirm({
      title: 'Foto wirklich löschen?',
      description: 'Das Foto wird gelöscht und ist nicht mehr moderierbar.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.delete(`/photos/${photoId}`);
      setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
      showToast('Foto gelöscht', 'success');
    } catch (err: any) {
      showToast(String(err.response?.data?.error || 'Unbekannter Fehler'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
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

      <div className="min-h-screen bg-app-bg">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-app-fg mb-2">Foto-Moderation</h1>
          <p className="text-app-muted">
            {pendingPhotos.length} Foto{pendingPhotos.length !== 1 ? 's' : ''} wartet{pendingPhotos.length !== 1 ? 'en' : ''} auf Freigabe
          </p>
        </motion.div>

        {pendingPhotos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-app-card border border-app-border rounded-lg shadow p-12 text-center"
          >
            <p className="text-app-muted text-lg">🎉 Alle Fotos wurden moderiert!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Photo List */}
            <div className="lg:col-span-1 space-y-4">
              {pendingPhotos.map((photo, index) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`bg-app-card rounded-lg shadow cursor-pointer overflow-hidden border-2 transition-colors ${
                    selectedPhoto?.id === photo.id
                      ? 'border-tokens-brandGreen'
                      : 'border-transparent hover:border-app-border'
                  }`}
                >
                  <div className="aspect-square bg-app-bg relative">
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt="Moderation"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-app-muted">
                        Foto
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-[var(--status-warning)] text-app-bg text-xs px-2 py-1 rounded">
                      Ausstehend
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-app-fg truncate">
                      {photo.event.title}
                    </p>
                    <p className="text-xs text-app-muted">
                      {new Date(photo.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Photo Detail */}
            <div className="lg:col-span-2">
              {selectedPhoto ? (
                <motion.div
                  key={selectedPhoto.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-app-card border border-app-border rounded-lg shadow p-6"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">
                      {(selectedPhoto as any).event?.title || 'Foto'}
                    </h2>
                    <p className="text-sm text-app-muted">
                      Hochgeladen: {new Date(selectedPhoto.createdAt).toLocaleString('de-DE')}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="aspect-video bg-app-bg rounded-lg overflow-hidden mb-4">
                      {selectedPhoto.url ? (
                        <img
                          src={selectedPhoto.url}
                          alt="Foto"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-app-muted">
                          Foto
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(selectedPhoto.id)}
                      className="flex-1 px-6 py-3 bg-[var(--status-success)] text-app-bg rounded-lg hover:opacity-90 font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Freigeben
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleReject(selectedPhoto.id)}
                      className="flex-1 px-6 py-3 bg-[var(--status-danger)] text-app-bg rounded-lg hover:opacity-90 font-medium flex items-center justify-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Ablehnen
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(selectedPhoto.id)}
                      aria-label="Löschen"
                      title="Löschen"
                      className="px-6 py-3 bg-[var(--status-neutral)] text-app-bg rounded-lg hover:opacity-90 font-medium flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-app-card border border-app-border rounded-lg shadow p-12 text-center">
                  <p className="text-app-muted">Wähle ein Foto aus, um es zu moderieren</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </Dialog>
  );
}

