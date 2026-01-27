'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Photo } from '@gaestefotos/shared';
import { useInView } from 'react-intersection-observer';
import { PhotoGridSkeleton } from '@/components/ui/Skeleton';
import Gallery from './Gallery';

interface InfiniteScrollGalleryProps {
  eventId: string;
  initialPhotos: Photo[];
  totalCount: number;
  allowDownloads?: boolean;
  eventSlug?: string;
  pageSize?: number;
  fetchPhotos: (offset: number, limit: number) => Promise<Photo[]>;
}

export default function InfiniteScrollGallery({
  eventId,
  initialPhotos,
  totalCount,
  allowDownloads = true,
  eventSlug,
  pageSize = 24,
  fetchPhotos,
}: InfiniteScrollGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialPhotos.length < totalCount);
  
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false,
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    try {
      setLoading(true);
      const offset = photos.length;
      const newPhotos = await fetchPhotos(offset, pageSize);
      
      setPhotos((prev) => [...prev, ...newPhotos]);
      setHasMore(photos.length + newPhotos.length < totalCount);
    } catch (error) {
      console.error('Failed to load more photos:', error);
    } finally {
      setLoading(false);
    }
  }, [photos.length, loading, hasMore, totalCount, pageSize, fetchPhotos]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView, hasMore, loading, loadMore]);

  return (
    <div>
      <Gallery
        photos={photos}
        allowDownloads={allowDownloads}
        eventSlug={eventSlug}
      />

      {/* Loading Trigger */}
      {hasMore && (
        <div ref={ref} className="py-8">
          {loading && <PhotoGridSkeleton count={8} />}
        </div>
      )}

      {/* End Message */}
      {!hasMore && photos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8 text-app-muted text-sm"
        >
          Alle {photos.length} Fotos geladen
        </motion.div>
      )}
    </div>
  );
}
