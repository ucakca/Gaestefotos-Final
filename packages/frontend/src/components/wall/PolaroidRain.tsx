'use client';

import { motion, useAnimationFrame } from 'framer-motion';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';

interface PhotoItem {
  id: string;
  url: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  velocity: number;
}

interface PolaroidRainProps {
  photos: Array<{ id: string; url: string }>;
  autoDropInterval?: number;
}

export default function PolaroidRain({ 
  photos, 
  autoDropInterval = 2000 
}: PolaroidRainProps) {
  const [fallingPhotos, setFallingPhotos] = useState<PhotoItem[]>([]);
  const [stackedPhotos, setStackedPhotos] = useState<PhotoItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const photoIndexRef = useRef(0);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      });
    }
  }, []);

  const createFallingPhoto = useCallback(() => {
    if (photos.length === 0) return;
    
    const photo = photos[photoIndexRef.current % photos.length];
    photoIndexRef.current++;

    const newPhoto: PhotoItem = {
      id: `${photo.id}-${Date.now()}`,
      url: photo.url,
      x: Math.random() * (dimensions.width - 200) + 100,
      y: -250,
      rotation: (Math.random() - 0.5) * 30,
      scale: 0.8 + Math.random() * 0.4,
      velocity: 2 + Math.random() * 3,
    };

    setFallingPhotos((prev) => [...prev, newPhoto]);
  }, [photos, dimensions]);

  // Auto-drop photos
  useEffect(() => {
    const interval = setInterval(createFallingPhoto, autoDropInterval);
    return () => clearInterval(interval);
  }, [createFallingPhoto, autoDropInterval]);

  // Physics animation
  useAnimationFrame(() => {
    setFallingPhotos((prev) => {
      const updated = prev.map((photo) => ({
        ...photo,
        y: photo.y + photo.velocity,
        rotation: photo.rotation + Math.sin(photo.y / 100) * 0.5,
      }));

      // Check for landing
      const landed: PhotoItem[] = [];
      const stillFalling: PhotoItem[] = [];

      updated.forEach((photo) => {
        const groundLevel = dimensions.height - 150 - stackedPhotos.length * 2;
        if (photo.y >= groundLevel) {
          landed.push({
            ...photo,
            y: groundLevel + (Math.random() - 0.5) * 20,
            rotation: photo.rotation + (Math.random() - 0.5) * 10,
          });
        } else {
          stillFalling.push(photo);
        }
      });

      if (landed.length > 0) {
        setStackedPhotos((stack) => [...stack, ...landed].slice(-20));
      }

      return stillFalling;
    });
  });

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200"
    >
      {/* Stacked Photos at Bottom */}
      {stackedPhotos.map((photo, index) => (
        <motion.div
          key={photo.id}
          className="absolute w-48 h-56 bg-white p-2 shadow-xl rounded-sm"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            x: photo.x,
            y: photo.y,
            rotate: photo.rotation,
            scale: photo.scale,
            opacity: 1,
            zIndex: index,
          }}
          transition={{ 
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          style={{
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="relative w-full h-40 overflow-hidden">
            <Image
              src={photo.url}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="h-12 bg-white flex items-center justify-center">
            <div className="w-16 h-1 bg-slate-200 rounded-full" />
          </div>
        </motion.div>
      ))}

      {/* Falling Photos */}
      {fallingPhotos.map((photo) => (
        <motion.div
          key={photo.id}
          className="absolute w-48 h-56 bg-white p-2 shadow-lg rounded-sm pointer-events-none"
          style={{
            x: photo.x,
            y: photo.y,
            rotate: photo.rotation,
            scale: photo.scale,
          }}
        >
          <div className="relative w-full h-40 overflow-hidden">
            <Image
              src={photo.url}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="h-12 bg-white" />
        </motion.div>
      ))}

      {/* Ground Line */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-slate-300 to-transparent" />
    </div>
  );
}
