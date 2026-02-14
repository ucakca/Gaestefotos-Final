'use client';

/**
 * Optimized Image Component
 * 
 * Next.js Image wrapper mit Lazy Loading, Blur Placeholder und responsive Sizes
 */

import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number;
  onClick?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  fill = false,
  objectFit = 'cover',
  quality = 85,
  onClick,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Blur placeholder data URL
  const blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          placeholder="blur"
          blurDataURL={blurDataURL}
          style={{ objectFit }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => setError(true)}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 800}
          height={height || 600}
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          placeholder="blur"
          blurDataURL={blurDataURL}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => setError(true)}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        />
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-background animate-pulse" />
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 bg-background flex items-center justify-center text-muted-foreground text-xs">
          Bild nicht verfügbar
        </div>
      )}
    </div>
  );
}

/**
 * Gallery Image (aspect-square optimized)
 */
export function GalleryImage({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="aspect-square relative overflow-hidden rounded-lg cursor-pointer"
      onClick={onClick}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        objectFit="cover"
        className="hover:opacity-90 transition-opacity"
      />
    </motion.div>
  );
}
