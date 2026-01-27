'use client';

/**
 * Guest Group Badge
 * 
 * Farbiges Badge für Gästegruppen
 */

interface GuestGroupBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function GuestGroupBadge({ name, color, size = 'md', onClick }: GuestGroupBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      }`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span>{name}</span>
    </span>
  );
}
