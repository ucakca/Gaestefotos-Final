"use client";

import React from "react"

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, Upload, Camera, Loader2, Check, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { compressImage, formatFileSize, isImageFile, isVideoFile } from "@/lib/image-utils";

// Local storage key for saved user name
const USER_NAME_KEY = "gaestefotos_user_name";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (file: File, uploaderName?: string) => Promise<void>;
  allowVideo?: boolean;
  maxVideoSizeMB?: number;
}

type UploadState = "select" | "compressing" | "preview" | "uploading" | "success" | "error";

export function UploadModal({
  isOpen,
  onClose,
  onUpload,
  allowVideo = true,
  maxVideoSizeMB = 50,
}: UploadModalProps) {
  const [state, setState] = useState<UploadState>("select");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaderName, setUploaderName] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [compressionSavings, setCompressionSavings] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Load saved user name
  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_KEY);
    if (savedName) {
      setUploaderName(savedName);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    setOriginalFile(file);
    setError(null);
    
    // Check if it's a video
    if (isVideoFile(file)) {
      if (!allowVideo) {
        setError("Videos sind nicht erlaubt");
        return;
      }
      
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxVideoSizeMB) {
        setError(`Video ist zu gross (max. ${maxVideoSizeMB}MB)`);
        return;
      }

      setIsVideo(true);
      setSelectedFile(file);
      
      // Create video preview
      const url = URL.createObjectURL(file);
      setPreview(url);
      setState("preview");
      return;
    }

    // It's an image - compress it
    if (!isImageFile(file)) {
      setError("Nur Bilder und Videos sind erlaubt");
      return;
    }

    setIsVideo(false);
    setState("compressing");

    try {
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
      });

      setSelectedFile(compressed);

      // Calculate savings
      const savedBytes = file.size - compressed.size;
      if (savedBytes > 0) {
        const savedPercent = Math.round((savedBytes / file.size) * 100);
        setCompressionSavings(
          `${formatFileSize(savedBytes)} gespart (${savedPercent}%)`
        );
      } else {
        setCompressionSavings(null);
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
        setState("preview");
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError("Fehler beim Verarbeiten des Bildes");
      setState("select");
    }
  }, [allowVideo, maxVideoSizeMB]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Save user name
    if (uploaderName.trim()) {
      localStorage.setItem(USER_NAME_KEY, uploaderName.trim());
    }

    setState("uploading");

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload?.(selectedFile, uploaderName || undefined);
      setProgress(100);
      setState("success");

      // Auto-close after success
      setTimeout(() => {
        handleReset();
        onClose();
      }, 1500);
    } catch {
      clearInterval(interval);
      setError("Upload fehlgeschlagen. Bitte versuche es erneut.");
      setState("error");
      setProgress(0);
    }
  };

  const handleReset = () => {
    setState("select");
    setSelectedFile(null);
    setOriginalFile(null);
    setPreview(null);
    setProgress(0);
    setError(null);
    setCompressionSavings(null);
    setIsVideo(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              {state === "select" && "Foto hochladen"}
              {state === "compressing" && "Wird optimiert..."}
              {state === "preview" && "Vorschau"}
              {state === "uploading" && "Wird hochgeladen..."}
              {state === "success" && "Erfolgreich!"}
              {state === "error" && "Fehler"}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="-mr-2 bg-transparent"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Schliessen</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Select State */}
          {state === "select" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-xl border border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Foto aufnehmen</p>
                  <p className="text-sm text-muted-foreground">Kamera öffnen</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-4 rounded-xl border border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Foto auswählen</p>
                  <p className="text-sm text-muted-foreground">Aus Galerie wählen</p>
                </div>
              </button>

              {allowVideo && (
                <button
                  onClick={() => videoInputRef.current?.click()}
                  className="flex w-full items-center gap-4 rounded-xl border border-dashed border-muted-foreground/30 p-4 transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Video aufnehmen</p>
                    <p className="text-sm text-muted-foreground">Max. {maxVideoSizeMB}MB</p>
                  </div>
                </button>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Compressing State */}
          {state === "compressing" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Bild wird optimiert...
              </p>
              {originalFile && (
                <p className="text-center text-xs text-muted-foreground">
                  Originalgrösse: {formatFileSize(originalFile.size)}
                </p>
              )}
            </div>
          )}

          {/* Preview State */}
          {state === "preview" && preview && (
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                {isVideo ? (
                  <video
                    src={preview}
                    className="h-full w-full object-cover"
                    controls
                    muted
                    playsInline
                  />
                ) : (
                  <Image
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {compressionSavings && (
                <p className="text-center text-xs text-green-600 dark:text-green-400">
                  {compressionSavings}
                </p>
              )}

              <Input
                placeholder="Dein Name (optional)"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 bg-transparent"
                >
                  Zurück
                </Button>
                <Button onClick={handleUpload} className="flex-1">
                  Hochladen
                </Button>
              </div>
            </div>
          )}

          {/* Uploading State */}
          {state === "uploading" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {progress}% hochgeladen
              </p>
            </div>
          )}

          {/* Success State */}
          {state === "success" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-center font-medium">
                {isVideo ? "Video" : "Foto"} erfolgreich hochgeladen!
              </p>
            </div>
          )}

          {/* Error State */}
          {state === "error" && (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <p className="text-center font-medium text-destructive">{error}</p>
              <Button onClick={handleReset} className="w-full">
                Erneut versuchen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
