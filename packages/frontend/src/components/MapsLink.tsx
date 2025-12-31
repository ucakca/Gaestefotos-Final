'use client';

import { ExternalLink } from 'lucide-react';

interface MapsLinkProps {
  address: string;
  className?: string;
}

/**
 * Generates a universal maps link that works with:
 * - Google Maps App (Android - öffnet automatisch die App wenn installiert)
 * - Google Maps Web (Android - falls App nicht installiert)
 * - Apple Maps App (iOS, macOS)
 * - Google Maps Web (Desktop, Fallback)
 */
export default function MapsLink({ address, className = '' }: MapsLinkProps) {
  if (!address || address.trim() === '') {
    return null;
  }

  // Universal Google Maps URL
  // - Auf Android: Öffnet automatisch die Google Maps App (falls installiert), sonst Web-Version
  // - Auf iOS: Wird zu Apple Maps umgeleitet
  // - Auf Desktop: Öffnet Google Maps Web
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  
  // Google Maps App Deep Link für Android (wird automatisch verwendet wenn App installiert)
  // Das geo: Schema funktioniert nativ auf Android
  const googleMapsAppUrl = `geo:0,0?q=${encodeURIComponent(address)}`;
  
  // Apple Maps URL für iOS/macOS
  const appleMapsUrl = `http://maps.apple.com/?q=${encodeURIComponent(address)}`;

  // Detect device type
  const isAppleDevice = 
    typeof window !== 'undefined' && 
    (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) || 
     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isAndroidDevice = 
    typeof window !== 'undefined' &&
    /Android/.test(navigator.userAgent);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (isAppleDevice) {
      // Apple-Geräte: Apple Maps verwenden
      // Falls nicht installiert, leitet zu Google Maps Web weiter
      window.location.href = appleMapsUrl;
    } else if (isAndroidDevice) {
      // Android: Google Maps URL öffnen
      // Android öffnet automatisch die Google Maps App wenn installiert
      // Falls nicht installiert, öffnet es die Web-Version im Browser
      // Das funktioniert automatisch - kein extra Deep Link nötig!
      window.open(googleMapsUrl, '_blank');
    } else {
      // Desktop/andere Geräte: Google Maps Web
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Standard-URL für Fallback (href-Attribut)
  // Google Maps URL funktioniert auf allen Plattformen als Fallback
  const hrefUrl = isAppleDevice ? appleMapsUrl : googleMapsUrl;

  return (
    <a
      href={hrefUrl}
      onClick={handleClick}
      target={isAppleDevice ? undefined : '_blank'}
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-tokens-brandGreen hover:opacity-90 underline ${className}`}
    >
      <ExternalLink className="w-4 h-4" />
      <span>In Karten öffnen</span>
    </a>
  );
}

