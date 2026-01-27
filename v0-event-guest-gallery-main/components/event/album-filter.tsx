"use client";

import { cn } from "@/lib/utils";
import {
  Images,
  Church,
  PartyPopper,
  Music,
  Utensils,
  Heart,
  Gift,
  Sparkles,
  Camera,
  Users,
  Cake,
  Wine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Map of available icons that hosts can choose from
export const albumIconMap: Record<string, LucideIcon> = {
  images: Images,
  church: Church,
  party: PartyPopper,
  music: Music,
  food: Utensils,
  heart: Heart,
  gift: Gift,
  sparkles: Sparkles,
  camera: Camera,
  users: Users,
  cake: Cake,
  wine: Wine,
};

interface Album {
  id: string;
  name: string;
  count?: number;
  icon?: string; // Icon key from albumIconMap, defined by host in dashboard
}

interface AlbumFilterProps {
  albums: Album[];
  activeAlbum: string;
  onAlbumChange: (albumId: string) => void;
  className?: string;
}

export function AlbumFilter({
  albums,
  activeAlbum,
  onAlbumChange,
  className,
}: AlbumFilterProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide",
        className
      )}
    >
      {albums.map((album) => {
        const IconComponent = album.icon ? albumIconMap[album.icon] : null;
        
        return (
          <button
            key={album.id}
            onClick={() => onAlbumChange(album.id)}
            className={cn(
              "flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              activeAlbum === album.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            {album.name}
            {album.count !== undefined && (
              <span className="text-xs opacity-70">({album.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
