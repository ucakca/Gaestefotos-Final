'use client';

import { ChevronUp, Trophy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StickyHeaderProps {
  hostAvatar: string;
  eventTitle: string;
  hostName: string;
  isVisible: boolean;
  onScrollToTop?: () => void;
  onLeaderboard?: () => void;
  onShare?: () => void;
}

export default function StickyHeader({  hostAvatar,
  eventTitle,
  hostName,
  isVisible,
  onScrollToTop,
  onLeaderboard,
  onShare,
}: StickyHeaderProps) {
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-b transition-all duration-300 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onScrollToTop}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="relative h-8 w-8 overflow-hidden rounded-full">
            <img
              src={hostAvatar || '/placeholder.svg'}
              alt={hostName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-semibold leading-tight">{eventTitle}</h1>
            <p className="text-xs text-muted-foreground">{hostName}</p>
          </div>
        </button>
        
        <div className="flex items-center gap-2">
          {onLeaderboard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLeaderboard}
              className="h-9 px-3 bg-transparent flex items-center gap-1.5"
              title="Leaderboard"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs font-medium">Ranking</span>
            </Button>
          )}
          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className="h-9 w-9 bg-transparent"
              title="Event teilen"
            >
              <Share2 className="h-5 w-5" />
              <span className="sr-only">Teilen</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onScrollToTop}
            className="h-9 w-9 bg-transparent"
          >
            <ChevronUp className="h-5 w-5" />
            <span className="sr-only">Nach oben</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
