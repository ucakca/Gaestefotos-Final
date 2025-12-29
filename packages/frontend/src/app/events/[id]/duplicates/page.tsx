'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType } from '@gaestefotos/shared';
import { Trash2, Star, StarOff, X, Check } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';
import DashboardFooter from '@/components/DashboardFooter';
import AppLayout from '@/components/AppLayout';

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
    if (!confirm('Möchtest du wirklich die Duplikate löschen?')) return;

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <AppLayout showBackButton backUrl={`/events/${eventId}/photos`}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Duplikat-Verwaltung
          </h1>
          <p className="text-gray-600">
            {event?.title} • {duplicateGroups.length} Duplikat-Gruppe{duplicateGroups.length !== 1 ? 'n' : ''} gefunden
          </p>
        </motion.div>

        {duplicateGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Keine Duplikate gefunden</h2>
            <p className="text-gray-600">Alle Fotos sind einzigartig!</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {duplicateGroups.map((group, groupIndex) => (
              <motion.div
                key={group.groupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.05 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Duplikat-Gruppe {groupIndex + 1}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {group.count} ähnliche Foto{group.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedGroup(selectedGroup === group.groupId ? null : group.groupId)}
                      className="px-3 py-1.5 text-sm bg-[#295B4D] text-white rounded-md hover:bg-[#1f4238]"
                    >
                      {selectedGroup === group.groupId ? 'Ausblenden' : 'Details'}
                    </button>
                    <button
                      onClick={() => deleteDuplicates(group.groupId, group.bestPhoto.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Duplikate löschen
                    </button>
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
                              ? 'border-green-500 ring-2 ring-green-200'
                              : 'border-gray-200'
                          }`}
                        >
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt="Foto"
                              className="w-full aspect-square object-cover"
                            />
                          ) : (
                            <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400">Foto</span>
                            </div>
                          )}

                          {photo.isBestInGroup && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Bestes Foto
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white p-2 text-xs">
                            <div className="truncate">
                              {photo.uploadedBy || (photo.guest ? `${photo.guest.firstName} ${photo.guest.lastName}` : 'Unbekannt')}
                            </div>
                            {photo.qualityScore && (
                              <div className="text-gray-300">
                                Qualität: {photo.qualityScore.toFixed(1)}
                              </div>
                            )}
                          </div>

                          <div className="absolute top-2 right-2 flex gap-1">
                            {!photo.isBestInGroup && (
                              <button
                                onClick={() => setBestPhoto(group.groupId, photo.id)}
                                className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100"
                                title="Als bestes Foto setzen"
                              >
                                <StarOff className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Best Photo Preview (always visible) */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      {group.bestPhoto.url ? (
                        <img
                          src={group.bestPhoto.url}
                          alt="Bestes Foto"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Foto</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-gray-900">Beste Foto (wird Gästen angezeigt)</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {group.bestPhoto.uploadedBy || 
                         (group.bestPhoto.guest 
                           ? `${group.bestPhoto.guest.firstName} ${group.bestPhoto.guest.lastName}` 
                           : 'Unbekannt')}
                      </p>
                      {group.bestPhoto.qualityScore && (
                        <p className="text-xs text-gray-500">
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

      {/* Sticky Footer Navigation */}
      <DashboardFooter eventId={eventId} />
      
      {/* Padding for footer */}
      <div className="h-20" />
    </AppLayout>
  );
}


