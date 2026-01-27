'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Photo } from '@gaestefotos/shared';

interface SlideshowModeProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

export default function SlideshowMode({
  photos,
  isOpen,
  onClose,
  initialIndex = 0,
}: SlideshowModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSeconds] = useState(5);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  const slideTimerRef = useRef<NodeJS.Timeout>();

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    slideTimerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, intervalSeconds * 1000);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [isOpen, isPlaying, currentIndex, intervalSeconds, photos.length]);

  useEffect(() => {
    const hideControls = () => {
      controlsTimerRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    if (showControls) hideControls();

    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls, isPlaying]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
  };

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      <div className="relative h-full w-full">
        <div
          key={currentPhoto?.id}
          className="absolute inset-0 animate-in fade-in-0 duration-1000"
        >
          <img
            src={currentPhoto?.url || '/placeholder.svg'}
            alt="Slideshow Foto"
            className="w-full h-full object-contain"
          />
        </div>

        <div
          className={`absolute bottom-24 left-0 right-0 text-center transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="text-white/60 text-xs mt-1">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>

      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{
            width: `${((currentIndex + 1) / photos.length) * 100}%`,
          }}
        />
      </div>

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="text-white hover:bg-white/10"
            >
              <SkipBack className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="lg"
              onClick={() => setIsPlaying(!isPlaying)}
              className="text-white hover:bg-white/10 h-14 w-14 rounded-full"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="text-white hover:bg-white/10"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

