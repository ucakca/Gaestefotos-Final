'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface StarRatingProps {
  rating: number;
  userRating?: number | null;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showAverage?: boolean;
  voteCount?: number;
  className?: string;
}

export default function StarRating({
  rating,
  userRating,
  onRate,
  readonly = false,
  size = 'md',
  showAverage = true,
  voteCount = 0,
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating ?? userRating ?? 0;

  const handleClick = (star: number) => {
    if (!readonly && onRate) {
      onRate(star);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className="flex items-center gap-0.5"
        onMouseLeave={() => !readonly && setHoverRating(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayRating;
          const isPartiallyFilled = !isFilled && star <= Math.ceil(rating) && star > Math.floor(rating);
          
          return (
            <motion.button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverRating(star)}
              className={`relative ${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform`}
              whileHover={readonly ? {} : { scale: 1.2 }}
              whileTap={readonly ? {} : { scale: 0.9 }}
            >
              <Star
                className={`${sizeClasses[size]} transition-colors ${
                  isFilled
                    ? 'fill-yellow-400 text-warning'
                    : isPartiallyFilled
                    ? 'fill-yellow-400/50 text-warning'
                    : 'text-white/30'
                }`}
              />
            </motion.button>
          );
        })}
      </div>
      
      {showAverage && (
        <div className="flex items-center gap-1.5 text-white/70 text-sm">
          <span className="font-medium text-white">{rating.toFixed(1)}</span>
          {voteCount > 0 && (
            <span className="text-white/50">
              ({voteCount} {voteCount === 1 ? 'Bewertung' : 'Bewertungen'})
            </span>
          )}
        </div>
      )}
      
      {userRating && userRating > 0 && (
        <span className="text-xs text-warning/80 ml-1">
          Deine Bewertung
        </span>
      )}
    </div>
  );
}
