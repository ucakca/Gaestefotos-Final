"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronUp, Play, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface StickyHeaderProps {
  hostAvatar: string;
  eventTitle: string;
  hostName: string;
  isVisible: boolean;
  onScrollToTop?: () => void;
  onSlideshow?: () => void;
  onShare?: () => void;
}

export function StickyHeader({
  hostAvatar,
  eventTitle,
  hostName,
  isVisible,
  onScrollToTop,
  onSlideshow,
  onShare,
}: StickyHeaderProps) {
  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b transition-all duration-300 safe-area-top",
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onScrollToTop}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <Image
              src={hostAvatar || "/placeholder.svg"}
              alt={hostName}
              fill
              className="object-cover"
            />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-semibold leading-tight">{eventTitle}</h1>
            <p className="text-xs text-muted-foreground">{hostName}</p>
          </div>
        </button>
        
        <div className="flex items-center gap-1">
          {onSlideshow && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSlideshow}
              className="h-8 w-8 bg-transparent"
              title="Diashow starten"
            >
              <Play className="h-4 w-4" />
              <span className="sr-only">Diashow</span>
            </Button>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShare}
              className="h-8 w-8 bg-transparent"
              title="Event teilen"
            >
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Teilen</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onScrollToTop}
            className="h-8 w-8 bg-transparent"
          >
            <ChevronUp className="h-4 w-4" />
            <span className="sr-only">Nach oben</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to track scroll position and determine header visibility
export function useScrollHeader(threshold: number = 300) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  const [showJumpToTop, setShowJumpToTop] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show compact header after threshold
      setIsHeaderVisible(currentScrollY > threshold);
      
      // Show jump to top button
      setShowJumpToTop(currentScrollY > 500);
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return { isHeaderVisible, showJumpToTop, scrollToTop };
}
