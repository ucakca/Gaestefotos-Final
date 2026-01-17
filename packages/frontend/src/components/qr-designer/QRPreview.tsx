'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QRDesignConfig, QR_TEMPLATES } from '@gaestefotos/shared';
import { SafeZoneOverlay } from './SafeZoneOverlay';

interface QRPreviewProps {
  config: QRDesignConfig;
  galleryUrl: string;
  showSafeZone?: boolean;
}

export function QRPreview({ config, galleryUrl, showSafeZone }: QRPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const template = QR_TEMPLATES[config.template];

  const getFrameClass = () => {
    switch (config.frameStyle) {
      case 'rounded':
        return 'rounded-2xl';
      case 'ornate':
        return 'border-8 rounded-lg';
      case 'floral':
        return 'rounded-lg border-4 border-double';
      case 'geometric':
        return 'border-4';
      default:
        return '';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center">
      <div
        ref={previewRef}
        className={`relative bg-white p-8 flex flex-col items-center gap-4 ${getFrameClass()}`}
        style={{
          backgroundColor: config.colors.background,
          borderColor: config.colors.frame || config.colors.foreground,
        }}
      >
        {/* Header Text */}
        {config.headerText && (
          <p
            className={`text-lg ${template.headerFont}`}
            style={{ color: config.colors.foreground }}
          >
            {config.headerText}
          </p>
        )}

        {/* QR Code */}
        <QRCodeSVG
          value={galleryUrl}
          size={200}
          fgColor={config.colors.foreground}
          bgColor={config.colors.background}
          level="H"
          imageSettings={
            config.centerLogoUrl
              ? {
                  src: config.centerLogoUrl,
                  height: 40,
                  width: 40,
                  excavate: true,
                }
              : undefined
          }
        />

        {/* Footer Text */}
        {config.footerText && (
          <p className="text-sm" style={{ color: config.colors.foreground }}>
            {config.footerText}
          </p>
        )}
        
        {/* Safe Zone Overlay */}
        <SafeZoneOverlay enabled={showSafeZone} safeZoneMm={5} />
      </div>
    </div>
  );
}
