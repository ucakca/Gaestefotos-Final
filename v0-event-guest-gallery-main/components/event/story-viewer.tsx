"use client";

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, Heart, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Story {
  id: string;
  type: "image" | "video";
  src: string;
  duration?: number; // in seconds, default 5 for images
  userName: string;
  userAvatar: string;
  createdAt: string;
  likes?: number;
  isLiked?: boolean;
}

export interface StoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
  isViewed?: boolean;
}

interface StoryViewerProps {
  storyGroups: StoryGroup[];
  initialGroupIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
  onLike?: (storyId: string) => void;
  onReply?: (storyId: string, message: string) => void;
}

export function StoryViewer({
  storyGroups,
  initialGroupIndex = 0,
  isOpen,
  onClose,
  onStoryViewed,
  onLike,
  onReply,
}: StoryViewerProps) {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const currentGroup = storyGroups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const storyDuration = (currentStory?.duration || 5) * 1000;

  // Reset state when story changes
  useEffect(() => {
    setProgress(0);
    setImageLoaded(false);
    if (currentStory) {
      onStoryViewed?.(currentStory.id);
    }
  }, [currentGroupIndex, currentStoryIndex, currentStory, onStoryViewed]);

  // Progress timer
  useEffect(() => {
    if (!isOpen || isPaused || !imageLoaded) return;

    const startTime = Date.now();
    const startProgress = progress;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = startProgress + (elapsed / storyDuration) * 100;
      
      if (newProgress >= 100) {
        setProgress(100);
        goToNextStory();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [isOpen, isPaused, imageLoaded, storyDuration, currentGroupIndex, currentStoryIndex]);

  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, currentGroup, currentGroupIndex, storyGroups.length, onClose]);

  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(currentGroupIndex - 1);
      const prevGroup = storyGroups[currentGroupIndex - 1];
      setCurrentStoryIndex(prevGroup.stories.length - 1);
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;
    const screenWidth = window.innerWidth;
    const tapX = e.changedTouches[0].clientX;

    // Short tap - navigate left/right based on tap position
    if (deltaTime < 200 && Math.abs(deltaX) < 30) {
      if (tapX < screenWidth / 3) {
        goToPrevStory();
      } else if (tapX > (screenWidth * 2) / 3) {
        goToNextStory();
      }
    }
    // Swipe - navigate between story groups
    else if (Math.abs(deltaX) > 50) {
      if (deltaX > 0 && currentGroupIndex > 0) {
        setCurrentGroupIndex(currentGroupIndex - 1);
        setCurrentStoryIndex(0);
      } else if (deltaX < 0 && currentGroupIndex < storyGroups.length - 1) {
        setCurrentGroupIndex(currentGroupIndex + 1);
        setCurrentStoryIndex(0);
      }
    }

    setIsPaused(false);
    touchStartRef.current = null;
  };

  const handleSendReply = () => {
    if (replyText.trim() && currentStory) {
      onReply?.(currentStory.id, replyText.trim());
      setReplyText("");
      setShowReply(false);
    }
  };

  if (!isOpen || !currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Story Content */}
      <div
        className="relative h-full w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2 safe-area-top">
          {currentGroup.stories.map((story, index) => (
            <div
              key={story.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{
                  width:
                    index < currentStoryIndex
                      ? "100%"
                      : index === currentStoryIndex
                      ? `${progress}%`
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-4 safe-area-top">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white">
              <Image
                src={currentGroup.userAvatar || "/placeholder.svg"}
                alt={currentGroup.userName}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{currentGroup.userName}</p>
              <p className="text-xs text-white/70">{currentStory.createdAt}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Pause/Play */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="rounded-full p-2 text-white hover:bg-white/20"
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>

            {/* Mute (for videos) */}
            {currentStory.type === "video" && (
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="rounded-full p-2 text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Story Media */}
        {currentStory.type === "image" ? (
          <Image
            src={currentStory.src || "/placeholder.svg"}
            alt="Story"
            fill
            className="object-contain"
            onLoad={() => setImageLoaded(true)}
            priority
          />
        ) : (
          <video
            ref={videoRef}
            src={currentStory.src}
            className="h-full w-full object-contain"
            autoPlay
            muted={isMuted}
            playsInline
            onLoadedData={() => setImageLoaded(true)}
            onEnded={goToNextStory}
          />
        )}

        {/* Navigation Arrows (Desktop) */}
        <button
          onClick={goToPrevStory}
          className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 md:block"
          disabled={currentGroupIndex === 0 && currentStoryIndex === 0}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={goToNextStory}
          className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 md:block"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 safe-area-bottom">
          {showReply ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nachricht senden..."
                className="flex-1 rounded-full bg-white/20 px-4 py-2 text-white placeholder:text-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
              />
              <button
                onClick={handleSendReply}
                className="rounded-full bg-primary p-2 text-primary-foreground"
              >
                <Send className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowReply(false)}
                className="rounded-full p-2 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowReply(true)}
                className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm"
              >
                Nachricht senden...
              </button>
              <button
                onClick={() => currentStory && onLike?.(currentStory.id)}
                className={cn(
                  "rounded-full p-2 transition-colors",
                  currentStory.isLiked ? "text-red-500" : "text-white hover:bg-white/20"
                )}
              >
                <Heart className={cn("h-6 w-6", currentStory.isLiked && "fill-current")} />
              </button>
            </div>
          )}
        </div>

        {/* Touch Areas (Mobile) - Visual indicators hidden */}
        <div className="absolute inset-0 z-10 flex md:hidden">
          <div className="w-1/3" /> {/* Tap left for prev */}
          <div className="w-1/3" /> {/* Center - no action */}
          <div className="w-1/3" /> {/* Tap right for next */}
        </div>
      </div>
    </div>
  );
}
