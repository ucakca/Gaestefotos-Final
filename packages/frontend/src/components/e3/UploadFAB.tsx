'use client';

import { Plus, Camera, ImageIcon, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface UploadFABProps {
  onUploadPhoto?: () => void;
  onTakePhoto?: () => void;
  onRecordVideo?: () => void;
  isVisible?: boolean;
  className?: string;
}

export default function UploadFAB({
  onUploadPhoto,
  onTakePhoto,
  onRecordVideo,
  isVisible = true,
  className,
}: UploadFABProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-40 -translate-x-1/2 transition-all duration-300 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      } ${className || ''}`}
    >
      <div className="relative group">
        <Button
          size="lg"
          onClick={onUploadPhoto}
          className="h-14 gap-2 rounded-full px-6 shadow-xl shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" />
          <span className="font-semibold">Upload</span>
        </Button>
      </div>
    </div>
  );
}

