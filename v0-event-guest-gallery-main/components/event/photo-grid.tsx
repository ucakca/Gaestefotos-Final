"use client";

import React from "react"

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoContextMenu } from "./photo-context-menu";

interface Photo {
  id: string;
  src: string;
  alt?: string;
  width: number;
  height: number;
  likes: number;
  isLiked?: boolean;
  uploaderName?: string;
  isOwner?: boolean;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photoId: string) => void;
  onLike?: (photoId: string) => void;
  onDownload?: (photoId: string) => void;
  onShare?: (photoId: string) => void;
  onDelete?: (photoId: string) => void;
  onReport?: (photoId: string) => void;
  className?: string;
}

export function PhotoGrid({
  photos,
  onPhotoClick,
  onLike,
  onDownload,
  onShare,
  onDelete,
  onReport,
  className,
}: PhotoGridProps) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    photoId: string | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    photoId: null,
  });

  const handleContextMenu = (photoId: string, x: number, y: number) => {
    setContextMenu({
      isOpen: true,
      position: { x, y },
      photoId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
      photoId: null,
    });
  };

  const activePhoto = photos.find((p) => p.id === contextMenu.photoId);

  return (
    <>
      <div className={cn("masonry-grid px-4", className)}>
        {photos.map((photo) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            onClick={() => onPhotoClick?.(photo.id)}
            onLike={() => onLike?.(photo.id)}
            onContextMenu={(x, y) => handleContextMenu(photo.id, x, y)}
          />
        ))}
      </div>

      <PhotoContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        isLiked={activePhoto?.isLiked}
        isOwner={activePhoto?.isOwner}
        onClose={closeContextMenu}
        onLike={() => contextMenu.photoId && onLike?.(contextMenu.photoId)}
        onDownload={() => contextMenu.photoId && onDownload?.(contextMenu.photoId)}
        onShare={() => contextMenu.photoId && onShare?.(contextMenu.photoId)}
        onCopyLink={() => {
          if (contextMenu.photoId) {
            const url = `${window.location.origin}/photo/${contextMenu.photoId}`;
            navigator.clipboard.writeText(url);
          }
        }}
        onDelete={() => contextMenu.photoId && onDelete?.(contextMenu.photoId)}
        onReport={() => contextMenu.photoId && onReport?.(contextMenu.photoId)}
      />
    </>
  );
}

interface PhotoItemProps {
  photo: Photo;
  onClick?: () => void;
  onLike?: () => void;
  onContextMenu?: (x: number, y: number) => void;
}

function PhotoItem({ photo, onClick, onLike, onContextMenu }: PhotoItemProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleDoubleTap = useCallback(() => {
    if (!photo.isLiked) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
    onLike?.();
  }, [photo.isLiked, onLike]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onContextMenu?.(touch.clientX, touch.clientY);
      // Vibration feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    // Double tap detection
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      // Single tap with delay
      setTimeout(() => {
        if (lastTapRef.current !== 0 && Date.now() - lastTapRef.current >= 280) {
          onClick?.();
        }
      }, 300);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e.clientX, e.clientY);
  };

  const aspectRatio = photo.height / photo.width;

  return (
    <div className="masonry-item">
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onContextMenu={handleContextMenuEvent}
        className="group relative w-full overflow-hidden rounded-xl bg-muted transition-all duration-200 hover:shadow-lg active:scale-[0.98] cursor-pointer"
        style={{ aspectRatio: `1 / ${aspectRatio}` }}
      >
        {/* Skeleton Placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
        )}

        {/* Photo */}
        <Image
          src={photo.src || "/placeholder.svg"}
          alt={photo.alt || "Event photo"}
          fill
          className={cn(
            "object-cover transition-all duration-500",
            isLoaded ? "opacity-100 blur-0" : "opacity-0 blur-md"
          )}
          onLoad={() => setIsLoaded(true)}
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Like Overlay */}
        {photo.likes > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <Heart
              className={cn(
                "h-3 w-3",
                photo.isLiked && "fill-red-500 text-red-500"
              )}
            />
            <span>{photo.likes}</span>
          </div>
        )}

        {/* Double-tap Heart Animation */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart
              className="h-20 w-20 fill-white text-white drop-shadow-lg"
              style={{ 
                animation: "ping 0.8s cubic-bezier(0, 0, 0.2, 1)",
              }}
            />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
      </div>
    </div>
  );
}
