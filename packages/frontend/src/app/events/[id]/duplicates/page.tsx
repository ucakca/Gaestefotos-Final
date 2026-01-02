'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Trash2, Star, StarOff, X, Check } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';
import { FullPageLoader } from '@/components/ui/FullPageLoader';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Photo {
  id: string;
  url?: string;
  uploadedBy?: string;
  qualityScore?: number;
  isBestInGroup: boolean;
  createdAt: string;
  guest?: {
    firstName: string;
    lastName: string;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

interface DuplicateGroup {
  groupId: string;
  photos: Photo[];
  bestPhoto: Photo;
  count: number;
}

export default function DuplicatesPage() {
  const params = useParams();
  const router = useRouter();
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
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
    loadDuplicates();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadDuplicates = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}/duplicates`);
      setDuplicateGroups(data.duplicateGroups || []);
    } catch (err: any) {
      if (err.response?.status === 403) {
        showToast('Nur der Gastgeber kann Duplikate sehen', 'error');
        router.back();
      } else {
        showToast('Fehler beim Laden der Duplikate', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const setBestPhoto = async (groupId: string, photoId: string) => {
    try {
      await api.post(`/events/${eventId}/duplicates/${groupId}/best`, { photoId });
      showToast('Beste Foto aktualisiert', 'success');
      loadDuplicates();
    } catch (err: any) {
      showToast('Fehler beim Aktualisieren', 'error');
    }
  };

  const deleteDuplicates = async (groupId: string, keepPhotoId?: string) => {
    const ok = await requestConfirm({
      title: 'Duplikate wirklich löschen?',
      description: 'Kann nicht rückgängig gemacht werden.',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
    });
    if (!ok) return;

    try {
      await api.delete(`/events/${eventId}/duplicates/${groupId}`, {
        data: { keepPhotoId },
      });
      showToast('Duplikate gelöscht', 'success');
      loadDuplicates();
      setSelectedGroup(null);
    } catch (err: any) {
      showToast('Fehler beim Löschen', 'error');
    }
  };

  if (loading) {
    return <FullPageLoader label="Laden..." />;
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/photos`}>
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

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-app-fg mb-2">
            Duplikat-Verwaltung
          </h1>
          <p className="text-app-muted">
            {event?.title} • {duplicateGroups.length} Duplikat-Gruppe{duplicateGroups.length !== 1 ? 'n' : ''} gefunden
          </p>
        </motion.div>

        {duplicateGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-app-bg border border-app-border mb-6">
              <Check className="w-10 h-10 text-[var(--status-success)]" />
            </div>
            <h2 className="text-2xl font-bold text-app-fg mb-2">Keine Duplikate gefunden</h2>
            <p className="text-app-muted">Alle Fotos sind einzigartig!</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {duplicateGroups.map((group, groupIndex) => (
              <motion.div
                key={group.groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="bg-app-card rounded-lg shadow-sm border border-app-border overflow-hidden"
              >
                <div className="p-4 bg-app-bg border-b border-app-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-app-fg">
                      Duplikat-Gruppe {groupIndex + 1}
                    </h3>
                    <p className="text-sm text-app-muted">
                      {group.count} ähnliche Foto{group.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedGroup(selectedGroup === group.groupId ? null : group.groupId)}
                    >
                      {selectedGroup === group.groupId ? 'Ausblenden' : 'Details'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteDuplicates(group.groupId, group.bestPhoto.id)}
                      className="gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Duplikate löschen
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedGroup === group.groupId && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                    >
                      {group.photos.map((photo, photoIndex) => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: photoIndex * 0.05 }}
                          className={`relative rounded-lg overflow-hidden border-2 ${
                            photo.isBestInGroup
                              ? 'border-[var(--status-success)] ring-2 ring-[var(--status-success)]/30'
                              : 'border-app-border'
                          }`}
                        >
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Foto"
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-app-bg flex items-center justify-center">
                              <span className="text-app-muted">Foto</span>
                            </div>
                          )}

                          {photo.isBestInGroup && (
                            <div className="absolute top-2 left-2 bg-[var(--status-success)] text-app-bg text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Bestes Foto
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 bg-app-fg/60 text-app-bg p-2 text-xs">
                            <div className="truncate">
                              {photo.uploadedBy || (photo.guest ? `${photo.guest.firstName} ${photo.guest.lastName}` : 'Unbekannt')}
                            </div>
                            {photo.qualityScore && (
                              <div className="text-app-bg/70">
                                Qualität: {photo.qualityScore.toFixed(1)}
                              </div>
                            )}
                          </div>

                          <div className="absolute top-2 right-2 flex gap-1">
                            {!photo.isBestInGroup && (
                              <IconButton
                                onClick={() => setBestPhoto(group.groupId, photo.id)}
                                icon={<StarOff className="w-4 h-4 text-app-muted" />}
                                variant="ghost"
                                size="sm"
                                aria-label="Als bestes Foto setzen"
                                title="Als bestes Foto setzen"
                                className="p-1.5 bg-app-card rounded-full shadow-md hover:bg-app-bg"
                              />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Best Photo Preview (always visible) */}
                <div className="p-4 border-t border-app-border">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      {group.bestPhoto.url ? (
                        <img
                          src={group.bestPhoto.url}
                          alt="Bestes Foto"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-app-bg flex items-center justify-center">
                          <span className="text-app-muted text-xs">Foto</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-[var(--status-success)]" />
                        <span className="font-medium text-app-fg">Beste Foto (wird Gästen angezeigt)</span>
                      </div>
                      <p className="text-sm text-app-muted">
                        {group.bestPhoto.uploadedBy || 
                         (group.bestPhoto.guest 
                           ? `${group.bestPhoto.guest.firstName} ${group.bestPhoto.guest.lastName}` 
                           : 'Unbekannt')}
                      </p>
                      {group.bestPhoto.qualityScore && (
                        <p className="text-xs text-app-muted">
                          Qualitäts-Score: {group.bestPhoto.qualityScore.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      </Dialog>

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}

