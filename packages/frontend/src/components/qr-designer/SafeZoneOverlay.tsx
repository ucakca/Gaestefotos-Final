'use client';

interface SafeZoneOverlayProps {
  enabled: boolean;
  safeZoneMm?: number; // default 5mm
}

export function SafeZoneOverlay({ enabled, safeZoneMm = 5 }: SafeZoneOverlayProps) {
  if (!enabled) return null;

  // Convert mm to percentage (approximate for visual guide)
  const safeZonePercent = (safeZoneMm / 210) * 100; // Based on A4 width

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Safe Zone Border */}
      <div 
        className="absolute border-2 border-dashed border-yellow-500 opacity-70"
        style={{
          top: `${safeZonePercent}%`,
          left: `${safeZonePercent}%`,
          right: `${safeZonePercent}%`,
          bottom: `${safeZonePercent}%`,
        }}
      />
      
      {/* Corner Labels */}
      <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-mono">
        Safe Zone: {safeZoneMm}mm
      </div>
      
      <div className="absolute bottom-2 right-2 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-mono">
        ⚠️ Nicht schneiden
      </div>
    </div>
  );
}
