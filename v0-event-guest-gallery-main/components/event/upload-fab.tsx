"use client";

import { Plus, Camera, ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UploadFABProps {
  onUploadPhoto?: () => void;
  onTakePhoto?: () => void;
  onRecordVideo?: () => void;
  isVisible?: boolean;
  className?: string;
}

export function UploadFAB({
  onUploadPhoto,
  onTakePhoto,
  onRecordVideo,
  isVisible = true,
  className,
}: UploadFABProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 z-40 -translate-x-1/2 transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none",
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="h-14 gap-2 rounded-full px-6 shadow-xl shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Upload</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="top" className="mb-2 w-48">
          <DropdownMenuItem onClick={onTakePhoto} className="gap-3 py-3">
            <Camera className="h-5 w-5 text-primary" />
            <span>Foto aufnehmen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onUploadPhoto} className="gap-3 py-3">
            <ImageIcon className="h-5 w-5 text-primary" />
            <span>Foto auswählen</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRecordVideo} className="gap-3 py-3">
            <Video className="h-5 w-5 text-primary" />
            <span>Video aufnehmen</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
