'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Event as EventType, Photo } from '@gaestefotos/shared';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import QRCode from '@/components/QRCode';

export default function LiveWallPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<EventType | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'slideshow'>('grid');
  const [currentSlide, setCurrentSlide] = useState(0);

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
    } catch (err) {
      // Error handling
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

  // Slideshow auto-advance
  useEffect(() => {
    if (viewMode === 'slideshow' && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % photos.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [viewMode, photos.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-lg">Laden...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Event nicht gefunden</div>
      </div>
    );
  }

  const publicUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/e/${slug}?source=qr`
    : '';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'slideshow' : 'grid')}
            className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30"
          >
            {viewMode === 'grid' ? 'Slideshow' : 'Grid'}
          </button>
          
          {/* QR Code */}
          <div className="hidden lg:block">
            <QRCode value={publicUrl} size={80} />
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="pt-20 px-4 pb-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {photos.map((photo, index) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                className="aspect-square bg-gray-800 rounded overflow-hidden"
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt="Event Foto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    Foto
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            {photos.length > 0 && (
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.5 }}
                className="max-w-7xl mx-auto px-4"
              >
                <img
                  src={photos[currentSlide]?.url || ''}
                  alt="Event Foto"
                  className="max-w-full max-h-screen object-contain"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {photos.length === 0 && (
            <div className="text-center">
              <p className="text-2xl text-gray-400">Noch keine Fotos</p>
            </div>
          )}

          {/* Photo Counter */}
          {photos.length > 0 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 px-4 py-2 rounded">
              {currentSlide + 1} / {photos.length}
            </div>
          )}
        </div>
      )}

      {/* QR Code Mobile */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <QRCode value={publicUrl} size={100} />
      </div>
    </div>
  );
}

