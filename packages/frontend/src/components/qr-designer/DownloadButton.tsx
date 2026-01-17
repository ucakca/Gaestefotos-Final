'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { QRDesignConfig } from '@gaestefotos/shared';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';

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

      // Generate real QR code SVG
      const publicUrl = `${window.location.origin}/e/${eventSlug}`;
      const qrMarkup = await renderQrToSvgMarkup(publicUrl);
      
      // Load template SVG and embed QR code
      const templateSvg = await loadTemplateSvg(config);
      const svg = embedQrIntoTemplateSvg(templateSvg, qrMarkup);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${eventId}/qr/export.${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          format: config.sizePreset === 'a4' ? 'A5' : 'A6',
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
    } catch (err: any) {
      alert(`Download fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    } finally {
      setDownloading(false);
    }
  };

  const renderQrToSvgMarkup = async (value: string): Promise<string> => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '-10000px';
    container.style.width = '0';
    container.style.height = '0';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<QRCodeSVG value={value} level="H" includeMargin={true} size={512} />);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const svg = container.querySelector('svg');
    const markup = svg ? new XMLSerializer().serializeToString(svg) : '';

    root.unmount();
    container.remove();

    if (!markup) throw new Error('QR konnte nicht gerendert werden');
    return markup;
  };

  const loadTemplateSvg = async (config: QRDesignConfig): Promise<string> => {
    const width = config.sizePreset === 'a4' ? 595 : 420;
    const height = config.sizePreset === 'a4' ? 842 : 595;
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${config.colors.background}"/>
      <text x="${width/2}" y="50" text-anchor="middle" fill="${config.colors.foreground}" font-size="24" font-weight="bold">${config.headerText || ''}</text>
      <rect id="gf:qr" x="${width/2 - 150}" y="${height/2 - 150}" width="300" height="300" fill="white" stroke="${config.colors.foreground}" stroke-width="2"/>
      <text x="${width/2}" y="${height - 30}" text-anchor="middle" fill="${config.colors.foreground}" font-size="16">${config.footerText || ''}</text>
    </svg>`;
  };

  const embedQrIntoTemplateSvg = (svgMarkup: string, qrMarkup: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');

    const qrPlaceholder = doc.getElementById('gf:qr');
    if (!qrPlaceholder) return svgMarkup;

    const getAttrNumber = (el: Element | null, name: string): number | null => {
      if (!el) return null;
      const raw = el.getAttribute(name);
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };

    const x = getAttrNumber(qrPlaceholder, 'x') ?? 0;
    const y = getAttrNumber(qrPlaceholder, 'y') ?? 0;
    const w = getAttrNumber(qrPlaceholder, 'width') ?? 0;
    const h = getAttrNumber(qrPlaceholder, 'height') ?? 0;
    if (w <= 0 || h <= 0) return svgMarkup;

    if (qrPlaceholder.tagName.toLowerCase() === 'rect') {
      (qrPlaceholder as any).setAttribute('fill', 'transparent');
    }

    const qrDoc = parser.parseFromString(qrMarkup, 'image/svg+xml');
    const qrSvg = qrDoc.documentElement as unknown as SVGSVGElement;

    const embedded = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    embedded.setAttribute('id', 'gf:qr:embedded');
    embedded.setAttribute('x', String(x));
    embedded.setAttribute('y', String(y));
    embedded.setAttribute('width', String(w));
    embedded.setAttribute('height', String(h));
    embedded.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const vb = qrSvg.getAttribute('viewBox');
    if (vb) {
      embedded.setAttribute('viewBox', vb);
    }

    const qrChildren = Array.from(qrSvg.childNodes);
    for (const node of qrChildren) {
      embedded.appendChild(doc.importNode(node, true));
    }

    const parent = qrPlaceholder.parentNode;
    if (parent) {
      parent.insertBefore(embedded, qrPlaceholder.nextSibling);
    }

    return new XMLSerializer().serializeToString(doc.documentElement as unknown as SVGSVGElement);
  };

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => handleDownload('png')}
        disabled={downloading}
        variant="secondary"
        className="flex-1"
      >
        <Download size={16} className="mr-2" />
        PNG
      </Button>
      <Button
        onClick={() => handleDownload('pdf')}
        disabled={downloading}
        variant="secondary"
        className="flex-1"
      >
        <Download size={16} className="mr-2" />
        PDF
      </Button>
    </div>
  );
}
