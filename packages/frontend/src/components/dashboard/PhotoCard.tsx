'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Eye, Download, Trash2, MoreVertical, Heart, MessageCircle } from 'lucide-react';
import { Photo } from '@gaestefotos/shared';
import { buildApiUrl } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * PhotoCard - v0-Style Dashboard Photo Card
 * 
 * Modern card for photo moderation with quick actions
 */

export interface PhotoCardProps {
  photo: Photo & { uploaderName?: string };
  isSelected?: boolean;
  onSelect?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export default function PhotoCard({
  photo,
  isSelected = false,
  onSelect,
  onApprove,
  onReject,
  onDelete,
  onView,
}: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const statusConfig = {
    approved: {
      icon: Check,
      color: 'bg-green-500/10 text-green-600 border-green-500/20',
      label: 'Freigegeben',
    },
    rejected: {
      icon: X,
      color: 'bg-red-500/10 text-red-600 border-red-500/20',
      label: 'Abgelehnt',
    },
    pending: {
      icon: Eye,
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      label: 'Ausstehend',
    },
  };

  const status = (photo as any).status || 'pending';
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative bg-app-card border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${
        isSelected ? 'border-app-accent' : 'border-app-border'
      }`}
    >
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2 z-10">
          <motion.button
            onClick={onSelect}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-app-accent border-app-accent text-white'
                : 'bg-white/90 border-app-border hover:border-app-accent'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </motion.button>
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-2 right-2 z-10">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{config.label}</span>
        </div>
      </div>

      {/* Image */}
      <div className="relative aspect-square bg-app-bg">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={buildApiUrl(photo.url)}
          alt={`Foto ${photo.id}`}
          className={`w-full h-full object-cover cursor-pointer transition-opacity ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onClick={onView}
        />

        {/* Hover Overlay with Stats */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 hover:opacity-100 transition-opacity flex items-end p-3">
          <div className="flex items-center gap-3 text-white text-sm">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{(photo as any).likeCount || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{(photo as any).commentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Info & Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-app-muted truncate">
            {photo.uploaderName || 'Unbekannt'}
          </p>
          <p className="text-xs text-app-muted">
            {new Date(photo.createdAt).toLocaleDateString('de-DE')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Quick Actions */}
          {status === 'pending' && (
            <>
              {onApprove && (
                <motion.button
                  onClick={onApprove}
                  className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Freigeben"
                >
                  <Check className="w-4 h-4" />
                </motion.button>
              )}
              {onReject && (
                <motion.button
                  onClick={onReject}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Ablehnen"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </>
          )}

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="p-1.5 rounded-lg hover:bg-app-bg transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <MoreVertical className="w-4 h-4 text-app-muted" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={onView} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" />
                  <span>Ansehen</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="cursor-pointer">
                <Download className="w-4 h-4 mr-2" />
                <span>Herunterladen</span>
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Löschen</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
