"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Settings,
  Maximize,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  src: string;
  alt?: string;
  uploaderName?: string;
}

interface SlideshowModeProps {
  photos: Photo[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

type TransitionStyle = "fade" | "slide" | "zoom" | "none";

export function SlideshowMode({
  photos,
  isOpen,
  onClose,
  initialIndex = 0,
}: SlideshowModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [intervalSeconds, setIntervalSeconds] = useState(5);
  const [transition, setTransition] = useState<TransitionStyle>("fade");
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout>();
  const slideTimerRef = useRef<NodeJS.Timeout>();

  const currentPhoto = photos[currentIndex];

  // Auto-advance slides
  useEffect(() => {
    if (!isOpen || !isPlaying) return;

    slideTimerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, intervalSeconds * 1000);

    return () => {
      if (slideTimerRef.current) clearTimeout(slideTimerRef.current);
    };
  }, [isOpen, isPlaying, currentIndex, intervalSeconds, photos.length]);

  // Hide controls after inactivity
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

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "f":
          toggleFullscreen();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const getTransitionClass = () => {
    switch (transition) {
      case "fade":
        return "animate-in fade-in-0 duration-1000";
      case "slide":
        return "animate-in slide-in-from-right duration-500";
      case "zoom":
        return "animate-in zoom-in-95 duration-700";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
    >
      {/* Photo Display */}
      <div className="relative h-full w-full">
        <div
          key={currentPhoto.id}
          className={cn("absolute inset-0", getTransitionClass())}
        >
          <Image
            src={currentPhoto.src || "/placeholder.svg"}
            alt={currentPhoto.alt || "Slideshow Foto"}
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Photo Info Overlay */}
        <div
          className={cn(
            "absolute bottom-24 left-0 right-0 text-center transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {currentPhoto.uploaderName && (
            <p className="text-white/80 text-sm">
              Foto von {currentPhoto.uploaderName}
            </p>
          )}
          <p className="text-white/60 text-xs mt-1">
            {currentIndex + 1} / {photos.length}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-primary transition-all duration-100"
          style={{
            width: `${((currentIndex + 1) / photos.length) * 100}%`,
          }}
        />
      </div>

      {/* Controls Overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-6 w-6" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className="text-white hover:bg-white/10"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/10"
            >
              <Maximize className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Einstellungen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Geschwindigkeit: {intervalSeconds}s
                  </p>
                  <Slider
                    value={[intervalSeconds]}
                    onValueChange={([value]) => setIntervalSeconds(value)}
                    min={2}
                    max={15}
                    step={1}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Übergang
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setTransition("fade")}>
                  Überblenden {transition === "fade" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransition("slide")}>
                  Schieben {transition === "slide" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransition("zoom")}>
                  Zoom {transition === "zoom" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTransition("none")}>
                  Keine {transition === "none" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
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
              size="icon"
              onClick={goToNext}
              className="text-white hover:bg-white/10"
            >
              <SkipForward className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Thumbnail Strip */}
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <div className="flex justify-center gap-1 overflow-x-auto scrollbar-hide py-2">
            {photos.slice(0, 20).map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "relative h-12 w-12 flex-shrink-0 rounded overflow-hidden transition-all",
                  index === currentIndex
                    ? "ring-2 ring-primary scale-110"
                    : "opacity-50 hover:opacity-80"
                )}
              >
                <Image
                  src={photo.src || "/placeholder.svg"}
                  alt=""
                  fill
                  className="object-cover"
                />
              </button>
            ))}
            {photos.length > 20 && (
              <div className="flex items-center justify-center h-12 w-12 rounded bg-white/10 text-white/70 text-xs">
                +{photos.length - 20}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
