"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Maximize,
  Minimize,
  QrCode,
  Info,
  Camera,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Demo photos for slideshow
const demoPhotos = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=90",
    uploader: "Anna Müller",
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1920&q=90",
    uploader: "Max Schmidt",
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=90",
    uploader: "Lisa Weber",
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=90",
    uploader: "Julia Kern",
  },
  {
    id: "5",
    src: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1920&q=90",
    uploader: "Peter Klein",
  },
  {
    id: "6",
    src: "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=1920&q=90",
    uploader: "Sarah Wolf",
  },
  {
    id: "7",
    src: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=1920&q=90",
    uploader: "Mark Roth",
  },
  {
    id: "8",
    src: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1920&q=90",
    uploader: "Tom Bauer",
  },
];

const eventInfo = {
  title: "Hochzeit Max & Anna",
  date: "15.02.2026",
  photoCount: 156,
};

export default function LiveWallPage() {
  const params = useParams();
  const eventId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);

  const [photos] = useState(demoPhotos);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings state
  const [showQrCode, setShowQrCode] = useState(true);
  const [showEventInfo, setShowEventInfo] = useState(true);
  const [slideshowSpeed, setSlideshowSpeed] = useState("5000");

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !settingsOpen) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, settingsOpen]);

  // Handle mouse movement
  const handleMouseMove = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, parseInt(slideshowSpeed));

    return () => clearInterval(interval);
  }, [isPlaying, photos.length, slideshowSpeed]);

  // Initial controls timeout
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
          resetControlsTimeout();
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev + 1) % photos.length);
          resetControlsTimeout();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          resetControlsTimeout();
          break;
        case "f":
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Escape":
          if (isFullscreen) {
            document.exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photos.length, resetControlsTimeout, toggleFullscreen, isFullscreen]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    resetControlsTimeout();
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    resetControlsTimeout();
  };

  const eventUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/e3/${eventId}` 
    : `/e3/${eventId}`;

  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] bg-[#0a0a0a] text-white">
        <div className="text-center space-y-4">
          <div className="relative">
            <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
            <Loader2 className="h-8 w-8 absolute -bottom-1 -right-1 animate-spin text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Noch keine Fotos vorhanden</h2>
          <p className="text-muted-foreground">Warte auf erste Uploads...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-3.5rem)] bg-[#0a0a0a] overflow-hidden cursor-none"
      onMouseMove={handleMouseMove}
      onClick={resetControlsTimeout}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      {/* Photo Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Image
            src={photos[currentIndex].src}
            alt={`Foto von ${photos[currentIndex].uploader}`}
            fill
            className="object-contain"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Photo Attribution */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full"
          >
            <p className="text-white/80 text-sm">
              Foto von <span className="font-medium text-white">{photos[currentIndex].uploader}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Info Overlay - Top Left */}
      <AnimatePresence>
        {showEventInfo && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-4 text-white"
          >
            <h2 className="font-semibold text-lg">{eventInfo.title}</h2>
            <p className="text-white/70 text-sm">{eventInfo.date}</p>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Camera className="h-4 w-4" />
              <span>{eventInfo.photoCount} Fotos</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Overlay - Bottom Right */}
      <AnimatePresence>
        {showQrCode && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-4 right-4 bg-white rounded-xl p-4 shadow-2xl"
          >
            <div className="flex flex-col items-center gap-2">
              {/* QR Code placeholder - in production use a QR library */}
              <div className="w-[150px] h-[150px] bg-white rounded-lg flex items-center justify-center border-2 border-gray-100">
                <QrCode className="w-32 h-32 text-gray-900" />
              </div>
              <p className="text-xs text-gray-600 text-center max-w-[150px] font-medium">
                Scanne mich & teile deine Fotos!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <>
            {/* Exit Fullscreen / Settings - Top Right */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 right-4 flex items-center gap-2"
            >
              <Button
                variant="secondary"
                size="icon"
                className="bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>
            </motion.div>

            {/* Navigation Arrows */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </motion.div>

            {/* Play/Pause - Bottom Center */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3"
            >
              <Button
                variant="secondary"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-0.5" />
                )}
              </Button>
              
              {/* Progress Dots */}
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
                {photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentIndex
                        ? "bg-white w-4"
                        : "bg-white/40 hover:bg-white/60"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Live-Wall Einstellungen</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* QR Code Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="qr-toggle" className="font-medium">QR-Code anzeigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Zeigt den QR-Code zum Teilen
                  </p>
                </div>
              </div>
              <Switch
                id="qr-toggle"
                checked={showQrCode}
                onCheckedChange={setShowQrCode}
              />
            </div>

            {/* Event Info Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="info-toggle" className="font-medium">Event-Info anzeigen</Label>
                  <p className="text-xs text-muted-foreground">
                    Zeigt Titel, Datum und Foto-Anzahl
                  </p>
                </div>
              </div>
              <Switch
                id="info-toggle"
                checked={showEventInfo}
                onCheckedChange={setShowEventInfo}
              />
            </div>

            {/* Slideshow Speed */}
            <div className="space-y-2">
              <Label className="font-medium">Slideshow-Geschwindigkeit</Label>
              <Select value={slideshowSpeed} onValueChange={setSlideshowSpeed}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3000">3 Sekunden (schnell)</SelectItem>
                  <SelectItem value="5000">5 Sekunden (normal)</SelectItem>
                  <SelectItem value="10000">10 Sekunden (langsam)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Tastenkürzel</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div><kbd className="px-1.5 py-0.5 bg-muted rounded">←</kbd> Vorheriges Foto</div>
                <div><kbd className="px-1.5 py-0.5 bg-muted rounded">→</kbd> Nächstes Foto</div>
                <div><kbd className="px-1.5 py-0.5 bg-muted rounded">Leertaste</kbd> Play/Pause</div>
                <div><kbd className="px-1.5 py-0.5 bg-muted rounded">F</kbd> Vollbild</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
