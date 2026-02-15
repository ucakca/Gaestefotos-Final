'use client';

import { useEffect, useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface LocationMapProps {
  location: string;
  onLocationChange?: (location: string, coords?: { lat: number; lng: number }) => void;
}

export default function LocationMap({ location, onLocationChange }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadLeaflet = async () => {
      // Import Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Import Leaflet JS
      const L = (await import('leaflet')).default;
      
      // Fix default icon issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (mapRef.current && !mapInstanceRef.current) {
        // Default to Germany center
        const defaultCenter: [number, number] = [51.1657, 10.4515];
        
        const map = L.map(mapRef.current).setView(defaultCenter, 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Create draggable marker
        const marker = L.marker(defaultCenter, { draggable: true }).addTo(map);
        
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data.display_name && onLocationChange) {
              onLocationChange(data.display_name, { lat: pos.lat, lng: pos.lng });
            }
          } catch (e) {
            // Silently fail on geocode error
          }
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        setIsLoaded(true);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Geocode location string to coordinates
  useEffect(() => {
    if (!location || !isLoaded || !mapInstanceRef.current || !markerRef.current) return;

    const geocodeLocation = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`
        );
        const data = await response.json();
        
        if (data && data[0]) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          
          mapInstanceRef.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
          setCoords({ lat, lng });
        }
      } catch (e) {
        // Silently fail on geocode error
      }
    };

    // Debounce geocoding
    const timeout = setTimeout(geocodeLocation, 500);
    return () => clearTimeout(timeout);
  }, [location, isLoaded]);

  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        className="w-full h-48 rounded-xl border-2 border-border overflow-hidden"
        style={{ zIndex: 0 }}
      />
      {coords && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}
      <p className="text-xs text-muted-foreground/70">
        Verschiebe den Marker für die genaue Position
      </p>
    </div>
  );
}
