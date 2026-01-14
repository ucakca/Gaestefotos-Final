'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { QRDesignConfig } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';

interface DownloadButtonProps {
  config: QRDesignConfig;
  eventId: string;
  eventSlug: string;
}

export function DownloadButton({ config, eventId, eventSlug }: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (format: 'png' | 'pdf') => {
    try {
      setDownloading(true);

      // Generate SVG from config (simplified - in production use proper QR library)
      const svg = generateQRSVG(config);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/qr/export.${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: config.sizePreset === 'a4' ? 'A5' : 'A6', // Backend expects A5/A6
          svg,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code-${eventSlug}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Download fehlgeschlagen');
    } finally {
      setDownloading(false);
    }
  };

  const generateQRSVG = (config: QRDesignConfig): string => {
    // This is a placeholder - in production, use the actual QRCodeSVG component's output
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
      <rect fill="${config.colors.background}" width="300" height="300"/>
      <text x="150" y="50" text-anchor="middle" fill="${config.colors.foreground}" font-size="18">${config.headerText || ''}</text>
      <text x="150" y="280" text-anchor="middle" fill="${config.colors.foreground}" font-size="14">${config.footerText || ''}</text>
    </svg>`;
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => handleDownload('png')}
        disabled={downloading}
        variant="outline"
        className="flex-1"
      >
        <Download size={16} className="mr-2" />
        PNG
      </Button>
      <Button
        onClick={() => handleDownload('pdf')}
        disabled={downloading}
        variant="outline"
        className="flex-1"
      >
        <Download size={16} className="mr-2" />
        PDF
      </Button>
    </div>
  );
}
