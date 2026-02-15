'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { easings } from '@/hooks/useAnimation';
import Image from 'next/image';

interface CinematicFlowProps {
  photos: Array<{ id: string; url: string; caption?: string }>;
  autoplay?: boolean;
  duration?: number;
}

export default function CinematicFlow({ 
  photos, 
  autoplay = true, 
  duration = 6000 
}: CinematicFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!autoplay || photos.length <= 1) return;
    const interval = setInterval(nextSlide, duration);
    return () => clearInterval(interval);
  }, [autoplay, duration, photos.length, nextSlide]);

  const current = photos[currentIndex];
  const prev = photos[(currentIndex - 1 + photos.length) % photos.length];
  const next = photos[(currentIndex + 1) % photos.length];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* Background Layer - Blurred Previous */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 1.5 }}
      >
        <Image
          src={prev?.url || ''}
          alt=""
          fill
          className="object-cover blur-3xl scale-110"
        />
      </motion.div>

      {/* Main Photo with Ken Burns Effect */}
      <motion.div
        key={current.id}
        className="absolute inset-8 md:inset-16"
        initial={{ 
          opacity: 0, 
          scale: 1.1,
          filter: 'blur(10px)'
        }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          filter: 'blur(0px)',
          x: [0, 20, 0],
          y: [0, -10, 0],
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.95,
          filter: 'blur(5px)'
        }}
        transition={{
          opacity: { duration: 1.2, ease: easings.cinematic },
          scale: { duration: 8, ease: 'linear' },
          filter: { duration: 0.8 },
          x: { duration: 8, ease: 'easeInOut' },
          y: { duration: 6, ease: 'easeInOut' },
        }}
      >
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
          <Image
            src={current.url}
            alt={current.caption || ''}
            fill
            className="object-cover"
            priority
          />
          
          {/* Depth of Field Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          
          {/* Caption */}
          {current.caption && (
            <motion.div
              className="absolute bottom-8 left-8 right-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: easings.cinematic }}
            >
              <p className="text-white text-xl md:text-2xl font-light tracking-wide drop-shadow-lg">
                {current.caption}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Parallax Side Photos */}
      <motion.div
        className="absolute left-4 top-1/2 -translate-y-1/2 w-32 h-48 opacity-40"
        animate={{ x: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src={prev?.url || ''}
          alt=""
          fill
          className="object-cover rounded-lg"
        />
      </motion.div>

      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-48 opacity-40"
        animate={{ x: [5, -5, 5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <Image
          src={next?.url || ''}
          alt=""
          fill
          className="object-cover rounded-lg"
        />
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <motion.div
          className="h-full bg-white/80"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          key={currentIndex}
        />
      </div>

      {/* Film Grain Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
