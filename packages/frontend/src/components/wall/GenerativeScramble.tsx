'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface ScrambleTile {
  id: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  photoId: string;
  photoUrl: string;
}

interface GenerativeScrambleProps {
  photos: Array<{ id: string; url: string }>;
  scrambleInterval?: number;
}

const GRID_SIZE = 6;
const TILE_SIZE = 100;

export default function GenerativeScramble({ 
  photos, 
  scrambleInterval = 6000 
}: GenerativeScrambleProps) {
  const [tiles, setTiles] = useState<ScrambleTile[]>([]);
  const [isScrambling, setIsScrambling] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const createTiles = useCallback((photoUrl: string, photoId: string): ScrambleTile[] => {
    return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      id: `${photoId}-${i}`,
      x: (i % GRID_SIZE) * TILE_SIZE,
      y: Math.floor(i / GRID_SIZE) * TILE_SIZE,
      rotation: 0,
      scale: 1,
      photoId,
      photoUrl,
    }));
  }, []);

  const scramble = useCallback(() => {
    if (photos.length < 2) return;
    
    setIsScrambling(true);
    
    // Phase 1: Explode tiles
    setTiles(prev => prev.map(tile => ({
      ...tile,
      x: tile.x + (Math.random() - 0.5) * 400,
      y: tile.y + (Math.random() - 0.5) * 400,
      rotation: (Math.random() - 0.5) * 90,
      scale: 0.5 + Math.random() * 0.5,
    })));

    // Phase 2: Switch photo and reassemble
    setTimeout(() => {
      const nextIndex = (currentPhotoIndex + 1) % photos.length;
      setCurrentPhotoIndex(nextIndex);
      const newPhoto = photos[nextIndex];
      
      const newTiles = createTiles(newPhoto.url, newPhoto.id);
      setTiles(newTiles.map(tile => ({
        ...tile,
        x: tile.x + (Math.random() - 0.5) * 200,
        y: tile.y + (Math.random() - 0.5) * 200,
        rotation: (Math.random() - 0.5) * 45,
        scale: 0.8,
      })));

      // Phase 3: Settle
      setTimeout(() => {
        setTiles(createTiles(newPhoto.url, newPhoto.id));
        setIsScrambling(false);
      }, 800);
    }, 800);
  }, [photos, currentPhotoIndex, createTiles]);

  useEffect(() => {
    if (photos.length > 0) {
      setTiles(createTiles(photos[0].url, photos[0].id));
    }
  }, [photos, createTiles]);

  useEffect(() => {
    const interval = setInterval(scramble, scrambleInterval);
    return () => clearInterval(interval);
  }, [scramble, scrambleInterval]);

  const currentPhoto = photos[currentPhotoIndex];

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* Grid Container */}
      <div 
        className="relative"
        style={{
          width: GRID_SIZE * TILE_SIZE,
          height: GRID_SIZE * TILE_SIZE,
        }}
      >
        <AnimatePresence>
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.id}
              className="absolute overflow-hidden"
              style={{
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundImage: `url(${tile.photoUrl})`,
                backgroundSize: `${GRID_SIZE * TILE_SIZE}px ${GRID_SIZE * TILE_SIZE}px`,
                backgroundPosition: `-${(index % GRID_SIZE) * TILE_SIZE}px -${Math.floor(index / GRID_SIZE) * TILE_SIZE}px`,
              }}
              initial={{ 
                x: tile.x, 
                y: tile.y, 
                rotate: tile.rotation,
                scale: tile.scale,
                opacity: 0,
              }}
              animate={{ 
                x: tile.x, 
                y: tile.y, 
                rotate: tile.rotation,
                scale: tile.scale,
                opacity: 1,
              }}
              transition={{ 
                type: 'spring',
                stiffness: isScrambling ? 100 : 300,
                damping: isScrambling ? 10 : 25,
                delay: index * 0.01,
              }}
            >
              {/* Glitch effect during scramble */}
              {isScrambling && (
                <motion.div
                  className="absolute inset-0 bg-primary/20"
                  animate={{
                    opacity: [0, 0.5, 0],
                    x: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 0.1,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Frame */}
        <div className="absolute -inset-4 border-4 border-white/10 rounded-lg pointer-events-none" />
      </div>

      {/* Progress */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <span className="text-white/60 text-sm">
          {currentPhotoIndex + 1} / {photos.length}
        </span>
        <div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/80"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: scrambleInterval / 1000, ease: 'linear' }}
            key={currentPhotoIndex}
          />
        </div>
      </div>

      {/* Scramble Label */}
      <AnimatePresence>
        {isScrambling && (
          <motion.div
            className="absolute top-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className="text-white font-mono text-sm tracking-widest uppercase">
              Scrambling...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
