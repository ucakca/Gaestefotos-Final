'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Download, FileText, Image as ImageIcon } from 'lucide-react';

interface ExportPanelProps {
  eventId: string;
  eventSlug?: string;
  format: 'A6' | 'A5';
  svg: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: string) => void;
}

async function exportPng(eventId: string, format: string, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.png`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export fehlgeschlagen (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-aufsteller-${eventId}-${format}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportPdf(eventId: string, format: string, svg: string): Promise<void> {
  const res = await fetch(`/api/events/${eventId}/qr/export.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, svg }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Export fehlgeschlagen (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `qr-aufsteller-${eventId}-${format}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportSvg(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ExportPanel({
  eventId,
  eventSlug,
  format,
  svg,
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportPanelProps) {
  const [exportingPng, setExportingPng] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPng = async () => {
    try {
      onExportStart?.();
      setExportingPng(true);
      await exportPng(eventId, format, svg);
      onExportComplete?.();
    } catch (err: any) {
      onExportError?.(err?.message || 'PNG Export fehlgeschlagen');
    } finally {
      setExportingPng(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      onExportStart?.();
      setExportingPdf(true);
      await exportPdf(eventId, format, svg);
      onExportComplete?.();
    } catch (err: any) {
      onExportError?.(err?.message || 'PDF Export fehlgeschlagen');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportSvg = () => {
    try {
      onExportStart?.();
      const filename = `qr-aufsteller-${eventSlug || eventId}-${format}.svg`;
      exportSvg(svg, filename);
      onExportComplete?.();
    } catch (err: any) {
      onExportError?.(err?.message || 'SVG Export fehlgeschlagen');
    }
  };

  const isExporting = exportingPng || exportingPdf;

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-app-fg">Export</div>
      
      <div className="grid grid-cols-1 gap-2">
        <Button
          type="button"
          onClick={handleExportPng}
          variant="primary"
          disabled={disabled || isExporting}
          className="w-full"
        >
          <ImageIcon className="h-4 w-4" />
          {exportingPng ? 'Exportiere...' : 'PNG (Druck)'}
        </Button>

        <Button
          type="button"
          onClick={handleExportPdf}
          className="w-full bg-app-fg text-app-bg hover:opacity-90"
          disabled={disabled || isExporting}
        >
          <FileText className="h-4 w-4" />
          {exportingPdf ? 'Exportiere...' : 'PDF (Druck)'}
        </Button>

        <Button
          type="button"
          onClick={handleExportSvg}
          variant="secondary"
          disabled={disabled || isExporting}
          className="w-full"
        >
          <Download className="h-4 w-4" />
          SVG (Vektor)
        </Button>
      </div>

      <p className="text-xs text-app-muted">
        Exportiere dein QR-Design in verschiedenen Formaten
      </p>
    </div>
  );
}
