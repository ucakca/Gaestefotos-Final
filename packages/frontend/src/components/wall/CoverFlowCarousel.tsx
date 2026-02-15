'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { easings } from '@/hooks/useAnimation';

interface CoverFlowCarouselProps {
  photos: Array<{ id: string; url: string; caption?: string }>;
  autoplay?: boolean;
  interval?: number;
}

export default function CoverFlowCarousel({ 
  photos, 
  autoplay = true, 
  interval = 4000 
}: CoverFlowCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!autoplay || isHovering || photos.length <= 1) return;
    const timer = setInterval(nextSlide, interval);
    return () => clearInterval(timer);
  }, [autoplay, isHovering, interval, photos.length, nextSlide]);

  const getSlideStyle = (index: number) => {
    const diff = index - currentIndex;
    const normalizedDiff = ((diff + photos.length) % photos.length);
    const adjustedDiff = normalizedDiff > photos.length / 2 ? normalizedDiff - photos.length : normalizedDiff;
    
    const isActive = adjustedDiff === 0;
    const isPrev = adjustedDiff === -1 || adjustedDiff === photos.length - 1;
    const isNext = adjustedDiff === 1 || adjustedDiff === -photos.length + 1;
    const isFar = Math.abs(adjustedDiff) > 1;

    if (isFar) {
      return {
        x: adjustedDiff > 0 ? 800 : -800,
        scale: 0.5,
        rotateY: adjustedDiff > 0 ? -45 : 45,
        zIndex: 0,
        opacity: 0,
      };
    }

    if (isActive) {
      return {
        x: 0,
        scale: 1,
        rotateY: 0,
        zIndex: 30,
        opacity: 1,
      };
    }

    if (isPrev) {
      return {
        x: -350,
        scale: 0.8,
        rotateY: 35,
        zIndex: 20,
        opacity: 0.7,
      };
    }

    if (isNext) {
      return {
        x: 350,
        scale: 0.8,
        rotateY: -35,
        zIndex: 20,
        opacity: 0.7,
      };
    }

    return {
      x: adjustedDiff * 400,
      scale: 0.6,
      rotateY: adjustedDiff > 0 ? -30 : 30,
      zIndex: 10,
      opacity: 0.5,
    };
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* 3D Stage */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {photos.map((photo, index) => {
          const style = getSlideStyle(index);
          const isActive = index === currentIndex;

          return (
            <motion.div
              key={photo.id}
              className="absolute w-[500px] h-[350px] cursor-pointer"
              initial={false}
              animate={{
                x: style.x,
                scale: style.scale,
                rotateY: style.rotateY,
                zIndex: style.zIndex,
                opacity: style.opacity,
              }}
              transition={{
                duration: 0.6,
                ease: easings.cinematic,
              }}
              onClick={() => setCurrentIndex(index)}
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Card */}
              <div 
                className={`relative w-full h-full rounded-xl overflow-hidden shadow-2xl ${
                  isActive ? 'ring-4 ring-white/30' : ''
                }`}
                style={{
                  boxShadow: isActive 
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255,255,255,0.1)' 
                    : '0 20px 40px -12px rgba(0, 0, 0, 0.4)',
                }}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || ''}
                  fill
                  className="object-cover"
                  priority={isActive}
                />
                
                {/* Reflection */}
                <div 
                  className="absolute -bottom-full left-0 right-0 h-full opacity-20"
                  style={{
                    background: `linear-gradient(to bottom, transparent, rgba(255,255,255,0.3))`,
                    transform: 'scaleY(-1)',
                    maskImage: 'linear-gradient(to bottom, black, transparent)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
                  }}
                >
                  <Image
                    src={photo.url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Caption */}
                {isActive && photo.caption && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-white text-lg font-medium text-center">
                      {photo.caption}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'w-8 bg-white' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Ambient Light */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/30 via-transparent to-black/10" />
    </div>
  );
}
