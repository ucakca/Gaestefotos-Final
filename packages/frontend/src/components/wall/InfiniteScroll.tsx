'use client';

import { motion, useAnimationFrame } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface FloatingPhoto {
  id: string;
  url: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  opacity: number;
  vx: number;
  vy: number;
  vr: number;
}

interface InfiniteScrollProps {
  photos: Array<{ id: string; url: string }>;
  density?: number;
}

export default function InfiniteScroll({ 
  photos, 
  density = 15 
}: InfiniteScrollProps) {
  const [floatingPhotos, setFloatingPhotos] = useState<FloatingPhoto[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
      
      // Initialize floating photos
      const initial: FloatingPhoto[] = Array.from({ length: density }, (_, i) => ({
        id: `${photos[i % photos.length]?.id}-${i}`,
        url: photos[i % photos.length]?.url || '',
        x: Math.random() * offsetWidth,
        y: Math.random() * offsetHeight,
        size: 150 + Math.random() * 200,
        rotation: (Math.random() - 0.5) * 30,
        opacity: 0.4 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.2 - Math.random() * 0.5,
        vr: (Math.random() - 0.5) * 0.1,
      }));
      setFloatingPhotos(initial);
    }
  }, [photos, density]);

  // Animation loop
  useAnimationFrame(() => {
    setFloatingPhotos(prev => prev.map(photo => {
      let newY = photo.y + photo.vy;
      let newX = photo.x + photo.vx;
      let newRotation = photo.rotation + photo.vr;

      // Wrap around vertically
      if (newY < -photo.size) {
        newY = dimensions.height + photo.size;
        newX = Math.random() * dimensions.width;
      }

      // Wrap around horizontally
      if (newX < -photo.size) newX = dimensions.width + photo.size;
      if (newX > dimensions.width + photo.size) newX = -photo.size;

      return {
        ...photo,
        x: newX,
        y: newY,
        rotation: newRotation,
      };
    }));
  });

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Particle effect background */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Floating Photos */}
      {floatingPhotos.map((photo) => (
        <motion.div
          key={photo.id}
          className="absolute rounded-lg overflow-hidden shadow-xl"
          style={{
            width: photo.size,
            height: photo.size * 0.75,
            x: photo.x,
            y: photo.y,
            rotate: photo.rotation,
            opacity: photo.opacity,
          }}
          whileHover={{ 
            scale: 1.05, 
            opacity: 0.9,
            zIndex: 100,
          }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <Image
            src={photo.url}
            alt=""
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </motion.div>
      ))}

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
    </div>
  );
}
