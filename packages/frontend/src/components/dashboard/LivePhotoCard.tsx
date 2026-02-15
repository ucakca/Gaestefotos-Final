'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Trophy, Sparkles, User } from 'lucide-react';

/**
 * LivePhotoCard - v0-Style Card for Live Wall
 * 
 * Displays photos with overlay badges for special types.
 * Features:
 * - Responsive image with aspect ratio
 * - Type badges (Guestbook, Challenge, Story)
 * - Smooth animations on mount
 * - Hover effects
 * - Click handler
 */

export interface LivePhotoCardProps {
  id: string;
  url: string;
  type?: 'guestbook' | 'challenge' | 'story' | 'photo';
  metadata?: {
    authorName?: string;
    message?: string;
    challengeTitle?: string;
    emoji?: string;
  };
  onClick?: () => void;
}

const typeBadges = {
  guestbook: {
    icon: MessageCircle,
    label: 'Gästebuch',
    color: 'bg-blue-500/90 text-white',
  },
  challenge: {
    icon: Trophy,
    label: 'Challenge',
    color: 'bg-warning/90 text-white',
  },
  story: {
    icon: Sparkles,
    label: 'Story',
    color: 'bg-purple-500/90 text-white',
  },
  photo: {
    icon: User,
    label: 'Foto',
    color: 'bg-success/100/90 text-white',
  },
};

export default function LivePhotoCard({
  id,
  url,
  type = 'photo',
  metadata,
  onClick,
}: LivePhotoCardProps) {
  const badge = typeBadges[type];
  const Icon = badge.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="relative group cursor-pointer overflow-hidden rounded-xl bg-card border border-border shadow-md hover:shadow-xl transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={url}
          alt="Photo"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Gradient Overlay on Hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Type Badge */}
      <div className={`absolute top-3 left-3 ${badge.color} px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium`}>
        <Icon className="w-4 h-4" />
        <span>{badge.label}</span>
      </div>

      {/* Metadata Overlay */}
      {metadata && (metadata.authorName || metadata.challengeTitle || metadata.message) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {metadata.authorName && (
            <p className="text-sm font-semibold truncate">{metadata.authorName}</p>
          )}
          {metadata.challengeTitle && (
            <p className="text-sm font-medium truncate">
              {metadata.emoji} {metadata.challengeTitle}
            </p>
          )}
          {metadata.message && (
            <p className="text-xs mt-1 line-clamp-2 opacity-90">{metadata.message}</p>
          )}
        </div>
      )}

      {/* New Badge Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="absolute top-3 right-3 bg-destructive/100 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
      >
        NEU
      </motion.div>
    </motion.div>
  );
}
