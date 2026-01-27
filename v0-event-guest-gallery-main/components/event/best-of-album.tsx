"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Star, Trophy, Heart, MessageCircle, TrendingUp, Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  src: string;
  alt?: string;
  likes?: number;
  comments?: number;
  uploaderName?: string;
  uploadedAt?: string;
}

interface BestOfAlbumProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  onPhotoClick?: (index: number) => void;
}

type SortMode = "likes" | "comments" | "trending";

export function BestOfAlbum({
  photos,
  isOpen,
  onClose,
  onPhotoClick,
}: BestOfAlbumProps) {
  const [sortMode, setSortMode] = useState<SortMode>("likes");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate best photos based on engagement
  const bestPhotos = useMemo(() => {
    const scored = photos.map((photo) => {
      const likes = photo.likes || 0;
      const comments = photo.comments || 0;

      // Calculate score based on sort mode
      let score = 0;
      switch (sortMode) {
        case "likes":
          score = likes;
          break;
        case "comments":
          score = comments;
          break;
        case "trending":
          // Trending = weighted combination of likes and comments
          score = likes * 1 + comments * 2;
          break;
      }

      return { ...photo, score };
    });

    // Sort by score and take top 20
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .filter((p) => p.score > 0);
  }, [photos, sortMode]);

  // Get top 3 for podium
  const topThree = bestPhotos.slice(0, 3);
  const rest = bestPhotos.slice(3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-lg safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Best Of</h1>
              <p className="text-xs text-muted-foreground">
                {bestPhotos.length} Top-Fotos
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="bg-transparent"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setSortMode("likes")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              sortMode === "likes"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            <Heart className="h-4 w-4" />
            Beliebteste
          </button>
          <button
            onClick={() => setSortMode("comments")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              sortMode === "comments"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            Meiste Kommentare
          </button>
          <button
            onClick={() => setSortMode("trending")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              sortMode === "trending"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            <TrendingUp className="h-4 w-4" />
            Trending
          </button>
        </div>
      </div>

      {bestPhotos.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
          <Sparkles className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Noch keine Best-Of Fotos</h2>
          <p className="text-sm text-muted-foreground">
            Sobald Fotos Likes oder Kommentare erhalten, erscheinen die besten hier.
          </p>
        </div>
      ) : (
        <div className="overflow-y-auto pb-20" style={{ height: "calc(100vh - 140px)" }}>
          {/* Podium for Top 3 */}
          {topThree.length >= 3 && (
            <div className="px-4 py-6">
              <div className="flex items-end justify-center gap-2">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onPhotoClick?.(photos.findIndex(p => p.id === topThree[1].id))}
                    className="relative mb-2"
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-xl ring-4 ring-gray-300">
                      <Image
                        src={topThree[1].src || "/placeholder.svg"}
                        alt={topThree[1].alt || "2. Platz"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-gray-700">
                      2
                    </div>
                  </button>
                  <div className="h-20 w-24 rounded-t-lg bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-medium">
                      {topThree[1].likes || 0} Likes
                    </span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <button
                    onClick={() => onPhotoClick?.(photos.findIndex(p => p.id === topThree[0].id))}
                    className="relative mb-2"
                  >
                    <div className="relative h-32 w-32 overflow-hidden rounded-xl ring-4 ring-yellow-400">
                      <Image
                        src={topThree[0].src || "/placeholder.svg"}
                        alt={topThree[0].alt || "1. Platz"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-lg font-bold text-white shadow-lg">
                      <Trophy className="h-5 w-5" />
                    </div>
                  </button>
                  <div className="h-28 w-32 rounded-t-lg bg-gradient-to-b from-yellow-300 to-yellow-500 flex items-center justify-center">
                    <span className="text-sm text-yellow-800 font-bold">
                      {topThree[0].likes || 0} Likes
                    </span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => onPhotoClick?.(photos.findIndex(p => p.id === topThree[2].id))}
                    className="relative mb-2"
                  >
                    <div className="relative h-20 w-20 overflow-hidden rounded-xl ring-4 ring-amber-600">
                      <Image
                        src={topThree[2].src || "/placeholder.svg"}
                        alt={topThree[2].alt || "3. Platz"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 text-sm font-bold text-white">
                      3
                    </div>
                  </button>
                  <div className="h-16 w-20 rounded-t-lg bg-gradient-to-b from-amber-500 to-amber-700 flex items-center justify-center">
                    <span className="text-xs text-amber-100 font-medium">
                      {topThree[2].likes || 0} Likes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rest of Photos */}
          {rest.length > 0 && (
            <div className="px-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Weitere Top-Fotos
              </h3>
              <div className="space-y-2">
                {rest.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => onPhotoClick?.(photos.findIndex(p => p.id === photo.id))}
                    className="flex w-full items-center gap-3 rounded-xl bg-card p-3 text-left transition-colors hover:bg-accent"
                  >
                    <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {index + 4}
                    </span>
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                      <Image
                        src={photo.src || "/placeholder.svg"}
                        alt={photo.alt || `Platz ${index + 4}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {photo.uploaderName || "Unbekannt"}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {photo.likes || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {photo.comments || 0}
                        </span>
                      </div>
                    </div>
                    {index < 3 && (
                      <Star className="h-5 w-5 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Button to open Best-Of Album
export function BestOfButton({
  onClick,
  photoCount,
  className,
}: {
  onClick: () => void;
  photoCount: number;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
        className
      )}
    >
      <Trophy className="h-4 w-4" />
      Best Of
      {photoCount > 0 && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
          {photoCount}
        </span>
      )}
    </button>
  );
}
