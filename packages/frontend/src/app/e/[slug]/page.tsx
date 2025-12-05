'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import PhotoUpload from '@/components/PhotoUpload';
import Gallery from '@/components/Gallery';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import Link from 'next/link';
import MapsLink from '@/components/MapsLink';

export default function PublicEventPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery'>('upload');

  useEffect(() => {
    loadEvent();
  }, [slug]);

  useEffect(() => {
    if (event?.id) {
      loadPhotos();
    }
  }, [event?.id]);

  const loadEvent = async () => {
    try {
      const { data } = await api.get(`/events/slug/${slug}`);
      setEvent(data.event);
    } catch (err: any) {
      setError('Event nicht gefunden');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!event?.id) return;
    
    try {
      const { data } = await api.get(`/events/${event.id}/photos`, {
        params: { status: 'APPROVED' },
      });
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Error loading photos:', err);
    }
  };

  // Realtime updates
  const realtimePhotos = useEventRealtime(event?.id || '', photos);

  useEffect(() => {
    setPhotos(realtimePhotos);
  }, [realtimePhotos]);

  const handleUploadSuccess = () => {
    loadPhotos();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Laden...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || 'Event nicht gefunden'}</div>
      </div>
    );
  }

  const featuresConfig = event.featuresConfig as any;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow"
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          {event.dateTime && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 mt-2"
            >
              {new Date(event.dateTime).toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </motion.p>
          )}
          {event.locationName && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 flex-wrap"
            >
              <p className="text-gray-600">
                📍 {event.locationName}
              </p>
              <MapsLink address={event.locationName} />
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 flex gap-4"
          >
            <Link
              href={`/live/${slug}/camera`}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              📷 Kamera
            </Link>
            <Link
              href={`/live/${slug}/wall`}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
            >
              🖼️ Live Wall
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'upload'
                  ? 'text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Foto hochladen
              {activeTab === 'upload' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('gallery')}
              className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                activeTab === 'gallery'
                  ? 'text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Galerie ({photos.length})
              {activeTab === 'gallery' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          </nav>
        </div>

        {/* Upload Tab */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'upload' ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === 'upload' ? -20 : 20 }}
        >
          {activeTab === 'upload' && featuresConfig?.allowUploads && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-semibold mb-6">Fotos hochladen</h2>
              <PhotoUpload eventId={event.id} onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div>
              {featuresConfig?.mysteryMode ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg shadow p-12 text-center"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-6xl mb-4"
                  >
                    🎭
                  </motion.div>
                  <p className="text-xl text-gray-600 mb-4 font-semibold">
                    Mystery Mode aktiviert
                  </p>
                  <p className="text-gray-500">
                    Die Fotos werden später veröffentlicht...
                  </p>
                </motion.div>
              ) : (
                <Gallery photos={photos} />
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

