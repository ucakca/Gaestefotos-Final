"use client";

import React from "react"

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  X,
  MessageCircle,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Send,
  User,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePinchZoom } from "@/hooks/use-pinch-zoom";
import { PhotoReactions, type ReactionType } from "./photo-reactions";
import { CommentText } from "./mentions-input";

// Local storage key for saved user name
const USER_NAME_KEY = "gaestefotos_user_name";

interface Comment {
  id: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface ReactionCount {
  type: ReactionType;
  count: number;
}

interface Photo {
  id: string;
  src: string;
  alt?: string;
  reactions?: ReactionCount[];
  userReaction?: ReactionType | null;
  likes?: number; // Legacy support
  isLiked?: boolean; // Legacy support
  uploaderName?: string;
  uploadedAt?: string;
  comments?: Comment[];
}

interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onReact?: (photoId: string, reaction: ReactionType | null) => void;
  onLike?: (photoId: string) => void; // Legacy support
  onDownload?: (photoId: string) => void;
  onShare?: (photoId: string) => void;
  onComment?: (photoId: string, comment: string, userName: string) => void;
}

export function PhotoLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onIndexChange,
  onReact,
  onLike,
  onDownload,
  onShare,
  onComment,
}: PhotoLightboxProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [userName, setUserName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const currentPhoto = photos[currentIndex];

  // Pinch-to-zoom hook
  const {
    scale,
    isZoomed,
    handlers: zoomHandlers,
    handleDoubleTap,
    resetZoom,
    style: zoomStyle,
  } = usePinchZoom({
    minScale: 1,
    maxScale: 4,
  });

  // Load saved user name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_KEY);
    if (savedName) {
      setUserName(savedName);
      setShowNameInput(false);
    } else {
      setShowNameInput(true);
    }
  }, []);

  // Save user name to localStorage
  const saveUserName = (name: string) => {
    if (name.trim()) {
      localStorage.setItem(USER_NAME_KEY, name.trim());
      setUserName(name.trim());
      setShowNameInput(false);
    }
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0 && !isZoomed) {
      setIsLoaded(false);
      setShowComments(false);
      resetZoom();
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, isZoomed, resetZoom, onIndexChange]);

  const goToNext = useCallback(() => {
    if (currentIndex < photos.length - 1 && !isZoomed) {
      setIsLoaded(false);
      setShowComments(false);
      resetZoom();
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, photos.length, isZoomed, resetZoom, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isZoomed) {
          resetZoom();
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft" && !showComments && !isZoomed) goToPrevious();
      if (e.key === "ArrowRight" && !showComments && !isZoomed) goToNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext, showComments, isZoomed, resetZoom]);

  // Touch swipe support (disabled when zoomed)
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only handle single-touch swipes when not zoomed
    if (!showComments && !isZoomed && e.touches.length === 1) {
      setTouchStart(e.touches[0].clientX);
    }
    // Forward to zoom handlers for pinch
    zoomHandlers.onTouchStart(e);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    zoomHandlers.onTouchMove(e);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Handle swipe navigation
    if (touchStart && !isZoomed && e.changedTouches.length === 1) {
      const touchEnd = e.changedTouches[0].clientX;
      const diff = touchStart - touchEnd;

      if (Math.abs(diff) > 50) {
        if (diff > 0) goToNext();
        else goToPrevious();
      }
    }
    setTouchStart(null);
    zoomHandlers.onTouchEnd();
  };

  // Helper to handle both onReact and legacy onLike
  const handleReaction = useCallback((reaction: ReactionType | null) => {
    if (onReact) {
      onReact(currentPhoto.id, reaction);
    } else if (onLike && reaction === "heart") {
      onLike(currentPhoto.id);
    }
  }, [currentPhoto?.id, onReact, onLike]);

  // Double tap handling - like or zoom
  const [lastTap, setLastTap] = useState(0);
  const handleDoubleTapLike = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      // Double tap - like animation
      if (!currentPhoto.userReaction && !currentPhoto.isLiked) {
        setIsAnimatingLike(true);
        setTimeout(() => setIsAnimatingLike(false), 1000);
        handleReaction("heart");
      }
    }
    setLastTap(now);
    handleDoubleTap(e);
  };

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;

    if (!userName && showNameInput) {
      commentInputRef.current?.focus();
      return;
    }

    onComment?.(currentPhoto.id, commentText.trim(), userName || "Gast");
    setCommentText("");
  };

  if (!isOpen || !currentPhoto) return null;

  // Calculate total reactions
  const totalReactions = currentPhoto.reactions?.reduce((sum, r) => sum + r.count, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={isZoomed ? resetZoom : onClose}
          className="text-white hover:bg-white/10 bg-transparent"
        >
          <X className="h-6 w-6" />
          <span className="sr-only">{isZoomed ? "Zoom zurücksetzen" : "Schließen"}</span>
        </Button>

        <div className="text-center">
          <span className="text-sm text-white/70">
            {currentIndex + 1} / {photos.length}
          </span>
          {isZoomed && (
            <span className="ml-2 text-xs text-white/50">
              {Math.round(scale * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isZoomed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              className="text-white hover:bg-white/10 bg-transparent"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 bg-transparent cursor-default"
              disabled
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Photo & Comments Container */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Photo Section */}
        <div
          className={cn(
            "relative flex items-center justify-center transition-all duration-300 overflow-hidden",
            showComments ? "w-0 md:w-1/2 opacity-0 md:opacity-100" : "w-full"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={zoomHandlers.onTouchCancel}
        >
          {/* Navigation Arrows (Desktop) */}
          {currentIndex > 0 && !showComments && !isZoomed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-2 z-10 hidden text-white hover:bg-white/10 md:flex bg-transparent"
            >
              <ChevronLeft className="h-8 w-8" />
              <span className="sr-only">Zurueck</span>
            </Button>
          )}

          {currentIndex < photos.length - 1 && !showComments && !isZoomed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-2 z-10 hidden text-white hover:bg-white/10 md:flex bg-transparent"
            >
              <ChevronRight className="h-8 w-8" />
              <span className="sr-only">Weiter</span>
            </Button>
          )}

          {/* Image Container with Pinch-to-Zoom */}
          <div
            className="relative h-full w-full max-w-4xl touch-none"
            onTouchEnd={handleDoubleTapLike}
          >
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}
            <div className="relative h-full w-full" style={zoomStyle}>
              <Image
                src={currentPhoto.src || "/placeholder.svg"}
                alt={currentPhoto.alt || "Event Foto"}
                fill
                className={cn(
                  "object-contain transition-opacity duration-300",
                  isLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setIsLoaded(true)}
                priority
                draggable={false}
              />
            </div>

            {/* Double Tap Like Animation */}
            {isAnimatingLike && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-8xl animate-ping">❤️</span>
              </div>
            )}
          </div>
        </div>

        {/* Comments Panel */}
        <div
          className={cn(
            "absolute inset-0 md:relative md:inset-auto bg-background/95 md:bg-card/95 backdrop-blur-xl transition-all duration-300 flex flex-col",
            showComments
              ? "translate-x-0 md:w-1/2 md:min-w-80"
              : "translate-x-full md:translate-x-0 md:w-0 md:min-w-0 md:overflow-hidden"
          )}
        >
          {/* Comments Header */}
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold text-foreground">Kommentare</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowComments(false)}
              className="text-foreground hover:bg-accent bg-transparent"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Name Input */}
          {showNameInput && (
            <div className="border-b p-4 bg-accent/50">
              <p className="text-sm text-muted-foreground mb-2">
                Wie heisst du? (wird gespeichert)
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={commentInputRef}
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Dein Name"
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && userName.trim()) {
                        saveUserName(userName);
                      }
                    }}
                  />
                </div>
                <Button
                  onClick={() => saveUserName(userName)}
                  disabled={!userName.trim()}
                >
                  OK
                </Button>
              </div>
            </div>
          )}

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Uploader Info */}
            {currentPhoto.uploaderName && (
              <div className="flex items-start gap-3 pb-4 border-b">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {currentPhoto.uploaderName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentPhoto.uploadedAt}
                  </p>
                </div>
              </div>
            )}

            {/* Comments */}
            {currentPhoto.comments && currentPhoto.comments.length > 0 ? (
              currentPhoto.comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {comment.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5 break-words">
                      <CommentText text={comment.text} />
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Noch keine Kommentare
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sei der/die Erste!
                </p>
              </div>
            )}
          </div>

          {/* Comment Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  userName
                    ? `Kommentieren als ${userName}...`
                    : "Schreibe einen Kommentar..."
                }
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleSubmitComment}
                disabled={!commentText.trim()}
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Senden</span>
              </Button>
            </div>
            {userName && (
              <button
                onClick={() => setShowNameInput(true)}
                className="text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors"
              >
                Name ändern
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <footer className="flex items-center justify-between p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Reactions Button with Picker - with legacy support */}
          <PhotoReactions
            reactions={currentPhoto.reactions || (currentPhoto.likes !== undefined ? [{ type: "heart" as ReactionType, count: currentPhoto.likes }] : [])}
            userReaction={currentPhoto.userReaction || (currentPhoto.isLiked ? "heart" : null)}
            onReact={handleReaction}
            className="text-white"
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(true)}
            className="gap-2 text-white hover:bg-white/10 bg-transparent"
          >
            <MessageCircle className="h-5 w-5" />
            <span>{currentPhoto.comments?.length || 0}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDownload?.(currentPhoto.id)}
            className="text-white hover:bg-white/10 bg-transparent"
          >
            <Download className="h-5 w-5" />
            <span className="sr-only">Herunterladen</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare?.(currentPhoto.id)}
            className="text-white hover:bg-white/10 bg-transparent"
          >
            <Share2 className="h-5 w-5" />
            <span className="sr-only">Teilen</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
