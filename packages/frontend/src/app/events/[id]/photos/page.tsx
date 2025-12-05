'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Photo, Event as EventType } from '@gaestefotos/shared';
import { Check, X, Trash2, Eye } from 'lucide-react';
import { useToastStore } from '@/store/toastStore';

export default function PhotoManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { showToast } = useToastStore();

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadEvent();
    loadPhotos();
  }, [eventId, filter]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/${eventId}`);
      setEvent(data.event);
    } catch (err) {
      console.error('Fehler beim Laden des Events:', err);
    }
  };

  const loadPhotos = async () => {
    try {
      const params: any = {};
      if (filter !== 'all') {
        params.status = filter.toUpperCase();
      }

      const { data } = await api.get(`/events/${eventId}/photos`, { params });
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Fehler beim Laden der Fotos:', err);
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
    if (!confirm('Foto wirklich löschen?')) return;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  const filteredPhotos = photos;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="text-primary-600 hover:text-primary-500 mb-4"
          >
            ← Zurück
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Foto-Verwaltung: {event?.title}
          </h1>
        </motion.div>

        {/* Filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex gap-2"
        >
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md font-medium ${
                filter === f
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'pending' ? 'Wartend' : f === 'approved' ? 'Freigegeben' : 'Abgelehnt'}
            </motion.button>
          ))}
        </motion.div>

        {/* Photos Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, index) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedPhoto(photo)}
              className={`bg-white rounded-lg shadow cursor-pointer overflow-hidden border-2 transition-colors ${
                selectedPhoto?.id === photo.id
                  ? 'border-primary-500'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <div className="aspect-square bg-gray-200 relative">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt="Foto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Foto
                  </div>
                )}
                <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${
                  photo.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                  photo.status === 'APPROVED' ? 'bg-green-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {photo.status === 'PENDING' ? 'Ausstehend' : photo.status === 'APPROVED' ? 'Freigegeben' : 'Abgelehnt'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredPhotos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Keine Fotos gefunden</p>
          </div>
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
                className="bg-white rounded-lg max-w-4xl w-full p-6"
              >
                <div className="mb-4">
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {selectedPhoto.url ? (
                      <img
                        src={selectedPhoto.url}
                        alt="Foto"
                        className="w-full rounded-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                        Foto
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium">
                        {selectedPhoto.status === 'PENDING' ? 'Ausstehend' : selectedPhoto.status === 'APPROVED' ? 'Freigegeben' : 'Abgelehnt'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Hochgeladen</p>
                      <p className="font-medium">
                        {new Date(selectedPhoto.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {selectedPhoto.status === 'PENDING' && (
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
      </div>
    </div>
  );
}

