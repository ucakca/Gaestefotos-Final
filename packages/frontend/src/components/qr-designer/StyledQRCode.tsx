'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling, { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';

export type QRDotStyle = 'square' | 'rounded' | 'dots' | 'classy' | 'classy-rounded';
export type QRCornerStyle = 'square' | 'extra-rounded' | 'dot';

interface StyledQRCodeProps {
  data: string;
  size?: number;
  dotStyle?: QRDotStyle;
  cornerStyle?: QRCornerStyle;
  color?: string;
  backgroundColor?: string;
  logoUrl?: string | null;
  className?: string;
}

const DOT_TYPE_MAP: Record<QRDotStyle, DotType> = {
  'square': 'square',
  'rounded': 'rounded',
  'dots': 'dots',
  'classy': 'classy',
  'classy-rounded': 'classy-rounded',
};

const CORNER_SQUARE_MAP: Record<QRCornerStyle, CornerSquareType> = {
  'square': 'square',
  'extra-rounded': 'extra-rounded',
  'dot': 'dot',
};

const CORNER_DOT_MAP: Record<QRCornerStyle, CornerDotType> = {
  'square': 'square',
  'extra-rounded': 'square',
  'dot': 'dot',
};

export default function StyledQRCode({
  data,
  size = 200,
  dotStyle = 'square',
  cornerStyle = 'square',
  color = '#000000',
  backgroundColor = '#ffffff',
  logoUrl = null,
  className = '',
}: StyledQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Initialize on client only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create QR code instance
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    // Clear previous
    if (containerRef.current.firstChild) {
      containerRef.current.innerHTML = '';
    }

    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      data: data || 'https://gaestefotos.com',
      dotsOptions: {
        type: DOT_TYPE_MAP[dotStyle],
        color: color,
      },
      cornersSquareOptions: {
        type: CORNER_SQUARE_MAP[cornerStyle],
        color: color,
      },
      cornersDotOptions: {
        type: CORNER_DOT_MAP[cornerStyle],
        color: color,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 5,
        imageSize: 0.35,
      },
      image: logoUrl || undefined,
      qrOptions: {
        errorCorrectionLevel: 'H',
      },
    });

    qrCodeRef.current = qrCode;
    qrCode.append(containerRef.current);

    return () => {
      qrCodeRef.current = null;
    };
  }, [isClient, data, size, dotStyle, cornerStyle, color, backgroundColor, logoUrl]);

  // Update on prop changes
  useEffect(() => {
    if (!qrCodeRef.current) return;

    qrCodeRef.current.update({
      data: data || 'https://gaestefotos.com',
      dotsOptions: {
        type: DOT_TYPE_MAP[dotStyle],
        color: color,
      },
      cornersSquareOptions: {
        type: CORNER_SQUARE_MAP[cornerStyle],
        color: color,
      },
      cornersDotOptions: {
        type: CORNER_DOT_MAP[cornerStyle],
        color: color,
      },
      backgroundOptions: {
        color: backgroundColor,
      },
      image: logoUrl || undefined,
    });
  }, [data, dotStyle, cornerStyle, color, backgroundColor, logoUrl]);

  if (!isClient) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ width: size, height: size }}
    />
  );
}

// Export function to generate QR as data URL (for export)
export async function generateQRDataUrl(
  data: string,
  options: {
    size?: number;
    dotStyle?: QRDotStyle;
    cornerStyle?: QRCornerStyle;
    color?: string;
    backgroundColor?: string;
    logoUrl?: string | null;
  } = {}
): Promise<string> {
  const {
    size = 512,
    dotStyle = 'square',
    cornerStyle = 'square',
    color = '#000000',
    backgroundColor = '#ffffff',
    logoUrl = null,
  } = options;

  const qrCode = new QRCodeStyling({
    width: size,
    height: size,
    data: data,
    dotsOptions: {
      type: DOT_TYPE_MAP[dotStyle],
      color: color,
    },
    cornersSquareOptions: {
      type: CORNER_SQUARE_MAP[cornerStyle],
      color: color,
    },
    cornersDotOptions: {
      type: CORNER_DOT_MAP[cornerStyle],
      color: color,
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 5,
      imageSize: 0.35,
    },
    image: logoUrl || undefined,
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
  });

  const rawData = await qrCode.getRawData('png');
  if (!rawData) throw new Error('Failed to generate QR code');
  
  // Handle both Blob and Buffer types  
  const blob = rawData instanceof Blob ? rawData : new Blob([rawData as unknown as BlobPart]);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Export function to generate QR as SVG string
export async function generateQRSvgString(
  data: string,
  options: {
    size?: number;
    dotStyle?: QRDotStyle;
    cornerStyle?: QRCornerStyle;
    color?: string;
    backgroundColor?: string;
    logoUrl?: string | null;
  } = {}
): Promise<string> {
  const {
    size = 512,
    dotStyle = 'square',
    cornerStyle = 'square',
    color = '#000000',
    backgroundColor = 'transparent',
    logoUrl = null,
  } = options;

  const qrCode = new QRCodeStyling({
    width: size,
    height: size,
    data: data,
    type: 'svg',
    dotsOptions: {
      type: DOT_TYPE_MAP[dotStyle],
      color: color,
    },
    cornersSquareOptions: {
      type: CORNER_SQUARE_MAP[cornerStyle],
      color: color,
    },
    cornersDotOptions: {
      type: CORNER_DOT_MAP[cornerStyle],
      color: color,
    },
    backgroundOptions: {
      color: backgroundColor,
    },
    imageOptions: {
      crossOrigin: 'anonymous',
      margin: 5,
      imageSize: 0.35,
    },
    image: logoUrl || undefined,
    qrOptions: {
      errorCorrectionLevel: 'H',
    },
  });

  const rawData = await qrCode.getRawData('svg');
  if (!rawData) throw new Error('Failed to generate QR code');
  
  // Handle both Blob and Buffer types
  if (rawData instanceof Blob) {
    return rawData.text();
  }
  return rawData.toString('utf-8');
}
