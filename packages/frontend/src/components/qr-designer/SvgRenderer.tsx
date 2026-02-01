'use client';

import React, { useMemo } from 'react';

interface SvgRendererProps {
  svg: string;
  className?: string;
}

/**
 * Client-only SVG renderer that converts SVG to a base64 data URL.
 * This completely isolates the SVG from React's DOM reconciliation,
 * preventing hydration errors and removeChild issues.
 * 
 * The SVG is rendered as an <img> tag, which React can safely manage.
 */
export default function SvgRenderer({ svg, className = '' }: SvgRendererProps) {
  const dataUrl = useMemo(() => {
    if (!svg || typeof window === 'undefined') return '';
    
    try {
      // Encode the SVG as a base64 data URL
      const encoded = btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${encoded}`;
    } catch (err) {
      console.error('[SvgRenderer] Failed to encode SVG:', err);
      return '';
    }
  }, [svg]);

  if (!dataUrl) {
    return <div className={className} style={{ width: '100%', height: '100%' }} />;
  }

  return (
    <img
      src={dataUrl}
      alt=""
      className={className}
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'contain',
        display: 'block'
      }}
    />
  );
}
