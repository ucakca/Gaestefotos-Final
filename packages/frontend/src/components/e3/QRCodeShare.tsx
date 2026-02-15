'use client';

import logger from '@/lib/logger';

import { useState } from 'react';
import { QrCode, X, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface QRCodeShareProps {
  eventUrl: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QRCodeShare({
  eventUrl,
  eventTitle,
  isOpen,
  onClose,
}: QRCodeShareProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventTitle,
          text: `Schau dir die Fotos von "${eventTitle}" an!`,
          url: eventUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          logger.error('Share failed:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  const qrSize = 200;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold">{eventTitle}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            QR-Code scannen um beizutreten
          </p>
        </div>

        <div className="flex justify-center mb-6">
          <div
            className="flex items-center justify-center rounded-2xl bg-card p-4"
            style={{ width: qrSize + 32, height: qrSize + 32 }}
          >
            <div className="relative">
              <svg
                width={qrSize}
                height={qrSize}
                viewBox="0 0 200 200"
                className="text-foreground"
              >
                <rect x="10" y="10" width="50" height="50" fill="currentColor" />
                <rect x="20" y="20" width="30" height="30" fill="white" />
                <rect x="25" y="25" width="20" height="20" fill="currentColor" />
                
                <rect x="140" y="10" width="50" height="50" fill="currentColor" />
                <rect x="150" y="20" width="30" height="30" fill="white" />
                <rect x="155" y="25" width="20" height="20" fill="currentColor" />
                
                <rect x="10" y="140" width="50" height="50" fill="currentColor" />
                <rect x="20" y="150" width="30" height="30" fill="white" />
                <rect x="25" y="155" width="20" height="20" fill="currentColor" />
                
                {Array.from({ length: 15 }).map((_, i) => (
                  <rect
                    key={`h${i}`}
                    x={70 + (i % 5) * 12}
                    y={10 + Math.floor(i / 5) * 12}
                    width="10"
                    height="10"
                    fill={Math.random() > 0.5 ? 'currentColor' : 'transparent'}
                  />
                ))}
                {Array.from({ length: 25 }).map((_, i) => (
                  <rect
                    key={`m${i}`}
                    x={10 + (i % 5) * 12}
                    y={70 + Math.floor(i / 5) * 12}
                    width="10"
                    height="10"
                    fill={Math.random() > 0.4 ? 'currentColor' : 'transparent'}
                  />
                ))}
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-lg bg-card p-2 shadow-sm">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-muted p-3">
          <p className="text-xs text-muted-foreground text-center truncate">
            {eventUrl}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 gap-2 bg-transparent"
            onClick={handleCopyLink}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Link kopieren
              </>
            )}
          </Button>
          <Button className="flex-1 gap-2" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            Teilen
          </Button>
        </div>
      </div>
    </div>
  );
}

